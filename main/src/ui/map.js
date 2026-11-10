// 지도: Leaflet + OpenStreetMap. 표시(핀 모양)는 프로토타입과 같아요.
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CENTER } from '../lib/store.js';

// ref를 붙인 div에 지도를 한 번 만들어요. 지도 객체(처음엔 null)를 돌려줘요.
export function useMap({ center = CENTER, zoom = 15, interactive = true } = {}) {
  const ref = useRef(null), [map, setMap] = useState(null);
  useEffect(() => {
    const m = L.map(ref.current, { zoomControl: false, dragging: interactive, scrollWheelZoom: interactive, doubleClickZoom: interactive,
      touchZoom: interactive, boxZoom: false, keyboard: interactive, tap: interactive }).setView(center, zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.attributionControl.setPrefix(false);
    setMap(m);
    return () => m.remove();
  }, []);
  return [ref, map];
}

// 물방울 모양 핀; 기준점은 -45° 회전 뒤의 뾰족한 끝
export const markerIcon = (p, cls = '') => L.divIcon({ className: '', html: `<span class="mk ${p?.kind === '위치' ? 'loc' : ''} ${cls}"></span>`, iconSize: [28, 28], iconAnchor: [14, 34] });

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
