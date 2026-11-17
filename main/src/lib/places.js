// 장소 — Supabase places 테이블(공공데이터 + 브이월드 검색 결과). 누구나 읽기만 할 수 있어요.
import { supabase } from '../supabase.js';
import { log, problem } from './log.js';
import { dist } from './store.js';

const COLS = 'id,name,category,address,lat,lng';
const norm = p => ({ ...p, cat: p.category });

// 띄어쓰기로 나눈 단어가 모두 이름에 들어간 장소. 실패하면 null(화면에서 안내).
export async function searchPlaces(words) {
  if (!supabase || !words.length) return [];
  let q = supabase.from('places').select(COLS);
  for (const w of words) q = q.ilike('name', `%${w.replace(/[%_]/g, '')}%`);
  const { data, error } = await q.limit(20);
  if (error) log('searchPlaces', error);
  return error ? null : data.map(norm);
}

// pos에서 r미터 안의 장소, 가까운 순.
export async function nearPlaces(pos, r = 300, n = 4) {
  if (!supabase) return [];
  const dLat = r / 111320, dLng = r / (111320 * Math.cos(pos.lat * Math.PI / 180));
  const { data, error } = await supabase.from('places').select(COLS)
    .gte('lat', pos.lat - dLat).lte('lat', pos.lat + dLat).gte('lng', pos.lng - dLng).lte('lng', pos.lng + dLng).limit(50);
  if (error) return [];
  return data.map(p => ({ ...norm(p), d: dist(pos, p) })).filter(p => p.d <= r).sort((a, b) => a.d - b.d).slice(0, n);
}

export async function placeById(id) {
  if (!supabase || !id) return null;
  const { data } = await supabase.from('places').select(COLS).eq('id', id).maybeSingle();
  return data && norm(data);
}

// ---------- 전국 검색: 브이월드 검색 API ----------
// 브이월드는 CORS를 안 열어 주고 해외 서버(Supabase)도 막아서, 브라우저에서 JSONP로 불러요. 키는 페이지에 보여요(사용자 결정).
const VW = import.meta.env.VITE_VWORLD_KEY;
if (!VW) problem('전국 검색을 쓸 수 없어요.', 'config', '브이월드 설정 없음: VITE_VWORLD_KEY 가 main/.env.local에 비어 있어요');
let seq = 0;
function jsonp(url) {
  return new Promise((res, rej) => {
    const cb = `__vw${Date.now()}_${seq++}`, s = document.createElement('script');
    const done = v => { clearTimeout(tm); delete window[cb]; s.remove(); v instanceof Error ? rej(v) : res(v); };
    const tm = setTimeout(() => done(new Error('timeout')), 8000);
    window[cb] = done;
    s.onerror = () => done(new Error('load'));
    s.src = `${url}&callback=${cb}`;
    document.head.appendChild(s);
  });
}
// 결과 items 배열. 결과가 없으면 [], 실패하면 null.
async function vworld(params) {
  const q = new URLSearchParams({ service: 'search', request: 'search', version: '2.0', crs: 'EPSG:4326', size: '20', page: '1', format: 'json', errorformat: 'json', key: VW, ...params });
  try {
    const r = (await jsonp(`https://api.vworld.kr/req/search?${q}`)).response;
    if (r.status === 'OK') return r.result.items;
    if (r.status === 'NOT_FOUND') return [];
    problem('전국 검색 서버에 문제가 있어요.', 'vworld', r);
    return null;
  } catch (e) { problem('전국 검색 서버에 연결하지 못했어요.', 'vworld', e); return null; }
}

// kind 'place' → 장소(POI): { id(우리 places에 저장된 적 있으면), key, name, cat, address, lat, lng }
// kind 'district' → 행정구역: { name, lat, lng } (시도 → 시군구 → 읍면동 순으로, 처음 찾은 단계만). 실패하면 null.
export async function geoSearch(text, kind = 'place') {
  const query = text.trim().slice(0, 50);
  if (!VW || !query) return VW ? [] : null;
  const pt = i => ({ lat: +i.point.y, lng: +i.point.x });
  if (kind === 'district') {
    for (const category of ['L1', 'L2', 'L4']) {
      const items = await vworld({ type: 'district', category, query });
      if (items === null) return null;
      if (items.length) return items.map(i => ({ name: i.title, ...pt(i) }));
    }
    return [];
  }
  const items = await vworld({ type: 'place', query });
  if (!items) return items;
  const ps = items.map(i => ({ id: null, key: i.id, name: i.title, cat: i.category?.split('>').pop().trim() || '기타',
    address: i.address?.road || i.address?.parcel || '', ...pt(i) }));
  // 전에 핀을 남기며 저장된 장소면 우리 ID를 붙여요 (중복 핀 확인용)
  if (supabase && ps.length) {
    const { data } = await supabase.from('places').select('id,source_key').eq('source', 'vworld').in('source_key', ps.map(p => p.key));
    const ids = new Map((data || []).map(x => [x.source_key, x.id]));
    ps.forEach(p => { p.id = ids.get(p.key) ?? null; });
  }
  return ps;
}

// 브이월드 장소를 places에 저장하고 ID를 돌려줘요(로그인 필요). 실패하면 null.
export async function savePlace(p) {
  if (p.id) return p.id;
  const { data, error } = await supabase.rpc('save_place', { sk: p.key, nm: p.name, ct: p.cat, ad: p.address, la: p.lat, lo: p.lng });
  return error ? null : data;
}
