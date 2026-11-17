-- 1) 핀 협찬·광고 표시: 핀을 만든 사람이 체크해요 (리뷰의 ad와 같은 뜻).
alter table public.pins add column ad boolean not null default false;
grant insert (ad), update (ad) on public.pins to authenticated;

-- 2) 카테고리 목록: 누구나 읽고, 운영자만 추가·이름 변경·아이콘 변경·삭제.
--    지도 핀 안에 icon(이모지)이 보여요. 핀이 쓰는 카테고리는 지울 수 없고(외래키), 이름을 바꾸면 핀도 따라 바뀌어요.
create table public.categories (
  name text primary key check (char_length(btrim(name)) between 1 and 10),
  icon text not null default '📍' check (char_length(icon) between 1 and 8),
  sort int not null default 0
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
alter table public.categories enable row level security;
create policy "categories: 누구나 읽기" on public.categories for select using (true);
create policy "categories: 운영자만 추가" on public.categories for insert with check (public.is_admin());
create policy "categories: 운영자만 수정" on public.categories for update using (public.is_admin()) with check (public.is_admin());
create policy "categories: 운영자만 삭제" on public.categories for delete using (public.is_admin());

insert into public.categories (name, icon, sort) values ('카페', '☕', 1), ('맛집', '🍴', 2), ('전시', '🖼️', 3), ('산책', '🌳', 4), ('기타', '📍', 5);

alter table public.pins drop constraint pins_cat_check;
alter table public.pins add constraint pins_cat_fkey foreign key (cat) references public.categories (name) on update cascade;
