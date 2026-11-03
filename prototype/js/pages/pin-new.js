// 핀 찍기: 지도에서 위치 지정, 이름 직접 입력(카카오 결과로 미리 채우지 않음), 근처 장소 연결, 중복·근접 핀 확인.
if (!needLogin()) throw new Error('login required');
const u = me();
const place = PLACES.find(p => p.id === qs.get('place'));
const start = place ? [place.lat, place.lng] : qs.get('lat') ? [+qs.get('lat'), +qs.get('lng')] : CENTER;
let pos = { lat: start[0], lng: start[1] }, cat = place?.cat || '', link = place?.id || '';

// 이미 핀이 있는 장소로 들어오면 새 핀 없이 기존 핀으로 (중복 핀 방지)
const existing = place && pins().find(p => p.placeId === place.id);
if (existing) go(`pin.html?id=${existing.id}&toast=${encodeURIComponent('이미 핀이 있는 장소예요')}`);

const m = makeMap($('#map'), { center: start, zoom: 17 });
if (m) {
  const mk = L.marker(start, { icon: markerIcon(null, 'new sel'), draggable: true }).addTo(m);
  addPins(m, pins(), p => toast(`이미 있는 핀: ${p.name}`, { label: '보기', href: `pin.html?id=${p.id}` }));
  const move = ll => { pos = { lat: ll.lat, lng: ll.lng }; mk.setLatLng(ll); renderNear(); };
  m.on('click contextmenu', e => move(e.latlng));
  mk.on('dragend', () => move(mk.getLatLng()));
}

$('#cats').innerHTML = CATS.map(c => `<button class="chip" data-c="${c}">${c}</button>`).join('');
const renderCats = () => $$('#cats .chip').forEach(b => b.classList.toggle('on', b.dataset.c === cat));
$('#cats').onclick = e => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; renderCats(); } };
renderCats();

function renderNear() {
  const near = PLACES.map(p => ({ ...p, d: dist(pos, p) })).filter(p => p.d <= 300).sort((a, b) => a.d - b.d).slice(0, 4);
  if (link && !near.some(p => p.id === link)) link = '';
  $('#near').innerHTML = `<button class="check ${!link ? 'on' : ''}" data-l=""><span class="radio"></span><span class="fl">연결 안 함 <span class="near-meta">· 가게가 아닌 위치 핀</span></span></button>`
    + near.map(p => `<button class="check ${link === p.id ? 'on' : ''}" data-l="${p.id}"><span class="radio"></span><span class="fl">${esc(p.name)} <span class="near-meta num">· ${p.cat} · ${fmtDist(p.d)}</span></span></button>`).join('')
    + (near.length ? '' : '<p class="near-empty">300m 안에 연결할 장소가 없어요.</p>');
}
$('#near').onclick = async e => {
  const b = e.target.closest('[data-l]');
  if (!b) return;
  const id = b.dataset.l, dup = id && pins().find(p => p.placeId === id);
  if (dup) {
    if (await dialog({ title: '이미 핀이 있는 장소예요', body: `"${dup.name}" 핀으로 이동할까요? 새 핀은 만들지 않아요.`, ok: '핀으로 이동' })) { clean(); go(`pin.html?id=${dup.id}`); }
    return;
  }
  link = id;
  if (id && !cat) { cat = PLACES.find(p => p.id === id).cat; renderCats(); }
  renderNear();
};
renderNear();

$('#name').addEventListener('input', () => {
  $('#nameCount').textContent = `${$('#name').value.length}/30`;
  $('#nameErr').textContent = '';
  $('#cName').classList.remove('bad');
});

$('#save').onclick = async () => {
  const name = $('#name').value.trim();
  if (!name) { $('#nameErr').textContent = '핀 이름을 적어 주세요.'; $('#cName').classList.add('bad'); $('#name').focus(); return; }
  if (!cat) return toast('카테고리를 골라 주세요');
  const all = pins();
  if (!link) { // 반경 30m 안 핀이 있으면 기존 핀 제안
    const close = all.find(p => dist(pos, p) <= 30);
    if (close && await dialog({ title: '근처에 비슷한 핀이 있어요', body: `30m 안에 "${close.name}" 핀이 있어요. 그 핀을 쓸까요?`, ok: '기존 핀 보기', cancel: '새로 만들기' })) {
      clean(); return go(`pin.html?id=${close.id}`);
    }
  }
  const p = { id: 'p' + uid(), name, cat, kind: link ? '장소' : '위치', placeId: link || undefined,
    lat: +pos.lat.toFixed(6), lng: +pos.lng.toFixed(6), desc: '', author: u.email, created: Date.now() };
  all.push(p);
  save('pins', all);
  clean();
  go(`pin.html?id=${p.id}&toast=${encodeURIComponent('핀을 남겼어요. 모든 사람의 지도에 보여요')}`);
};
