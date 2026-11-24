// 리뷰 검토 (운영자 전용): AI 의심·핀 신고·리뷰 신고 대기열과 판정 완료 목록. 광고 라벨/문제없음/삭제 + 되돌리기.
// 신고 번호(R-12 리뷰, P-3 핀)로 검색하면 지금 있는 리뷰·핀과 휴지통에서 찾아요.
// AI 판정은 고정 예시 데이터(AI_EXAMPLES, '예시 데이터' 표시). 키워드 판정은 리뷰 본문에서 바로 계산해요.
if (!needLogin()) throw new Error('login required');
// 화면 숨김은 편의일 뿐 — 실서비스는 RLS(app_metadata.role = 'admin')로 차단
if (!me().admin) { $('#denied').hidden = false; throw new Error('not admin'); }
$('#tabs').hidden = $('#list').hidden = $('#find').hidden = false;

let q = 'ai';
const decisions = () => DB.get('decisions', {});
const countReasons = list => Object.entries(list.reduce((a, y) => { a[y.reason] = (a[y.reason] || 0) + 1; return a; }, {}));
const nos = (kind, list) => `<span class="report-nos num">${list.map(y => reportNo(kind, y.id)).join(' · ')}</span>`;
const pinOpen = p => (p.reports?.length || 0) > (p.reportOk || 0);
function queue(name) {
  // 핀 신고: 문제없음·광고 라벨 처리(reportOk = 확인한 신고 수) 뒤에 새 신고가 있는 핀만
  if (name === 'pin') return pins().filter(pinOpen).sort((a, b) => b.reports.length - a.reports.length).map(p => ({ pin: p }));
  const rs = reviews(), d = decisions();
  // 판정 완료: 운영자가 처리한 리뷰 + 처리한 핀(새 신고 없는 것). 여기서 판정을 바꿀 수 있어요.
  if (name === 'done') return [...rs.filter(r => d[r.id]).map(r => ({ review: r, done: d[r.id] })),
    ...pins().filter(p => p.reportOk && !pinOpen(p)).map(p => ({ pin: p }))];
  if (name === 'report') return rs.filter(r => r.reports.length && !d[r.id]).sort((a, b) => b.reports.length - a.reports.length).map(r => ({ review: r }));
  // AI 의심: 예시 AI 판정 + 키워드 판정
  const ai = AI_EXAMPLES.filter(x => x.queue === 'ai' && !d[x.review]).map(x => ({ ...x, review: rs.find(r => r.id === x.review) })).filter(x => x.review);
  const kw = rs.filter(r => !d[r.id] && !ai.some(x => x.review.id === r.id)).map(r => ({ queue: 'ai', source: 'keyword', ...keywordCheck(r), review: r }))
    .filter(x => x.reason);
  return [...ai, ...kw];
}
// 신고 번호 검색: "R-12"는 리뷰 신고, "P-3"은 핀 신고, 숫자만 쓰면 둘 다 찾아요.
function findReport(text) {
  const m = text.trim().toUpperCase().match(/^([RP])?\s*-?\s*(\d+)$/);
  if (!m) return null;
  const k = m[1], id = Number(m[2]), d = decisions();
  return [
    ...(k === 'P' ? [] : reviews().filter(r => r.reports.some(y => y.id === id)).map(r => ({ review: r, done: d[r.id] }))),
    ...(k === 'R' ? [] : pins().filter(p => p.reports?.some(y => y.id === id)).map(p => ({ pin: p }))),
    ...trash().filter(t => t.reports.includes(id) && (!k || t.kind === (k === 'P' ? 'pin' : 'review'))).map(t => ({ trash: t })),
  ];
}

function pinCard({ pin: p }) {
  const open = pinOpen(p);
  return `<div class="review-card" data-pin="${p.id}">
    <div class="meta"><span><b>${esc(p.name)}</b> · ${esc(nickOf(p.author))} · ${fmtDate(p.created)}</span>
      <span class="meta-end">${open ? '' : `<span class="tag">${p.adminLabel ? '광고 라벨 붙임' : '문제없음'}</span>`}<a class="see-pin" href="pin.html?id=${p.id}">핀 보기${icon('chev', 'xs')}</a></span></div>
    ${p.adminLabel ? '<span class="ad-label">협찬·광고</span>' : ''}
    <p class="quote">${esc(p.desc || '설명이 없어요.')}</p>
    <div class="report-line"><b>신고 ${p.reports.length}건</b> · <span>${countReasons(p.reports).map(([k, n]) => `${esc(k)} ${n}`).join(', ')}</span>${nos('pin', p.reports)}</div>
    <div class="decide"><button class="btn sm" data-pin-act="label">광고 라벨</button><button class="btn sm line" data-pin-act="ok">문제없음</button><button class="btn sm line danger-line" data-del-pin>삭제</button></div>
  </div>`;
}
function card(x) {
  if (x.pin) return pinCard(x);
  if (x.trash) return trashCard(x.trash);
  const r = x.review, p = pinById(r.pin);
  const reasons = countReasons(r.reports);
  const ai = x.queue ? `<div class="ai-box">
      <div class="ai-head">${x.source === 'keyword' ? '키워드 판정' : 'AI 판정 <span class="example">예시 데이터</span>'}${x.confidence ? `<span class="score num">확신도 ${x.confidence.toFixed(2)}</span>` : '<span class="none">미판정</span>'}</div>
      ${x.confidence ? `<div class="conf"><i data-conf="${x.confidence}"></i></div>` : ''}
      <div class="ai-reason">${esc(x.reason)}</div></div>` : '';
  return `<div class="review-card" data-card="${r.id}">
    <div class="meta"><span><b>${esc(p?.name || '삭제된 핀')}</b> · ${esc(nickOf(r.by, r.nick))} · ${fmtDate(r.at)}</span>
      <span class="meta-end">${x.done ? `<span class="tag">${{ label: '광고 라벨 붙임', ok: '문제없음', hide: '숨김(이전 처리)' }[x.done]}</span>` : r.hidden ? '<span class="tag">숨김 중</span>' : ''}${p ? `<a class="see-pin" href="pin.html?id=${p.id}#rv-${r.id}">핀 보기${icon('chev', 'xs')}</a>` : ''}</span></div>
    ${r.ad || r.adminLabel ? '<span class="ad-label">협찬·광고</span>' : ''}
    <p class="quote">${esc(r.body)}</p>${ai}
    ${reasons.length ? `<div class="report-line"><b>신고 ${r.reports.length}건</b> · <span>${reasons.map(([k, n]) => `${esc(k)} ${n}`).join(', ')}</span>${nos('review', r.reports)}</div>` : ''}
    <div class="decide"><button class="btn sm" data-act="label">광고 라벨</button><button class="btn sm line" data-act="ok">문제없음</button><button class="btn sm line danger-line" data-del>삭제</button></div>
  </div>`;
}
function render() {
  const text = $('#findQ').value.trim();
  $('#tabs').hidden = !!text;
  $$('#tabs button').forEach(b => { b.classList.toggle('on', b.dataset.q === q); $('.n', b).textContent = queue(b.dataset.q).length; });
  if (text) {
    const found = findReport(text);
    $('#list').innerHTML = found === null ? '<p class="footnote">R-12처럼 신고 번호를 적어 주세요. 숫자만 쓰면 리뷰·핀 신고를 모두 찾아요.</p>'
      : found.map(card).join('') || `<div class="empty"><span class="ic">${icon('search')}</span><div class="t">"${esc(text)}" 신고를 찾지 못했어요</div><div class="s">휴지통에서 7일이 지나 완전히 지워졌을 수 있어요.</div></div>`;
  } else {
    $('#list').innerHTML = queue(q).map(card).join('')
      || `<div class="empty"><span class="ic">${icon('check')}</span><div class="t">${{ pin: '신고된 핀이 없어요', done: '아직 판정한 게 없어요' }[q] || '검토할 리뷰가 없어요'}</div><div class="s">새로 들어오면 여기에 보여요.</div></div>`;
  }
  $$('[data-conf]').forEach(el => { el.style.width = `${el.dataset.conf * 100}%`; }); // 데이터 값이라 JS에서 지정
}
$('#findQ').oninput = render;
$('#tabs').onclick = e => { const b = e.target.closest('[data-q]'); if (b) { q = b.dataset.q; render(); } };
$('#list').onclick = async e => {
  if (await trashClick(e)) return render();
  // 핀 처리: 광고 라벨 · 문제없음. 둘 다 지금까지 들어온 신고를 처리한 것으로 봐요(reportOk).
  const pa = e.target.closest('[data-pin-act]');
  if (pa) {
    const id = pa.closest('[data-pin]').dataset.pin, act = pa.dataset.pinAct, all = pins(), p = all.find(x => x.id === id);
    const before = { reportOk: p.reportOk || 0, adminLabel: !!p.adminLabel };
    Object.assign(p, { reportOk: p.reports?.length || 0, adminLabel: act === 'label' });
    save('pins', all);
    render();
    return toast(act === 'label' ? '광고 라벨을 붙였어요' : '문제없음으로 처리했어요', { label: '되돌리기', fn: () => { const a = pins(); Object.assign(a.find(x => x.id === id), before); save('pins', a); render(); } });
  }
  if (e.target.closest('[data-del-pin]')) {
    const id = e.target.closest('[data-pin]').dataset.pin, p = pinById(id);
    if (!(await dialog({ title: `"${p.name}" 핀을 삭제할까요?`, body: `리뷰 ${pinReviews(id).length}개도 함께 지워져요. 휴지통에 7일 동안 보관돼요.`, ok: '삭제', danger: true }))) return;
    removePin(id);
    render();
    return toast('핀을 삭제했어요');
  }
  if (e.target.closest('[data-del]')) {
    const rid = e.target.closest('[data-card]').dataset.card, r = reviews().find(x => x.id === rid);
    if (!(await dialog({ title: '이 리뷰를 삭제할까요?', body: '휴지통에 7일 동안 보관돼요.' + (r.reports.length ? ' 신고된 리뷰라 작성자에게 알림이 가요.' : ''), ok: '삭제', danger: true }))) return;
    removeReview(rid);
    render();
    return toast('리뷰를 삭제했어요');
  }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const rid = b.closest('[data-card]').dataset.card, act = b.dataset.act;
  const all = reviews(), r = all.find(x => x.id === rid), before = JSON.parse(JSON.stringify(r));
  if (act === 'label') { r.adminLabel = true; r.hidden = false; }
  if (act === 'ok') r.hidden = false; // 문제없음 → 신고 숨김 해제 (신고 기록·번호는 남겨요)
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
