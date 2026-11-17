-- 핀 수정·삭제: 만든 사람이 이름·카테고리·설명을 고치고 핀을 지울 수 있어요.
-- 삭제하면 그 핀의 리뷰도 지워져서(on delete cascade), 다른 사람 리뷰가 달린 핀은 지울 수 없어요. 운영자는 지울 수 있어요.
grant update (name, cat) , delete on public.pins to authenticated;
alter policy "pins: 만든 사람만 설명 수정" on public.pins rename to "pins: 만든 사람만 수정";
create policy "pins: 만든 사람·운영자만 삭제" on public.pins for delete using (
  public.is_admin() or (author = auth.uid()
    and not exists (select 1 from public.reviews r where r.pin_id = pins.id and r.author is distinct from auth.uid())));
