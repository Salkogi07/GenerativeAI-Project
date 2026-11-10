// 장소(공공데이터) — Supabase places 테이블. 누구나 읽기만 할 수 있어요.
import { supabase } from '../supabase.js';
import { dist } from './store.js';

const COLS = 'id,name,category,address,lat,lng';
const norm = p => ({ ...p, cat: p.category });

// 띄어쓰기로 나눈 단어가 모두 이름에 들어간 장소. 실패하면 null(화면에서 안내).
export async function searchPlaces(words) {
  if (!supabase || !words.length) return [];
  let q = supabase.from('places').select(COLS);
  for (const w of words) q = q.ilike('name', `%${w.replace(/[%_]/g, '')}%`);
  const { data, error } = await q.limit(20);
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
