-- 프로필 사진을 바꾸거나 지우면 예전 파일을 지워요. 지울 수 있는 건 내 avatar 폴더(photos/<내 id>/avatar/…)뿐이에요
-- (핀·리뷰 사진은 그대로 두기 위해). Storage 삭제는 select 권한도 필요해요.
create policy "photos: 내 프로필 사진 보기" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text and (storage.foldername(name))[2] = 'avatar');
create policy "photos: 내 프로필 사진 지우기" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text and (storage.foldername(name))[2] = 'avatar');
