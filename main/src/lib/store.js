// 데이터: Supabase(회원·핀·리뷰·신고·리스트)를 메모리에 불러 두고, 화면은 pins()·me() 같은 함수로 바로 읽어요.
// 쓰기는 run(Supabase 요청) → 성공하면 전부 다시 불러와 화면을 갱신해요.
// ponytail: 매번 전체를 다시 불러와요. 핀·리뷰가 수천 개를 넘으면 지도 범위(bbox)만 불러오도록 바꿔요.
import { useSyncExternalStore } from 'react';
import { supabase } from '../supabase.js';

export const DAY = 864e5;
export const fmtDate = t => { const d = new Date(t); return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`; };
export const ago = t => { const d = Math.floor((Date.now() - t) / DAY); return d < 1 ? '오늘' : d < 7 ? `${d}일 전` : fmtDate(t); };
export const dist = (a, b) => {
  const R = 6371e3, r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
export const fmtDist = m => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;

// ---------- 화면 갱신 ----------
let version = 0;
const subs = new Set();
const changed = () => { version++; subs.forEach(f => f()); };
export const useStore = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => version);

// 이 기기에만 두는 설정(최근 검색어, 고른 지역)은 localStorage('pinit.' 접두사)
export const DB = {
  get(k, d) { try { const v = localStorage.getItem('pinit.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('pinit.' + k, JSON.stringify(v)); } catch { /* 저장 못 해도 화면은 계속 */ } changed(); },
};

export const CENTER = [37.5436, 127.0518];
export const CATS = ['카페', '맛집', '전시', '산책', '기타'];
// 지역 화면의 바로가기. 다른 곳은 검색(브이월드)으로 찾아요.
export const REGIONS = [['성수동', ...CENTER], ['연남동', 37.5662, 126.9235], ['을지로', 37.5663, 126.9910], ['해운대', 35.1631, 129.1636],
  ['전주 한옥마을', 35.8151, 127.1530], ['경주 황리단길', 35.8380, 129.2099], ['강릉', 37.7519, 128.8761], ['제주시', 33.4996, 126.5312]];
// 고른 지역 [이름, 위도, 경도]
export const region = () => { const r = DB.get('region', null); return Array.isArray(r) && r.length === 3 ? r : REGIONS[0]; };

// ---------- 서버 데이터 ----------
let S = { user: null, pins: [], reviews: [], lists: [], nick: new Map(), likes: new Map(), ai: [], ready: false };
const t = s => Date.parse(s);

export async function refresh() {
  if (!supabase) { S.ready = true; return changed(); }
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user || null, admin = user?.app_metadata?.role === 'admin';
  const [p, r, l, pr, lk, rp, ai] = await Promise.all([
    supabase.from('pins').select('*'),
    supabase.from('reviews').select('*'),
    supabase.from('lists').select('*'),
    supabase.from('profiles').select('id,nick,created_at'),
    supabase.rpc('like_counts'),
    user ? supabase.from('reports').select('review_id,reporter,reason') : { data: [] },
    admin ? supabase.from('review_ai_checks').select('*') : { data: [] },
  ]);
  const err = [p, r, l, pr, lk, rp, ai].find(x => x.error)?.error;
  if (err) throw err;
  const reps = rp.data;
  S = {
    ready: true,
    nick: new Map(pr.data.map(x => [x.id, x])),
    likes: new Map(lk.data.map(x => [x.pin_id, Number(x.n)])),
    pins: p.data.map(x => ({ id: x.id, name: x.name, cat: x.cat, kind: x.place_id ? '장소' : '위치', placeId: x.place_id, lat: x.lat, lng: x.lng,
      desc: x.description, photos: x.photos, author: x.author, created: t(x.created_at) })),
    reviews: r.data.map(x => ({ id: x.id, pin: x.pin_id, by: x.author, body: x.body, ad: x.ad, photos: x.photos, hidden: x.hidden,
      adminLabel: x.admin_label, decision: x.admin_decision, reportCount: x.report_count, at: t(x.created_at),
      reports: reps.filter(y => y.review_id === x.id).map(y => ({ by: y.reporter, reason: y.reason })) })),
    lists: l.data.map(x => ({ id: x.id, name: x.name, owner: x.owner, public: x.is_public, token: x.share_token, pins: x.pin_ids, updated: t(x.updated_at) })),
    ai: ai.data,
    user: user && { id: user.id, email: user.email, nick: '', created: t(user.created_at), location: user.user_metadata?.location !== false, admin },
  };
  if (S.user) S.user.nick = S.nick.get(user.id)?.nick || '';
  changed();
}

// 서버에 쓰고 다시 불러와요. 실패하면 error를 돌려줘요(화면에서 안내).
export async function run(q) {
  const res = await q;
  if (!res.error) await refresh().catch(() => {});
  return res;
}

export const ready = () => S.ready;
export const pins = () => S.pins;
export const reviews = () => S.reviews;
export const lists = () => S.lists;
export const aiChecks = () => S.ai;
export const me = () => S.user;
export const pinById = id => S.pins.find(p => p.id === id);
export const nickOf = id => S.nick.get(id)?.nick || '알 수 없음';
export const isNew = u => Date.now() - u.created < 7 * DAY;
export const todayCount = u => S.reviews.filter(r => r.by === u.id && new Date(r.at).toDateString() === new Date().toDateString()).length;
export const pinReviews = id => S.reviews.filter(r => r.pin === id).sort((a, b) => b.at - a.at);
export const visibleCount = id => pinReviews(id).filter(r => !r.hidden).length;
export const likeCount = id => S.likes.get(id) || 0;
// 장소 사진 = 핀 사진 + 그 핀에 보이는 리뷰 사진
export const placePhotos = p => [...(p.photos || []), ...pinReviews(p.id).filter(r => !r.hidden).flatMap(r => r.photos || [])];
export const pinKind = p => p.kind === '위치' ? '위치 핀' : p.cat;

// ---------- 사진: 첨부 검사·축소 → 저장할 때 Storage에 올려요 ----------
// 최대 3장 · JPG·PNG·WebP · 장당 5MB. 오류 문구를 돌려줘요.
export async function addPhotos(files, photos) {
  let err = '';
  for (const f of files) {
    if (photos.length >= 3) { err = '사진은 최대 3장까지 올릴 수 있어요.'; break; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { err = 'JPG·PNG·WebP 사진만 올릴 수 있어요.'; continue; }
    if (f.size > 5 * 1024 * 1024) { err = `"${f.name}"은 5MB를 넘어요.`; continue; }
    photos.push(await shrink(f, 1280));
  }
  return err;
}
// 캔버스로 다시 그려 EXIF(위치 정보)가 빠져요
function shrink(file, max) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = rej;
    img.src = url;
  });
}
// data URL 사진들을 photos/<내 id>/ 에 올리고 공개 주소를 돌려줘요. 실패하면 null.
export async function uploadPhotos(dataUrls) {
  const urls = [];
  for (const d of dataUrls) {
    const blob = await (await fetch(d)).blob(), path = `${S.user.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) return null;
    urls.push(supabase.storage.from('photos').getPublicUrl(path).data.publicUrl);
  }
  return urls;
}
