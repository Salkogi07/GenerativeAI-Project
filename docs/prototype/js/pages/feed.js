// 피드: [장소 사진 | 리뷰] 탭, 인기(찜 수 → 리뷰 수) 많은·적은 순, 최신·오래된 순. 장소를 누르면 핀 상세의 리뷰 목록으로.
const SORTS = [['pop', '인기 많은 순'], ['unpop', '인기 적은 순'], ['new', '최신순'], ['old', '오래된 순']];
let tab = qs.get('tab') === 'review' ? 'review' : 'photo', sort = 'pop';

// 검색: 띄어쓰기로 나눈 단어가 모두 들어 있어야 해요
const words = () => $('#q').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
const hit = (text, ws) => ws.every(w => text.toLowerCase().includes(w));

const popular = (a, b) => likeCount(b.id) - likeCount(a.id) || visibleCount(b.id) - visibleCount(a.id);

function order(list, when, pinOf) {
  const by = { pop: (a, b) => popular(pinOf(a), pinOf(b)), new: (a, b) => when(b) - when(a) };
  by.unpop = (a, b) => -by.pop(a, b);
  by.old = (a, b) => -by.new(a, b);
  return [...list].sort(by[sort]);
}

function render() {
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $$('#sort .chip').forEach(c => { c.classList.toggle('on', c.dataset.s === sort); c.setAttribute('aria-checked', c.dataset.s === sort); });
  $('#grid').hidden = tab !== 'photo';
  $('#rvs').hidden = tab !== 'review';
  if (tab === 'photo') {
    const ws = words();
    const ps = order(pins().filter(p => hit(`${p.name} ${p.cat} ${p.desc || ''} ${nickOf(p.author)}`, ws)), p => p.created, p => p);
    $('#grid').innerHTML = ps.map((p, i) => {
      const ph = placePhotos(p);
      return `<a class="ftile ${ph.length ? '' : 'nophoto'}" href="pin.html?id=${p.id}#reviews-h">
        ${ph.length ? photoHTML(ph[0], `${p.name} 사진`, 'fph') : `<div class="fph">${icon('pin')}</div>`}
        ${sort === 'pop' ? `<span class="rank num ${i < 3 ? 'top' : ''}">${i + 1}</span>` : ''}
        ${ph.length > 1 ? `<span class="cnt num">${icon('camera', 'xs')}${ph.length}</span>` : ''}
        <span class="cap"><span class="nm ell">${esc(p.name)}</span><span class="meta num">찜 ${likeCount(p.id)} · 리뷰 ${visibleCount(p.id)}</span></span></a>`;
    }).join('');
    showEmpty(ps.length);
  } else {
    const ws = words();
    const rs = order(reviews().filter(r => !r.hidden && pinById(r.pin)
      && hit(`${r.body} ${pinById(r.pin).name} ${nickOf(r.by, r.nick)}`, ws)), r => r.at, r => pinById(r.pin));
    $('#rvs').innerHTML = rs.map(reviewLinkHTML).join('');
    showEmpty(rs.length);
  }
  $('#clear').hidden = !$('#q').value;
}
function showEmpty(n) {
  const q = $('#q').value.trim();
  $('#empty').hidden = !!n;
  $('#emptyT').textContent = q ? `"${q}" 결과가 없어요` : tab === 'photo' ? '아직 보여 줄 장소가 없어요' : '아직 보여 줄 리뷰가 없어요';
  $('#emptyS').textContent = q ? '다른 단어로 검색하거나 다른 탭에서 찾아보세요.' : '장소에 첫 핀과 리뷰를 남겨 보세요.';
}

$('#sort').innerHTML = SORTS.map(([k, n]) => `<button class="chip" role="radio" data-s="${k}">${n}</button>`).join('');
$('#sort').onclick = e => { const c = e.target.closest('[data-s]'); if (c) { sort = c.dataset.s; render(); } };
$('#q').addEventListener('input', render);
$('#clear').onclick = () => { $('#q').value = ''; render(); $('#q').focus(); };
$('#f').onsubmit = e => { e.preventDefault(); $('#q').blur(); }; // 검색 키를 누르면 키보드만 내려요
$('#tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); } };
render();
