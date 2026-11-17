-- 프로필 사진: photos 버킷(photos/<내 id>/…)에 올린 사진 주소. 없으면 닉네임 첫 글자를 보여 줘요.
alter table public.profiles add column avatar text check (avatar is null or public.own_photos(array[avatar]));
grant update (avatar) on public.profiles to authenticated;
