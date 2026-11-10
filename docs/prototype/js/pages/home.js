// 지도 홈: 공개 핀 지도, 카테고리 칩, 핀 미리보기 카드, 내 위치, 핀 찍기.
const mine = qs.get('mine');
if (mine && !needLogin()) throw new Error('login required');
const u = me();
const m = makeMap($('#map'));
let cat = '', markers = [], selected = null;

$('#chips').innerHTML = ['전체', ...CATS.slice(0, 4)].map(c =>
  `<button class="chip raised ${c === '전체' ? 'on' : ''}" role="radio" data-c="${c === '전체' ? '' : c}">${c}</button>`).join('');
$('#chips').onclick = e => {
  const b = e.target.closest('[data-c]');
  if (!b) return;
  cat = b.dataset.c === cat ? '' : b.dataset.c; // 같은 칩을 다시 누르면 전체
  $$('#chips .chip').forEach(c => c.classList.toggle('on', c.dataset.c === cat));
  draw();
};

function show(p, mk) {
  selected?.setIcon(markerIcon(selected.pin));
  mk.setIcon(markerIcon(p, 'sel'));
  selected = mk;
  $('#pvName').textContent = p.name;
  $('#pvSub').textContent = `${pinKind(p)} · 리뷰 ${visibleCount(p.id)} · 찜 ${likeCount(p.id)}`;
  $('#pvDesc').textContent = p.desc || '아직 설명이 없어요.';
  const rs = pinReviews(p.id).filter(r => !r.hidden).slice(0, 2);
  $('#pvRvs').innerHTML = rs.length ? `<span class="pv-h">최근 리뷰</span>` + rs.map(r => `<span class="pv-rv">
    <span class="pv-who">${esc(nickOf(r.by, r.nick))} · ${ago(r.at)}</span>
    ${r.ad || r.adminLabel ? '<span class="ad-label">협찬·광고</span>' : ''}<span class="pv-body">${esc(r.body)}</span></span>`).join('')
    : '<span class="pv-h">아직 리뷰가 없어요. 첫 리뷰를 남겨 보세요.</span>';
  $('#pvBy').textContent = `${nickOf(p.author)} 님의 핀`;
  $('#preview').href = `pin.html?id=${p.id}`;
  $('#preview').hidden = false;
  $('#fab').hidden = $('#loc').hidden = true;
}
function hide() {
  selected?.setIcon(markerIcon(selected.pin));
  selected = null;
  $('#preview').hidden = true;
  $('#fab').hidden = $('#loc').hidden = false;
}
function draw() {
  hide();
  markers.forEach(x => x.remove());
  const list = pins().filter(p => (!cat || p.cat === cat) && (!mine || p.author === u?.email));
  markers = addPins(m, list, show);
  if (mine) fitTo(m, list);
  if (!list.length) toast(mine ? '아직 찍은 핀이 없어요' : '이 카테고리에는 아직 핀이 없어요', { label: '핀 찍기', href: 'pin-new.html' });
}
m?.on('click', hide);
$('#mineBar').hidden = !mine;

$('#fab').onclick = e => {
  e.preventDefault();
  const c = m ? m.getCenter() : { lat: CENTER[0], lng: CENTER[1] };
  const href = `pin-new.html?lat=${c.lat.toFixed(6)}&lng=${c.lng.toFixed(6)}`;
  if (needLogin(href)) go(href);
};
// 위치는 지도 이동에만 쓰고 저장하지 않음
$('#loc').onclick = () => {
  const fallback = msg => { m?.setView(CENTER, 15); toast(msg); };
  if (u && u.location === false) return fallback('위치 정보 이용이 꺼져 있어요. 내 정보에서 켤 수 있어요');
  if (!navigator.geolocation) return fallback('이 기기에서는 위치를 확인할 수 없어요');
  navigator.geolocation.getCurrentPosition(p => {
    const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
    dist(pos, { lat: CENTER[0], lng: CENTER[1] }) > 5000 ? fallback('지금은 성수동만 볼 수 있어서 성수동으로 이동했어요') : m?.setView([pos.lat, pos.lng], 16);
  }, () => fallback('위치 권한이 없어 성수동 중심으로 이동했어요'), { timeout: 6000 });
};
draw();
