// Core helpers shared by every page: DOM, query string, escaping, storage, dates, geo.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const qs = new URLSearchParams(location.search);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 864e5;
const go = href => { location.href = href; };
const here = () => location.pathname.split('/').pop() + location.search;
const uid = () => Math.random().toString(36).slice(2, 10);
const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const fmtDate = t => { const d = new Date(t); return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`; };
const ago = t => { const d = Math.floor((Date.now() - t) / DAY); return d < 1 ? '오늘' : d < 7 ? `${d}일 전` : fmtDate(t); };
const dist = (a, b) => {
  const R = 6371e3, r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const fmtDist = m => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;

// shortcut: demo data lives in this browser's localStorage; the real build uses Supabase (Auth, Postgres + RLS).
const DB = {
  get(k, d) { try { const v = localStorage.getItem('pinit.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) {
    try { localStorage.setItem('pinit.' + k, JSON.stringify(v)); return true; }
    catch { window.toast?.('저장 공간이 부족해요. 사진 수를 줄여 주세요.'); return false; }
  },
};
