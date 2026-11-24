-- 핀 신고 "문제없음": 운영자가 확인한 신고까지는 핀 신고 탭에서 빼요. 새 신고가 들어오면 다시 올라와요.
-- report_ok_id = 문제없음으로 처리한 마지막 신고 번호(pin_reports.id). 0이면 처리한 적 없음.
-- 핀 작성자가 바꾸지 못하게 컬럼 권한은 주지 않고, 운영자만 부르는 함수로만 바꿔요.
alter table public.pins add column report_ok_id bigint not null default 0;

create function public.pin_reports_ok(pid uuid, upto bigint) returns void language plpgsql security definer set search_path = ''
as $$ begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.pins set report_ok_id = upto where id = pid;
end $$;
revoke execute on function public.pin_reports_ok(uuid, bigint) from public, anon;
grant execute on function public.pin_reports_ok(uuid, bigint) to authenticated;
