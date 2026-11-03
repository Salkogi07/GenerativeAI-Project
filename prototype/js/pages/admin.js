// 리뷰 검토 (운영자 전용): AI 의심·신고 누적·미판정 대기열, 광고 라벨/숨김/문제없음 처리 + 되돌리기.
// AI 판정은 고정 예시 데이터(AI_EXAMPLES)이고 화면에 '예시 데이터'로 표시해요.
if (!needLogin()) throw new Error('login required');
// 화면 숨김은 편의일 뿐 — 실서비스는 RLS(app_metadata.role = 'admin')로 차단
if (!me().admin) { $('#denied').hidden = false; throw new Error('not admin'); }
$('#tabs').hidden = $('#list').hidden = false;

let q = 'ai';
const decisions = () => DB.get('decisions', {});
function queue(name) {
  const rs = reviews(), d = decisions();
  if (name === 'report') return rs.filter(r => r.reports.length >= 3 && !d[r.id]).map(r => ({ review: r }));
  return AI_EXAMPLES.filter(x => x.queue === name && !d[x.review])
    .map(x => ({ ...x, review: rs.find(r => r.id === x.review) })).filter(x => x.review);
}
function card(x) {
  const r = x.review, p = pinById(r.pin);
  const reasons = Object.entries(r.reports.reduce((a, y) => { a[y.reason] = (a[y.reason] || 0) + 1; return a; }, {}));
  const ai = x.queue ? `<div class="ai-box">
      <div class="ai-head">AI 판정 <span class="example">예시 데이터</span>${x.confidence ? `<span class="score num">확신도 ${x.confidence.toFixed(2)}</span>` : '<span class="none">미판정</span>'}</div>
      ${x.confidence ? `<div class="conf"><i data-conf="${x.confidence}"></i></div>` : ''}
      <div class="ai-reason">${esc(x.reason)}</div></div>` : '';
  return `<div class="review-card" data-card="${r.id}">
    <div class="meta"><span><b>${esc(p?.name || '삭제된 핀')}</b> · ${esc(nickOf(r.by, r.nick))} · ${fmtDate(r.at)}</span>${r.hidden ? '<span class="tag">숨김 중</span>' : ''}</div>
    ${r.ad || r.adminLabel ? '<span class="ad-label">협찬·광고</span>' : ''}
    <p class="quote">${esc(r.body)}</p>${ai}
    ${reasons.length ? `<div class="report-line"><b>신고 ${r.reports.length}건</b> · <span>${reasons.map(([k, n]) => `${esc(k)} ${n}`).join(', ')}</span></div>` : ''}
    <div class="decide"><button class="btn sm" data-act="label">광고 라벨</button><button class="btn sm sec" data-act="hide">숨김</button><button class="btn sm line" data-act="ok">문제없음</button></div>
  </div>`;
}
function render() {
  $$('#tabs button').forEach(b => { b.classList.toggle('on', b.dataset.q === q); $('.n', b).textContent = queue(b.dataset.q).length; });
  $('#list').innerHTML = queue(q).map(card).join('')
    || `<div class="empty"><span class="ic">${icon('check')}</span><div class="t">검토할 리뷰가 없어요</div><div class="s">새로 들어오면 여기에 보여요.</div></div>`;
  $$('[data-conf]').forEach(el => { el.style.width = `${el.dataset.conf * 100}%`; }); // 데이터 값이라 JS에서 지정
}
$('#tabs').onclick = e => { const b = e.target.closest('[data-q]'); if (b) { q = b.dataset.q; render(); } };
$('#list').onclick = e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const rid = b.closest('[data-card]').dataset.card, act = b.dataset.act;
  const all = reviews(), r = all.find(x => x.id === rid), before = JSON.parse(JSON.stringify(r));
  if (act === 'label') { r.adminLabel = true; r.hidden = false; }
  if (act === 'hide') r.hidden = true;
  if (act === 'ok') { r.hidden = false; r.reports = []; } // 문제없음 → 신고 숨김 해제
  save('reviews', all);
  const d = decisions(); d[rid] = act; DB.set('decisions', d);
  render();
  toast({ label: '광고 라벨을 붙였어요', hide: '리뷰를 숨겼어요', ok: '문제없음으로 처리했어요' }[act], { label: '되돌리기', fn: () => {
    const a = reviews(); a[a.findIndex(x => x.id === rid)] = before; save('reviews', a);
    const d2 = decisions(); delete d2[rid]; DB.set('decisions', d2);
    render();
  } });
};
render();
