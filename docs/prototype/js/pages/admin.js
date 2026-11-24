// 리뷰 검토 (운영자 전용): AI 의심·리뷰 신고·핀 신고 대기열과 판정 완료 목록, 광고 라벨/문제없음/삭제 처리 + 되돌리기. 핀 신고(문제없음/핀 삭제).
// AI 판정은 고정 예시 데이터(AI_EXAMPLES)이고 화면에 '예시 데이터'로 표시해요.
if (!needLogin()) throw new Error('login required');
// 화면 숨김은 편의일 뿐 — 실서비스는 RLS(app_metadata.role = 'admin')로 차단
if (!me().admin) { $('#denied').hidden = false; throw new Error('not admin'); }
$('#tabs').hidden = $('#list').hidden = false;

let q = 'ai';
const decisions = () => DB.get('decisions', {});
const countReasons = list => Object.entries(list.reduce((a, y) => { a[y.reason] = (a[y.reason] || 0) + 1; return a; }, {}));
function queue(name) {
  // 핀 신고: 문제없음 처리(reportOk = 확인한 신고 수) 뒤에 새 신고가 있는 핀만
  if (name === 'pin') return pins().filter(p => (p.reports?.length || 0) > (p.reportOk || 0)).sort((a, b) => b.reports.length - a.reports.length).map(p => ({ pin: p }));
  const rs = reviews(), d = decisions();
  // 판정 완료: 운영자가 처리한 리뷰 + 문제없음 처리한 핀(새 신고 없는 것). 여기서 판정을 바꿀 수 있어요.
  if (name === 'done') return [...rs.filter(r => d[r.id]).map(r => ({ review: r, done: d[r.id] })),
    ...pins().filter(p => p.reportOk && p.reports.length <= p.reportOk).map(p => ({ pin: p }))];
  if (name === 'report') return rs.filter(r => r.reports.length >= 3 && !d[r.id]).map(r => ({ review: r }));
  return AI_EXAMPLES.filter(x => x.queue === name && !d[x.review])
    .map(x => ({ ...x, review: rs.find(r => r.id === x.review) })).filter(x => x.review);
}
// 핀 신고: 운영자가 보고 지워요. 지우면 그 핀의 리뷰도 함께 지워져요.
function pinCard({ pin: p }) {
  return `<div class="review-card" data-pin="${p.id}">
    <div class="meta"><span><b>${esc(p.name)}</b> · ${esc(nickOf(p.author))} · ${fmtDate(p.created)}</span></div>
    <p class="quote">${esc(p.desc || '설명이 없어요.')}</p>
    <div class="report-line"><b>신고 ${p.reports.length}건</b> · <span>${countReasons(p.reports).map(([k, n]) => `${esc(k)} ${n}`).join(', ')}</span></div>
    <div class="decide"><a class="btn sm line" href="pin.html?id=${p.id}">핀 보기</a><button class="btn sm line" data-ok-pin>문제없음</button><button class="btn sm line danger-line" data-del-pin>핀 삭제</button></div>
  </div>`;
}
function card(x) {
  if (x.pin) return pinCard(x);
  const r = x.review, p = pinById(r.pin);
  const reasons = countReasons(r.reports);
  const ai = x.queue ? `<div class="ai-box">
      <div class="ai-head">AI 판정 <span class="example">예시 데이터</span>${x.confidence ? `<span class="score num">확신도 ${x.confidence.toFixed(2)}</span>` : '<span class="none">미판정</span>'}</div>
      ${x.confidence ? `<div class="conf"><i data-conf="${x.confidence}"></i></div>` : ''}
      <div class="ai-reason">${esc(x.reason)}</div></div>` : '';
  return `<div class="review-card" data-card="${r.id}">
    <div class="meta"><span><b>${esc(p?.name || '삭제된 핀')}</b> · ${esc(nickOf(r.by, r.nick))} · ${fmtDate(r.at)}</span>${x.done ? `<span class="tag">${{ label: '광고 라벨 붙임', ok: '문제없음', hide: '숨김(이전 처리)' }[x.done]}</span>` : r.hidden ? '<span class="tag">숨김 중</span>' : ''}</div>
    ${r.ad || r.adminLabel ? '<span class="ad-label">협찬·광고</span>' : ''}
    <p class="quote">${esc(r.body)}</p>${ai}
    ${reasons.length ? `<div class="report-line"><b>신고 ${r.reports.length}건</b> · <span>${reasons.map(([k, n]) => `${esc(k)} ${n}`).join(', ')}</span></div>` : ''}
    <div class="decide"><button class="btn sm" data-act="label">광고 라벨</button><button class="btn sm line" data-act="ok">문제없음</button><button class="btn sm line danger-line" data-del>삭제</button></div>
  </div>`;
}
function render() {
  $$('#tabs button').forEach(b => { b.classList.toggle('on', b.dataset.q === q); $('.n', b).textContent = queue(b.dataset.q).length; });
  $('#list').innerHTML = queue(q).map(card).join('')
    || `<div class="empty"><span class="ic">${icon('check')}</span><div class="t">${q === 'pin' ? '신고된 핀이 없어요' : '검토할 리뷰가 없어요'}</div><div class="s">새로 들어오면 여기에 보여요.</div></div>`;
  $$('[data-conf]').forEach(el => { el.style.width = `${el.dataset.conf * 100}%`; }); // 데이터 값이라 JS에서 지정
}
$('#tabs').onclick = e => { const b = e.target.closest('[data-q]'); if (b) { q = b.dataset.q; render(); } };
$('#list').onclick = async e => {
  if (e.target.closest('[data-ok-pin]')) {
    const id = e.target.closest('[data-pin]').dataset.pin, all = pins(), p = all.find(x => x.id === id), before = p.reportOk || 0;
    p.reportOk = p.reports.length;
    save('pins', all);
    render();
    return toast('문제없음으로 처리했어요', { label: '되돌리기', fn: () => { const a = pins(); a.find(x => x.id === id).reportOk = before; save('pins', a); render(); } });
  }
  if (e.target.closest('[data-del-pin]')) {
    const id = e.target.closest('[data-pin]').dataset.pin, p = pinById(id);
    if (!(await dialog({ title: `"${p.name}" 핀을 삭제할까요?`, body: `리뷰 ${pinReviews(id).length}개도 함께 지워지고 되돌릴 수 없어요.`, ok: '삭제', danger: true }))) return;
    save('pins', pins().filter(x => x.id !== id));
    save('reviews', reviews().filter(x => x.pin !== id));
    render();
    return toast('핀을 삭제했어요');
  }
  if (e.target.closest('[data-del]')) {
    const rid = e.target.closest('[data-card]').dataset.card;
    if (!(await dialog({ title: '이 리뷰를 삭제할까요?', body: '되돌릴 수 없어요.', ok: '삭제', danger: true }))) return;
    save('reviews', reviews().filter(x => x.id !== rid));
    render();
    return toast('리뷰를 삭제했어요');
  }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const rid = b.closest('[data-card]').dataset.card, act = b.dataset.act;
  const all = reviews(), r = all.find(x => x.id === rid), before = JSON.parse(JSON.stringify(r));
  if (act === 'label') { r.adminLabel = true; r.hidden = false; }
  if (act === 'ok') { r.hidden = false; r.reports = []; } // 문제없음 → 신고 숨김 해제
  save('reviews', all);
  const d = decisions(); d[rid] = act; DB.set('decisions', d);
  render();
  toast({ label: '광고 라벨을 붙였어요', ok: '문제없음으로 처리했어요' }[act], { label: '되돌리기', fn: () => {
    const a = reviews(); a[a.findIndex(x => x.id === rid)] = before; save('reviews', a);
    const d2 = decisions(); delete d2[rid]; DB.set('decisions', d2);
    render();
  } });
};
render();
