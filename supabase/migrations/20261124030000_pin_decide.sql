-- 핀 신고 처리를 리뷰와 같게: 광고 라벨 · 문제없음 · 삭제
-- admin_label = 운영자가 붙인 협찬·광고 표시(작성자 체크 ad와 별개). 핀 상세·미리보기에 협찬·광고로 보여요.
-- 광고 라벨·문제없음 모두 지금까지 들어온 신고를 처리한 것으로 봐요(report_ok_id). 새 신고가 오면 다시 올라와요.
-- 핀 작성자가 바꾸지 못하게 컬럼 권한은 주지 않고, 운영자만 부르는 함수로만 바꿔요.
alter table public.pins add column admin_label boolean not null default false;

create function public.pin_decide(pid uuid, label boolean, upto bigint) returns void language plpgsql security definer set search_path = ''
as $$ begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.pins set admin_label = label, report_ok_id = upto where id = pid;
end $$;
revoke execute on function public.pin_decide(uuid, boolean, bigint) from public, anon;
grant execute on function public.pin_decide(uuid, boolean, bigint) to authenticated;

-- 문제없음만 하던 함수는 pin_decide로 바뀌었어요
drop function public.pin_reports_ok(uuid, bigint);
