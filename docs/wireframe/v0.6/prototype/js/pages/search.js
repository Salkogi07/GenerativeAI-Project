// 검색: 입력 중 최근·추천 검색어, 결과는 [핀 | 리스트] 탭. 비공개 리스트는 검색되지 않음.
const q = $('#q');
const DEFAULT_RECENT = ['성수 카페', '산책'];
// 시연 지역이 성수동 하나라 지역명은 검색 조건에서 뺌
const words = s => s.trim().toLowerCase().split(/\s+/).filter(w => w && w !== '성수' && w !== '성수동');
const hit = (text, ws) => ws.every(w => text.toLowerCase().includes(w));
const recent = () => DB.get('recent', DEFAULT_RECENT);
let map = null;

function showTyping() {
  $('#typing').hidden = false;
  $('#results').hidden = $('#tabs').hidden = true;
  const r = recent();
  $('#recentBox').hidden = !r.length;
  $('#recent').innerHTML = r.map((x, i) => `<div class="row compact"><span class="lead-ic">${icon('search', 'sm')}</span>
    <a class="fl" href="?q=${encodeURIComponent(x)}">${esc(x)}</a>
    <button class="icon-btn muted" data-del="${i}" aria-label="${esc(x)} 삭제">${icon('close', 'sm')}</button></div>`).join('');
  const raw = q.value.trim();
  const ws = words(raw).length ? words(raw) : [raw.toLowerCase()];
  const sug = raw ? [...pins().filter(p => hit(p.name + p.cat, ws)).map(p => [p.name, 'pin']),
                     ...lists().filter(l => l.public && hit(l.name, ws)).map(l => [l.name, 'list'])].slice(0, 6) : [];
  $('#sugBox').hidden = !sug.length;
  $('#sug').innerHTML = sug.map(([n, t]) => `<a class="row compact link" href="?q=${encodeURIComponent(n)}${t === 'list' ? '&tab=list' : ''}">
    <span class="lead-ic">${icon(t === 'list' ? 'bookmark' : 'pin', 'sm')}</span><span class="fl">${esc(n)}</span>${t === 'list' ? '<span class="tag">리스트</span>' : ''}</a>`).join('');
  $('#hello').hidden = !!(r.length || sug.length);
}

function showResults(text) {
  const ws = words(text);
  DB.set('recent', [text, ...recent().filter(r => r !== text)].slice(0, 8));
  const fail = qs.get('fail'); // 장소 검색 API 실패 상태
  const all = pins();
  const ps = all.filter(p => hit(`${p.name} ${p.cat} ${p.desc || ''}`, ws));
  const pinned = new Set(all.map(p => p.placeId).filter(Boolean));
  const places = fail ? [] : PLACES.filter(p => !pinned.has(p.id) && hit(`${p.name} ${p.cat}`, ws));
  const pub = lists().filter(l => l.public && hit(l.name, ws));
  $('#typing').hidden = true;
  $('#results').hidden = $('#tabs').hidden = false;
  $('#apiFail').hidden = !fail;
  $('#nPin').textContent = ps.length + places.length;
  $('#nList').textContent = pub.length;

  const c = { lat: CENTER[0], lng: CENTER[1] };
  $('#pinList').innerHTML = ps.map(p => `<a class="row" href="pin.html?id=${p.id}"><span class="thumb tint">${icon('pin')}</span>
      <span class="fl"><span class="t ell">${esc(p.name)}</span><span class="s">${esc(pinKind(p))} · 리뷰 ${visibleCount(p.id)} · 찜 ${likeCount(p.id)}</span></span>
      <span class="end num">${fmtDist(dist(c, p))}</span></a>`).join('')
    + places.map(p => `<div class="row"><span class="thumb">${icon('pin')}</span>
      <span class="fl"><span class="t ell">${esc(p.name)}</span><span class="s">${p.cat} · 아직 핀이 없어요</span></span>
      <a class="btn sm line" href="pin-new.html?place=${p.id}" data-need>핀 남기기</a></div>`).join('');
  const myEmail = me()?.email;
  $('#listList').innerHTML = pub.map(l => `<a class="row" href="${l.owner === myEmail ? 'list.html?id=' + l.id : 'shared.html?t=' + l.token}">
    <span class="thumb tint">${icon('bookmark')}</span><span class="fl"><span class="t ell">${esc(l.name)}</span><span class="s">핀 ${l.pins.length} · ${esc(nickOf(l.owner))}</span></span>
    <span class="chev">${icon('chev', 'sm')}</span></a>`).join('');

  const none = !ps.length && !places.length && !pub.length;
  $('#empty').hidden = !none;
  $('#pinTab').hidden = $('#listTab').hidden = none;
  $('#emptyT').textContent = `"${text}" 검색 결과가 없어요`;
  if (none) return;
  setTab(qs.get('tab') === 'list' || (!ps.length && !places.length) ? 'list' : 'pin');
  map = map || makeMap($('#map'));
  if (!map) return;
  const pts = [...ps, ...places.map(p => ({ ...p, kind: '장소', fromPlace: true }))];
  pts.forEach(p => L.marker([p.lat, p.lng], { icon: markerIcon(p, p.fromPlace ? 'dim' : '') }).addTo(map)
    .on('click', () => go(p.fromPlace ? `pin-new.html?place=${p.id}` : `pin.html?id=${p.id}`)));
  fitTo(map, pts);
}
function setTab(t) {
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $('#pinTab').hidden = t !== 'pin';
  $('#listTab').hidden = t !== 'list';
  if (t === 'pin') setTimeout(() => map?.invalidateSize(), 0);
}

$('#tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); };
$('#f').onsubmit = e => { e.preventDefault(); const v = q.value.trim(); if (v) go('search.html?q=' + encodeURIComponent(v)); };
q.addEventListener('input', () => { $('#clear').hidden = !q.value; showTyping(); });
q.addEventListener('focus', () => { if (!$('#results').hidden) showTyping(); });
$('#clear').onclick = () => { q.value = ''; $('#clear').hidden = true; q.focus(); showTyping(); };
$('#recent').onclick = e => {
  const d = e.target.closest('[data-del]');
  if (!d) return;
  const r = recent(); r.splice(+d.dataset.del, 1); DB.set('recent', r); showTyping();
};
$('#clearAll').onclick = () => { DB.set('recent', []); showTyping(); };
$('#widen').onclick = () => go('search.html?q=' + encodeURIComponent(words(q.value)[0] || '카페'));
$('#firstPin').onclick = () => { if (needLogin('pin-new.html')) go('pin-new.html'); };
$('#results').addEventListener('click', e => {
  const a = e.target.closest('[data-need]');
  if (!a) return;
  e.preventDefault();
  if (needLogin(a.getAttribute('href'))) go(a.getAttribute('href'));
});

const init = qs.get('q');
if (init) { q.value = init; $('#clear').hidden = false; showResults(init); }
else { showTyping(); q.focus(); }
