-- 베타: 회원(Supabase Auth) · 프로필 · 핀 · 리뷰 · 신고 · 찜 리스트 · 사진(Storage).
-- 규칙은 CLAUDE.md "Product rules". 화면에서 막는 것과 별개로 여기(RLS·제약·트리거)서 서버가 막아요.

-- 운영자 = app_metadata.role 'admin' (사용자가 바꿀 수 없는 값)
create function public.is_admin() returns boolean language sql stable
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' $$;

-- 사진은 우리 Storage 'photos' 버킷 주소만 (다른 서버 주소로 보는 사람을 추적하지 못하게)
create function public.own_photos(p text[]) returns boolean language sql immutable
as $$ select coalesce(bool_and(x like 'https://magxnjsntzhypnsluueb.supabase.co/storage/v1/object/public/photos/%'), true) from unnest(p) x $$;

-- ---------- 프로필: 닉네임만 공개. 이메일은 auth.users에만 ----------
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  nick       text not null check (nick ~ '^[가-힣a-zA-Z0-9_]{2,12}$'),
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant update (nick) on public.profiles to authenticated;
alter table public.profiles enable row level security;
create policy "profiles: 누구나 읽기" on public.profiles for select using (true);
create policy "profiles: 내 닉네임만 수정" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- 가입하면 프로필을 만들어요 (닉네임은 signUp의 options.data.nick)
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  insert into public.profiles (id, nick, created_at)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nick', 'user_' || left(new.id::text, 6)), new.created_at);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- 장소: 브이월드 검색 결과도 같은 테이블에 쌓아요 (분류가 다양해져서 제한을 풀어요) ----------
alter table public.places drop constraint if exists places_category_check;

-- ---------- 핀: 장소에 연결(place_id)하거나 위치만. 한 장소에 핀 하나 ----------
create table public.pins (
  id          uuid primary key default gen_random_uuid(),
  author      uuid default auth.uid() references auth.users on delete set null,
  name        text not null check (char_length(btrim(name)) between 1 and 30),
  cat         text not null check (cat in ('카페', '맛집', '전시', '산책', '기타')),
  place_id    bigint unique references public.places,
  lat         double precision not null check (lat between 33 and 39),
  lng         double precision not null check (lng between 124 and 132),
  description text not null default '' check (char_length(description) <= 500),
  photos      text[] not null default '{}' check (cardinality(photos) <= 3 and public.own_photos(photos)),
  created_at  timestamptz not null default now()
);
grant select on public.pins to anon, authenticated;
grant insert (name, cat, place_id, lat, lng, description, photos), update (description) on public.pins to authenticated;
alter table public.pins enable row level security;
create policy "pins: 누구나 읽기" on public.pins for select using (true);
create policy "pins: 내 이름으로 만들기" on public.pins for insert with check (author = auth.uid());
create policy "pins: 만든 사람만 설명 수정" on public.pins for update using (author = auth.uid()) with check (author = auth.uid());

-- ---------- 리뷰: 1계정 1핀 1리뷰. 숨김·광고 라벨은 운영자만 ----------
create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  pin_id         uuid not null references public.pins on delete cascade,
  author         uuid default auth.uid() references auth.users on delete set null,
  body           text not null check (char_length(btrim(body)) between 1 and 1000),
  ad             boolean not null default false,              -- 작성자가 체크한 협찬·광고
  photos         text[] not null default '{}' check (cardinality(photos) <= 3 and public.own_photos(photos)),
  hidden         boolean not null default false,
  admin_label    boolean not null default false,              -- 운영자가 붙인 협찬·광고
  admin_decision text check (admin_decision in ('label', 'hide', 'ok')),
  report_count   int not null default 0,
  created_at     timestamptz not null default now(),
  unique (pin_id, author)
);
grant select on public.reviews to anon, authenticated;
grant insert (pin_id, body, ad, photos), update (hidden, admin_label, admin_decision), delete on public.reviews to authenticated;
alter table public.reviews enable row level security;
create policy "reviews: 숨김 아닌 것·내 것·운영자" on public.reviews for select using (not hidden or author = auth.uid() or public.is_admin());
create policy "reviews: 내 이름으로 쓰기" on public.reviews for insert with check (author = auth.uid());
create policy "reviews: 운영자만 처리" on public.reviews for update using (public.is_admin()) with check (public.is_admin());
create policy "reviews: 내 리뷰 삭제" on public.reviews for delete using (author = auth.uid());

-- 가입 7일 이내 계정은 하루(한국 시간) 3개까지
create function public.review_limit() returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  if (select created_at from auth.users where id = new.author) > now() - interval '7 days'
     and (select count(*) from public.reviews where author = new.author
          and created_at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')) >= 3 then
    raise exception 'daily_review_limit';
  end if;
  return new;
end $$;
create trigger reviews_limit before insert on public.reviews for each row execute function public.review_limit();

-- ---------- 신고: 서로 다른 계정 3건이면 자동 숨김 (운영자가 이미 판단했으면 그대로) ----------
create table public.reports (
  review_id  uuid not null references public.reviews on delete cascade,
  reporter   uuid not null default auth.uid() references auth.users on delete cascade,
  reason     text not null check (reason in ('광고인데 표시가 없어요', '허위 정보예요', '욕설·비방이 있어요', '기타')),
  created_at timestamptz not null default now(),
  primary key (review_id, reporter)
);
grant select, insert (review_id, reason) on public.reports to authenticated;
alter table public.reports enable row level security;
create policy "reports: 내 신고·운영자" on public.reports for select using (reporter = auth.uid() or public.is_admin());
create policy "reports: 내 이름으로 신고" on public.reports for insert with check (reporter = auth.uid());

create function public.count_reports() returns trigger language plpgsql security definer set search_path = ''
as $$
declare n int := (select count(*) from public.reports where review_id = new.review_id);
begin
  update public.reviews set report_count = n, hidden = hidden or (admin_decision is null and n >= 3) where id = new.review_id;
  return null;
end $$;
create trigger reports_count after insert on public.reports for each row execute function public.count_reports();

-- ---------- 찜 리스트: 기본 비공개. 공유 링크는 무작위 share_token ----------
create table public.lists (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 20),
  is_public   boolean not null default false,
  share_token uuid not null unique default gen_random_uuid(),
  pin_ids     uuid[] not null default '{}',
  updated_at  timestamptz not null default now()
);
grant select on public.lists to anon, authenticated;
grant insert (name, is_public, pin_ids), update (name, is_public, pin_ids, updated_at), delete on public.lists to authenticated;
alter table public.lists enable row level security;
create policy "lists: 공개·내 것" on public.lists for select using (is_public or owner = auth.uid());
create policy "lists: 내 이름으로 만들기" on public.lists for insert with check (owner = auth.uid());
create policy "lists: 내 것만 수정" on public.lists for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy "lists: 내 것만 삭제" on public.lists for delete using (owner = auth.uid());

-- 찜 수 = 그 핀을 담은 리스트 수 (비공개 리스트도 세지만 어떤 리스트인지는 안 보여요)
create function public.like_counts() returns table (pin_id uuid, n bigint) language sql stable security definer set search_path = ''
as $$ select x, count(*) from public.lists, unnest(pin_ids) x group by x $$;

-- ---------- AI 광고성 판정: 운영자만 읽어요 (Edge Function이 service_role로 씀) ----------
create table public.review_ai_checks (
  review_id  uuid primary key references public.reviews on delete cascade,
  status     text not null check (status in ('done', 'failed')),
  confidence real check (confidence between 0 and 1),
  reason     text,
  created_at timestamptz not null default now()
);
grant select on public.review_ai_checks to authenticated;
alter table public.review_ai_checks enable row level security;
create policy "ai: 운영자만 읽기" on public.review_ai_checks for select using (public.is_admin());

-- ---------- 회원 탈퇴: 계정·프로필·리스트·신고 삭제. 핀·리뷰는 작성자 없이 남아요 ----------
create function public.delete_me() returns void language sql security definer set search_path = ''
as $$ delete from auth.users where id = auth.uid() $$;
revoke execute on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;

-- ---------- 사진: 공개 버킷, 5MB, JPG·PNG·WebP. 자기 폴더(<user id>/...)에만 올려요 ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "photos: 내 폴더에 올리기" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
