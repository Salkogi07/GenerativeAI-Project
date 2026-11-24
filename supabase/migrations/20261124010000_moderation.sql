-- 운영 처리: 신고 번호, 휴지통(7일), 처리 알림, 이의 제기, 키워드 1차 판정
-- 화면: 운영자 리뷰 검토(신고 번호 검색), 운영자 휴지통·이의 제기, 사용자 알림(마이페이지)

-- ---------- 1) 신고 번호: 리뷰 신고 R-<id>, 핀 신고 P-<id> (기존 신고에도 번호가 매겨져요) ----------
alter table public.reports add column id bigint generated always as identity unique;
alter table public.pin_reports add column id bigint generated always as identity unique;

-- ---------- 2) 휴지통: 지운 리뷰·핀을 7일 보관해요. 운영자만 보고 되살려요 ----------
-- 작성자가 지운 것도, 운영자가 지운 것도 모두 들어와요. 핀을 지우면 그 핀의 리뷰도 하나씩 들어와요.
-- 사진 파일은 지우지 않아요(지금도 리뷰를 지울 때 파일은 남아요).
create table public.trash (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('review', 'pin')),
  item_id    uuid not null,
  data       jsonb not null,                    -- 지운 행 그대로
  report_ids bigint[] not null default '{}',    -- 지울 때 있던 신고 번호
  deleted_by uuid,
  deleted_at timestamptz not null default now()
);
create index trash_deleted_at on public.trash (deleted_at);
grant select on public.trash to authenticated;
alter table public.trash enable row level security;
create policy "trash: 운영자만 읽기" on public.trash for select using (public.is_admin());

create function public.to_trash() returns trigger language plpgsql security definer set search_path = ''
as $$
declare ids bigint[];
begin
  if tg_table_name = 'reviews' then
    select coalesce(array_agg(id order by id), '{}') into ids from public.reports where review_id = old.id;
  else
    select coalesce(array_agg(id order by id), '{}') into ids from public.pin_reports where pin_id = old.id;
  end if;
  insert into public.trash (kind, item_id, data, report_ids, deleted_by)
  values (case tg_table_name when 'reviews' then 'review' else 'pin' end, old.id, to_jsonb(old), ids, auth.uid());
  return old;
end $$;
create trigger reviews_to_trash before delete on public.reviews for each row execute function public.to_trash();
create trigger pins_to_trash before delete on public.pins for each row execute function public.to_trash();

-- 매일 03:00(한국 시간) 7일 지난 휴지통을 비워요. 실행 기록도 7일만 남겨요.
create extension if not exists pg_cron;
select cron.schedule('pinit-trash-purge', '0 18 * * *', $$delete from public.trash where deleted_at < now() - interval '7 days'$$);
select cron.schedule('pinit-cron-log-purge', '30 18 * * *', $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);

-- 되살리기(운영자만). 리뷰는 핀이 남아 있어야 하고, 이의 제기를 받아들인 것이라 숨김을 풀어요.
-- 되살릴 때는 신규 계정 하루 3개 제한을 건너뛰어요(pinit.restoring).
create function public.restore_trash(tid bigint) returns text language plpgsql security definer set search_path = ''
as $$
declare t public.trash;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into t from public.trash where id = tid;
  if not found then raise exception 'not_found'; end if;
  perform set_config('pinit.restoring', 'on', true);
  if t.kind = 'pin' then
    insert into public.pins select * from jsonb_populate_record(null::public.pins, t.data);
  else
    if not exists (select 1 from public.pins where id = (t.data->>'pin_id')::uuid) then raise exception 'pin_gone'; end if;
    insert into public.reviews select * from jsonb_populate_record(null::public.reviews,
      t.data || jsonb_build_object('hidden', false, 'admin_decision', 'ok', 'report_count', 0));
  end if;
  delete from public.trash where id = tid;
  return t.kind;
end $$;
revoke execute on function public.restore_trash(bigint) from public, anon;
grant execute on function public.restore_trash(bigint) to authenticated;

create or replace function public.review_limit() returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  if current_setting('pinit.restoring', true) = 'on' then return new; end if;
  if (select created_at from auth.users where id = new.author) > now() - interval '7 days'
     and (select count(*) from public.reviews where author = new.author
          and created_at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')) >= 3 then
    raise exception 'daily_review_limit';
  end if;
  return new;
end $$;

-- ---------- 3) 처리 알림: 신고된 리뷰를 운영자가 숨기거나 지우면 작성자에게 ----------
-- 지운 뒤에도 무엇이 처리됐는지 알 수 있게 본문·사진·신고 번호·이유를 그대로 담아요.
create table public.notices (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users on delete cascade,
  kind       text not null check (kind in ('review_hidden', 'review_deleted')),
  review_id  uuid not null,
  pin_name   text,
  body       text not null,
  photos     text[] not null default '{}',
  report_ids bigint[] not null default '{}',
  reasons    text[] not null default '{}',
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
grant select, update (read_at) on public.notices to authenticated;
alter table public.notices enable row level security;
create policy "notices: 내 알림·운영자" on public.notices for select using (user_id = auth.uid() or public.is_admin());
create policy "notices: 내 알림 읽음 표시" on public.notices for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create function public.notify_moderation() returns trigger language plpgsql security definer set search_path = ''
as $$
declare r public.reviews := case when tg_op = 'DELETE' then old else new end;
  ids bigint[]; why text[];
begin
  -- 운영자가 남의 리뷰를 처리했을 때만 (작성자가 직접 지운 건 알림 없음)
  if r.author is not null and public.is_admin() and r.author is distinct from auth.uid()
     and (tg_op = 'DELETE' or (new.admin_decision = 'hide' and old.admin_decision is distinct from 'hide')) then
    select array_agg(id order by id), array_agg(reason order by id) into ids, why from public.reports where review_id = r.id;
    if ids is not null then
      insert into public.notices (user_id, kind, review_id, pin_name, body, photos, report_ids, reasons)
      values (r.author, case tg_op when 'DELETE' then 'review_deleted' else 'review_hidden' end, r.id,
        (select name from public.pins where id = r.pin_id), r.body, r.photos, ids, why);
    end if;
  end if;
  return case tg_op when 'DELETE' then old else null end;
end $$;
create trigger reviews_notify_delete before delete on public.reviews for each row execute function public.notify_moderation();
create trigger reviews_notify_hide after update of admin_decision on public.reviews for each row execute function public.notify_moderation();

-- ---------- 4) 이의 제기: 알림마다 한 번. 운영자가 받아들이거나 거절하고 답변을 남겨요 ----------
create table public.appeals (
  id          bigint generated always as identity primary key,
  notice_id   bigint not null unique references public.notices on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  status      text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
  reply       text check (char_length(reply) <= 500),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
grant select, insert (notice_id, body), update (status, reply, resolved_at) on public.appeals to authenticated;
alter table public.appeals enable row level security;
create policy "appeals: 내 것·운영자" on public.appeals for select using (user_id = auth.uid() or public.is_admin());
create policy "appeals: 내 알림에만" on public.appeals for insert with check (
  user_id = auth.uid() and exists (select 1 from public.notices n where n.id = notice_id and n.user_id = auth.uid()));
create policy "appeals: 운영자만 처리" on public.appeals for update using (public.is_admin()) with check (public.is_admin());

-- ---------- 5) 키워드 1차 판정: 광고 표현이 있으면 운영자 AI 의심 탭에 올려요 ----------
-- 사용자에게는 보이지 않아요(review_ai_checks는 운영자만 읽기). 작성자가 협찬 체크를 했으면 건너뛰어요.
alter table public.review_ai_checks add column source text not null default 'ai' check (source in ('ai', 'keyword'));

create function public.ad_keywords(body text) returns text[] language sql immutable set search_path = ''
as $$ select array_agg(k) from unnest(array['협찬', '광고', '제공받', '지원받', '원고료', '소정의', '체험단', '서포터즈',
  '대가를 받', '무상으로', '무료로 제공', '업체로부터', '쿠폰을 받', '쿠폰 받', '#ad', 'sponsored']) k
  where position(k in lower(body)) > 0 $$;

create function public.keyword_check() returns trigger language plpgsql security definer set search_path = ''
as $$
declare hits text[] := public.ad_keywords(new.body);
begin
  if not new.ad and hits is not null then
    insert into public.review_ai_checks (review_id, status, confidence, reason, source)
    values (new.id, 'done', least(0.6 + 0.1 * cardinality(hits), 0.95), '광고 표현: ' || array_to_string(hits, ', '), 'keyword')
    on conflict (review_id) do nothing;
  end if;
  return null;
end $$;
create trigger reviews_keyword after insert on public.reviews for each row execute function public.keyword_check();

-- 이미 있는 리뷰도 한 번 검사해요
insert into public.review_ai_checks (review_id, status, confidence, reason, source)
select id, 'done', least(0.6 + 0.1 * cardinality(public.ad_keywords(body)), 0.95),
       '광고 표현: ' || array_to_string(public.ad_keywords(body), ', '), 'keyword'
from public.reviews where not ad and public.ad_keywords(body) is not null
on conflict (review_id) do nothing;
