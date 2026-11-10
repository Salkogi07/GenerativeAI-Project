// 지역 선택: 입력창을 맨 위에 둬서 모바일 키보드가 올라와도 입력창·결과가 가려지지 않게 해요.
// shortcut: 성수동 밖은 시연 데이터가 없어 지도만 옮겨요 — 지역 데이터(API) 연동 때 핀 불러오기 추가
const q = $('#q'), cur = DB.get('region', REGIONS[0][0]);

function render() {
  const rs = REGIONS.filter(r => r[0].includes(q.value.trim()));
  $('#list').innerHTML = rs.map(r => `<button class="check ${r[0] === cur ? 'on' : ''}" role="radio" aria-checked="${r[0] === cur}" data-r="${r[0]}"><span class="radio"></span><span class="fl">${r[0]}</span>${r[0] === cur ? '<span class="now">현재 지역</span>' : ''}</button>`).join('');
  $('#none').hidden = !!rs.length;
  $('#clear').hidden = !q.value;
}
function pick(name) {
  DB.set('region', name);
  location.replace(name === REGIONS[0][0] ? 'home.html' : `home.html?toast=${encodeURIComponent('이 지역은 아직 시연 데이터가 없어요')}`);
}

q.addEventListener('input', render);
$('#clear').onclick = () => { q.value = ''; render(); q.focus(); };
$('#list').onclick = e => { const b = e.target.closest('[data-r]'); if (b) pick(b.dataset.r); };
// 키보드의 검색 키: 첫 번째 결과로
$('#f').onsubmit = e => { e.preventDefault(); const first = $('#list [data-r]'); if (first) pick(first.dataset.r); };
// 목록을 스크롤하면 키보드를 내려 더 많이 보이게
$('#scroll').addEventListener('touchmove', () => q.blur(), { passive: true });
render();
