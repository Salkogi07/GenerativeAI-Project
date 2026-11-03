// Map helpers on Leaflet + OpenStreetMap. Depends on core.js, data.js, ui.js and the Leaflet CDN script.
// shortcut: 지도 타일은 아직 불러오지 않아요 (배경 무늬 + 핀만). 실제 지도를 붙일 때 makeMap에서 L.tileLayer를 추가.
function makeMap(el, { center = CENTER, zoom = 15, interactive = true } = {}) {
  if (!window.L) {
    el.classList.add('map-off');
    el.innerHTML = `${icon('map')}<span>지도를 불러오지 못했어요</span><button class="btn sm line" data-reload>다시 시도</button>`;
    $('[data-reload]', el).onclick = () => location.reload();
    return null;
  }
  const m = L.map(el, { zoomControl: false, dragging: interactive, scrollWheelZoom: interactive, doubleClickZoom: interactive,
    touchZoom: interactive, boxZoom: false, keyboard: interactive, tap: interactive, attributionControl: false }).setView(center, zoom);
  return m;
}
// Teardrop marker; anchor = the tip after the -45° rotation.
const markerIcon = (p, cls = '') => L.divIcon({ className: '', html: `<span class="mk ${p?.kind === '위치' ? 'loc' : ''} ${cls}"></span>`, iconSize: [28, 28], iconAnchor: [14, 34] });
function addPins(m, list, onClick) {
  if (!m) return [];
  return list.map(p => {
    const mk = L.marker([p.lat, p.lng], { icon: markerIcon(p), title: p.name, keyboard: true }).addTo(m);
    mk.on('click', () => (onClick ? onClick(p, mk) : go(`pin.html?id=${p.id}`)));
    mk.pin = p;
    return mk;
  });
}
function fitTo(m, list) {
  if (!m || !list.length) return;
  if (list.length === 1) return m.setView([list[0].lat, list[0].lng], 16);
  m.fitBounds(L.latLngBounds(list.map(p => [p.lat, p.lng])), { padding: [36, 36], maxZoom: 16 });
}
