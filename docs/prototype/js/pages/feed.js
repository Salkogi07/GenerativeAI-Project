// 피드: [장소 사진 | 리뷰] 탭, 인기(찜 수 → 리뷰 수) 많은·적은 순, 최신·오래된 순. 장소를 누르면 핀 상세의 리뷰 목록으로.
const SORTS = [['pop', '인기 많은 순'], ['unpop', '인기 적은 순'], ['new', '최신순'], ['old', '오래된 순']];
let tab = qs.get('tab') === 'review' ? 'review' : 'photo', sort = 'pop';

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
    const ps = order(pins(), p => p.created, p => p);
    $('#grid').innerHTML = ps.map((p, i) => {
      const ph = placePhotos(p);
      return `<a class="ftile ${ph.length ? '' : 'nophoto'}" href="pin.html?id=${p.id}#reviews-h">
        ${ph.length ? photoHTML(ph[0], `${p.name} 사진`, 'fph') : `<div class="fph">${icon('pin')}</div>`}
        ${sort === 'pop' ? `<span class="rank num ${i < 3 ? 'top' : ''}">${i + 1}</span>` : ''}
        ${ph.length > 1 ? `<span class="cnt num">${icon('camera', 'xs')}${ph.length}</span>` : ''}
        <span class="cap"><span class="nm ell">${esc(p.name)}</span><span class="meta num">찜 ${likeCount(p.id)} · 리뷰 ${visibleCount(p.id)}</span></span></a>`;
    }).join('');
    $('#empty').hidden = true;
  } else {
    const rs = order(reviews().filter(r => !r.hidden && pinById(r.pin)), r => r.at, r => pinById(r.pin));
    $('#rvs').innerHTML = rs.map(reviewLinkHTML).join('');
    $('#empty').hidden = !!rs.length;
  }
}

$('#sort').innerHTML = SORTS.map(([k, n]) => `<button class="chip" role="radio" data-s="${k}">${n}</button>`).join('');
$('#sort').onclick = e => { const c = e.target.closest('[data-s]'); if (c) { sort = c.dataset.s; render(); } };
$('#tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); } };
render();
