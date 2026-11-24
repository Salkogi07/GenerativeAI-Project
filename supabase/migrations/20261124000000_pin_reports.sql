-- 핀 신고 + 운영자 삭제
-- 로그인한 사람은 핀(장소)을 신고할 수 있어요. 한 사람이 한 핀에 한 번만.
-- 핀은 숨김 칸이 없어서(D18) 자동 숨김은 없고, 운영자가 리뷰 검토 > 핀 신고 탭에서 보고 지워요.
-- 핀을 지우면 신고도 같이 지워져요(on delete cascade). 운영자의 핀 삭제는 20261117020000_pin_edit.sql에서 이미 허용했어요.
create table public.pin_reports (
  pin_id     uuid not null references public.pins on delete cascade,
  reporter   uuid not null default auth.uid() references auth.users on delete cascade,
  reason     text not null check (reason in ('광고인데 표시가 없어요', '허위 정보예요', '부적절한 내용이에요', '기타')),
  created_at timestamptz not null default now(),
  primary key (pin_id, reporter)
);
grant select, insert (pin_id, reason) on public.pin_reports to authenticated;
alter table public.pin_reports enable row level security;
create policy "pin_reports: 내 신고·운영자" on public.pin_reports for select using (reporter = auth.uid() or public.is_admin());
create policy "pin_reports: 내 이름으로 신고" on public.pin_reports for insert with check (reporter = auth.uid());

-- 운영자는 다른 사람 리뷰도 지울 수 있어요 (지금까지는 숨김만 가능했어요)
create policy "reviews: 운영자 삭제" on public.reviews for delete using (public.is_admin());
