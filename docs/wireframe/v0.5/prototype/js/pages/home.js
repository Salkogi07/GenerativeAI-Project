// 지도 홈: 공개 핀 지도, 카테고리 칩, 핀 미리보기 카드, 내 위치, 핀 찍기.
const u = me();
const region = REGIONS.find(r => r[0] === DB.get('region', '')) || REGIONS[0];
const m = makeMap($('#map'), { center: [region[1], region[2]] });
let cat = '', markers = [], selected = null;

// 칩은 3개만: 내가 고른 카테고리(이 기기에 저장, 없으면 앞 3개). 시트에서 고른 게 그 밖이면 맨 앞에 보여 줘요
const MAX = 3;
const homeCats = () => { const mine = DB.get('homeCats', []).filter(c => CATS.includes(c)); return mine.length ? mine : CATS.slice(0, MAX); };
function chips() {
  const top = homeCats(), shown = !cat || top.includes(cat) ? top : [cat, ...top.slice(0, 2)];
  $('#chips').innerHTML = shown.map(c => `<button class="chip raised ${c === cat ? 'on' : ''}" role="radio" aria-checked="${c === cat}" data-c="${c}">${c}</button>`).join('')
    + `<button class="chip raised chip-more" aria-label="카테고리 전체 보기" data-more>${icon('feed', 'sm')}</button>`;
}
function pick(c) { cat = c; chips(); draw(); }
chips();
$('#chips').onclick = e => {
  if (e.target.closest('[data-more]')) return catSheet();
  const b = e.target.closest('[data-c]');
  if (b) pick(b.dataset.c === cat ? '' : b.dataset.c); // 같은 칩을 다시 누르면 전체
};

// 카테고리 시트: 눌러서 걸러 보기, 편집에서는 지도에 띄울 칩을 3개까지 골라요
function catSheet() {
  let edit = false, on = homeCats();
  sheet('<div class="cat-sheet"></div>', (w, close) => {
    const box = w.querySelector('.cat-sheet');
    const render = () => box.innerHTML = `<div class="sheet-head"><h3>${edit ? '지도에 띄울 카테고리' : '카테고리'}</h3><button data-edit>${edit ? '완료' : '편집'}</button></div>`
      + (edit ? `<p class="lead">${MAX}개까지 고를 수 있어요. 고른 순서대로 지도에 보여요.</p><div class="chips wrap cat-all" role="group" aria-label="카테고리 전체">${CATS.map(c => { const i = on.indexOf(c);
          return `<button class="chip ${i >= 0 ? 'on' : ''}" aria-pressed="${i >= 0}" data-t="${c}" ${i < 0 && on.length >= MAX ? 'disabled' : ''}>${i >= 0 ? `<span class="cat-no">${i + 1}</span>` : ''}${c}</button>`; }).join('')}</div>`
        : `<div class="chips wrap cat-all" role="radiogroup" aria-label="카테고리 전체">${['', ...CATS].map(c =>
          `<button class="chip ${c === cat ? 'on' : ''}" role="radio" aria-checked="${c === cat}" data-c="${c}">${c || '전체'}</button>`).join('')}</div>`);
    render();
    box.onclick = e => {
      if (e.target.closest('[data-edit]')) { if (edit) { DB.set('homeCats', on); chips(); toast('지도에 띄울 카테고리를 바꿨어요'); } edit = !edit; return render(); }
      const t = e.target.closest('[data-t]');
      if (t) { const c = t.dataset.t; on = on.includes(c) ? on.filter(x => x !== c) : on.length < MAX ? [...on, c] : on; return render(); }
      const b = e.target.closest('[data-c]');
      if (b) { close(); pick(b.dataset.c); }
    };
  });
}

function show(p, mk) {
  selected?.setIcon(markerIcon(selected.pin));
  mk.setIcon(markerIcon(p, 'sel'));
  selected = mk;
  const ph = placePhotos(p);
  $('#pvThumb').innerHTML = ph.length ? photoHTML(ph[0], `${p.name} 사진`, 'pv-ph') : icon('pin');
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
  const list = pins().filter(p => !cat || p.cat === cat);
  markers = addPins(m, list, show);
  if (!list.length) toast('이 카테고리에는 아직 핀이 없어요', { label: '핀 찍기', href: 'pin-new.html' });
}
m?.on('click', hide);

$('#fab').onclick = e => {
  e.preventDefault();
  const c = m ? m.getCenter() : { lat: CENTER[0], lng: CENTER[1] };
  const href = `pin-new.html?lat=${c.lat.toFixed(6)}&lng=${c.lng.toFixed(6)}`;
  if (needLogin(href)) go(href);
};
// 위치는 지도 이동에만 쓰고 저장하지 않음
$('#loc').onclick = () => {
  const fallback = msg => { m?.setView(CENTER, 15); toast(msg); };
  if (u && u.location === false) return fallback('위치 정보 이용이 꺼져 있어요. 마이페이지에서 켤 수 있어요');
  if (!navigator.geolocation) return fallback('이 기기에서는 위치를 확인할 수 없어요');
  navigator.geolocation.getCurrentPosition(p => {
    const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
    dist(pos, { lat: CENTER[0], lng: CENTER[1] }) > 5000 ? fallback('지금은 성수동만 볼 수 있어서 성수동으로 이동했어요') : m?.setView([pos.lat, pos.lng], 16);
  }, () => fallback('위치 권한이 없어 성수동 중심으로 이동했어요'), { timeout: 6000 });
};
$('#regionName').textContent = region[0];
draw();
