// 내 활동: 내가 찍은 핀 목록, 내가 쓴 리뷰 목록 (최신순).
if (!needLogin()) throw new Error('login required');
const u = me();
let tab = qs.get('tab') === 'review' ? 'review' : 'pin';
const myPins = pins().filter(p => p.author === u.email).sort((a, b) => b.created - a.created);
const myReviews = reviews().filter(r => r.by === u.email).sort((a, b) => b.at - a.at);

$('#nPin').textContent = myPins.length;
$('#nRv').textContent = myReviews.length;
$('#pins').innerHTML = myPins.map(p => `<a class="row" href="pin.html?id=${p.id}">
  ${p.photos?.length ? photoHTML(p.photos[0], `${p.name} 사진`, 'thumb') : `<span class="thumb tint">${icon('pin')}</span>`}
  <span class="fl"><span class="t ell">${esc(p.name)}</span><span class="s">${esc(pinKind(p))} · 리뷰 ${visibleCount(p.id)} · 찜 ${likeCount(p.id)} · ${ago(p.created)}</span></span>
  <span class="chev">${icon('chev', 'sm')}</span></a>`).join('');
// 내 리뷰는 신고로 가려져도 나에게는 보여요
$('#rvs').innerHTML = myReviews.map(reviewLinkHTML).join('');

function render() {
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#pins').hidden = tab !== 'pin';
  $('#rvs').hidden = tab !== 'review';
  $('#emptyPin').hidden = tab !== 'pin' || !!myPins.length;
  $('#emptyRv').hidden = tab !== 'review' || !!myReviews.length;
}
$('#tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); } };
render();
