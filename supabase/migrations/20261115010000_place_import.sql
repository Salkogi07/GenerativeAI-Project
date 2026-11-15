-- 브이월드는 해외 IP(Supabase 서버)를 막아서, 검색은 브라우저가 직접 해요(JSONP).
-- (처음 적용한 DB에는 서버 검색 함수 geo_search·http 확장·Vault 키가 있었어요. 아래 drop은 그걸 정리해요.)
-- 그래서 서버 검색 함수·http 확장·Vault 키는 지우고, 핀을 남길 때 고른 브이월드 장소를 places에 저장하는 함수만 둬요.
drop function if exists public.geo_search(text, text);
drop extension if exists http;
delete from vault.secrets where name = 'vworld_key';

-- 로그인한 사용자만. 이미 있으면 그대로 두고 ID만 돌려줘요(남이 이름을 바꾸지 못하게).
create function public.save_place(sk text, nm text, ct text, ad text, la double precision, lo double precision)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare pid bigint;
begin
  if sk !~ '^POI[0-9A-Za-z]{1,40}$' or btrim(coalesce(nm, '')) = '' then raise exception 'bad_place'; end if;
  insert into public.places (source, source_key, name, category, address, lat, lng)
  values ('vworld', sk, left(btrim(nm), 100), left(coalesce(nullif(btrim(ct), ''), '기타'), 30), left(ad, 200), la, lo)
  on conflict (source, source_key) do nothing
  returning id into pid;
  return coalesce(pid, (select id from public.places where source = 'vworld' and source_key = sk));
end $$;
revoke execute on function public.save_place(text, text, text, text, double precision, double precision) from public, anon;
grant execute on function public.save_place(text, text, text, text, double precision, double precision) to authenticated;
