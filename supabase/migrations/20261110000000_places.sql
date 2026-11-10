-- 장소: 공공데이터(서울시 주요 공원, 구별 카페 현황)를 정리해 넣은 목록.
-- 누구나 읽을 수 있고, 쓰기는 SQL 편집기(또는 service_role)로만 해요.
create table public.places (
  id          bigint generated always as identity primary key,
  source      text not null,             -- 출처 데이터 이름 (seoul_parks, cafe_관악구, ...)
  source_key  text not null,             -- 출처 데이터 안에서 이 장소를 구분하는 값
  name        text not null,
  category    text not null check (category in ('카페', '공원')),
  address     text,
  lat         double precision not null check (lat between 33 and 39),
  lng         double precision not null check (lng between 124 and 132),
  unique (source, source_key)
);

create index places_lat_lng_idx on public.places (lat, lng);

-- 프로젝트에서 "새 테이블 자동 공개"를 꺼 뒀으니, Data API로 읽을 권한을 직접 줘요.
grant select on public.places to anon, authenticated;

alter table public.places enable row level security;

create policy "places: 누구나 읽기" on public.places
  for select using (true);
