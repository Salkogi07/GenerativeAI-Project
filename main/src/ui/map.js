// 지도: Leaflet + 브이월드 배경지도(국토교통부, 한국만). 표시(핀 모양)는 프로토타입과 같아요.
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CENTER, catIcon, me } from '../lib/store.js';

const KEY = import.meta.env.VITE_VWORLD_KEY;
// 한국 밖으로는 못 나가게 막아요 (지도가 옆으로 반복되며 핀이 사라져 보이던 문제)
const KOREA = [[32.8, 124.0], [38.9, 132.0]];
// 줌에 따른 핀 크기 배율
const pinScale = z => z >= 16 ? 1 : z >= 14 ? 0.8 : 0.6;

// ref를 붙인 div에 지도를 한 번 만들어요. 지도 객체(처음엔 null)를 돌려줘요.
export function useMap({ center = CENTER, zoom = 15, interactive = true } = {}) {
  const ref = useRef(null), [map, setMap] = useState(null);
  useEffect(() => {
    const m = L.map(ref.current, { zoomControl: false, dragging: interactive, scrollWheelZoom: interactive, doubleClickZoom: interactive,
      touchZoom: interactive, boxZoom: false, keyboard: interactive, tap: interactive,
      minZoom: 7, maxZoom: 19, maxBounds: KOREA, maxBoundsViscosity: 1 }).setView(center, zoom);
    L.tileLayer(`https://api.vworld.kr/req/wmts/1.0.0/${KEY}/Base/{z}/{y}/{x}.png`, {
      minZoom: 7, maxZoom: 19, bounds: KOREA, attribution: '&copy; <a href="https://www.vworld.kr" target="_blank" rel="noopener">브이월드(국토교통부)</a>',
    }).addTo(m);
    m.attributionControl.setPrefix(false);
    const size = () => m.getContainer().style.setProperty('--mk', pinScale(m.getZoom()));
    size();
    m.on('zoomend', size);
    setMap(m);
    return () => m.remove();
  }, []);
  return [ref, map];
}

const esc = s => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);

// 물방울 모양 핀; 기준점은 -45° 회전 뒤의 뾰족한 끝. 안에 카테고리 아이콘, 내 핀은 브랜드 색, 다른 사람 핀은 회색.
// .mkw는 줌에 따라 끝을 기준으로 크기만 바꿔요 (--mk)
export const markerIcon = (p, cls = '') => L.divIcon({ className: '',
  html: `<span class="mkw"><span class="mk ${p?.author && p.author === me()?.id ? 'mine' : ''} ${catIcon(p?.cat) ? 'ic' : ''} ${cls}"><i>${esc(catIcon(p?.cat))}</i></span></span>`, iconSize: [28, 28], iconAnchor: [14, 34] });

export function addPins(m, list, onClick, cls = '') {
  if (!m) return [];
  return list.map(p => {
    const mk = L.marker([p.lat, p.lng], { icon: markerIcon(p, cls), title: p.name, keyboard: true }).addTo(m);
    mk.on('click', () => onClick?.(p, mk));
    mk.pin = p;
    return mk;
  });
}

export function fitTo(m, list) {
  if (!m || !list.length) return;
  if (list.length === 1) return m.setView([list[0].lat, list[0].lng], 16);
  m.fitBounds(L.latLngBounds(list.map(p => [p.lat, p.lng])), { padding: [36, 36], maxZoom: 16 });
}

export { L };
