// 약관 동의: 필수 4개를 모두 체크해야 다음 단계. 선택한 위치 정보 동의는 가입 정보에 저장.
const ITEMS = [
  ['age', true, '만 14세 이상이에요'],
  ['terms', true, '서비스 이용약관'],
  ['privacy', true, '개인정보 수집·이용', '이메일·닉네임 · 탈퇴하면 바로 삭제'],
  ['review', true, '리뷰 작성 원칙', '대가를 받은 리뷰는 협찬·광고를 꼭 체크해요'],
  ['location', false, '위치 정보 이용', '내 위치로 지도를 옮길 때만 써요 · 저장 안 함'],
];
const state = {};

$('#items').innerHTML = ITEMS.map(([k, req, t, s]) => `<div class="agree-row">
  <button class="check" data-k="${k}"><span class="box">${icon('check')}</span>
    <span class="fl"><span class="${req ? 'req' : 'opt'}">${req ? '필수' : '선택'}</span> ${t}${s ? `<span class="note">${s}</span>` : ''}</span></button>
  <button class="icon-btn muted" data-doc="${k}" aria-label="${t} 보기">${icon('chev', 'sm')}</button></div>`).join('');

function render() {
  $$('[data-k]').forEach(b => b.classList.toggle('on', !!state[b.dataset.k]));
  $('#all').classList.toggle('on', ITEMS.every(([k]) => state[k]));
  $('#next').disabled = !ITEMS.every(([k, req]) => !req || state[k]);
}
$('#items').onclick = e => {
  const d = e.target.closest('[data-doc]');
  if (d) return openDoc(d.dataset.doc);
  const b = e.target.closest('[data-k]');
  if (!b) return;
  state[b.dataset.k] = !state[b.dataset.k];
  render();
};
$('#all').onclick = () => { const v = !ITEMS.every(([k]) => state[k]); ITEMS.forEach(([k]) => { state[k] = v; }); render(); };
$('#next').onclick = () => {
  try { sessionStorage.setItem('pinit.consent', JSON.stringify({ location: !!state.location, at: Date.now() })); } catch { /* 저장 불가해도 다음 단계는 진행 */ }
  go('signup.html' + location.search);
};
