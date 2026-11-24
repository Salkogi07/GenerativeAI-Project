// 이의 제기 (운영자 전용): 처리 알림을 받은 작성자가 보낸 이의 제기를 받아들이거나 거절해요.
// 받아들이면 지운 리뷰를 휴지통에서 바로 되살려요. 답변은 작성자 알림 화면에 보여요.
if (!needLogin()) throw new Error('login required');
if (!me().admin) { go('admin.html'); throw new Error('not admin'); }
let q = 'open';
const noticeOf = a => notices().find(n => n.id === a.notice);
const inTab = (a, k) => (k === 'open') === (a.status === 'open');

function card(a) {
  const n = noticeOf(a), nos = n.reports.map(id => reportNo('review', id)).join(' · ');
  return `<div class="review-card" data-a="${a.id}">
    <div class="meta"><span><b>${n.kind === 'review_deleted' ? '삭제된 리뷰' : '숨긴 리뷰'}</b> · ${esc(nickOf(a.user))} · ${esc(n.pinName || '삭제된 핀')}</span><span>${fmtDate(a.at)}</span></div>
    <p class="quote">${esc(n.body)}</p>
    ${n.photos.length ? `<div class="photos">${n.photos.map(p => photoHTML(p, '처리된 리뷰 사진')).join('')}</div>` : ''}
    <div class="report-line"><b>신고 번호</b> <span class="report-nos num">${nos}</span> · <span>${esc([...new Set(n.reasons)].join(', '))}</span></div>
    <div class="appeal-box"><b>이의 제기</b><p class="appeal-mine">${esc(a.body)}</p>${a.reply ? `<p class="appeal-reply">답변: ${esc(a.reply)}</p>` : ''}</div>
    ${a.status === 'open' ? `<div class="decide"><button class="btn sm" data-ok="1">${n.kind === 'review_deleted' ? '받아들이고 되살리기' : '받아들이기'}</button><button class="btn sm line" data-ok="0">거절</button></div>`
      : `<p class="footnote">${a.status === 'accepted' ? '받아들였어요' : '거절했어요'} · ${fmtDate(a.done)}</p>`}
  </div>`;
}
function render() {
  $$('#tabs button').forEach(b => { b.classList.toggle('on', b.dataset.q === q); $('.n', b).textContent = appeals().filter(a => inTab(a, b.dataset.q)).length; });
  $('#list').innerHTML = appeals().filter(a => inTab(a, q) && noticeOf(a)).map(card).join('')
    || `<div class="empty"><span class="ic">${icon('check')}</span><div class="t">${q === 'open' ? '기다리는 이의 제기가 없어요' : '처리한 이의 제기가 없어요'}</div></div>`;
}
$('#tabs').onclick = e => { const b = e.target.closest('[data-q]'); if (b) { q = b.dataset.q; render(); } };
$('#list').onclick = async e => {
  const b = e.target.closest('[data-ok]');
  if (!b) return;
  const ok = b.dataset.ok === '1', id = Number(b.closest('[data-a]').dataset.a), a = appeals().find(x => x.id === id), n = noticeOf(a);
  const reply = await dialog({ title: ok ? '이의 제기를 받아들일까요?' : '이의 제기를 거절할까요?',
    body: (ok ? '휴지통에서 리뷰를 바로 되살려요(숨김 없이 원래 자리로). ' : '') + '작성자에게 보일 답변을 적어 주세요(선택).',
    ok: ok ? '되살리기' : '거절하기', input: { max: 500, placeholder: '답변 (선택)' } });
  if (reply === null) return;
  if (ok) {
    const t = trash().find(x => x.kind === 'review' && x.data.id === n.review);
    const err = t ? restoreTrash(t.id) : '휴지통에 없는 리뷰예요. 7일이 지나 완전히 지워졌을 수 있어요';
    if (err) return toast(err);
  }
  DB.set('appeals', appeals().map(x => x.id === id ? { ...x, status: ok ? 'accepted' : 'rejected', reply, done: Date.now() } : x));
  render();
  toast(ok ? '받아들이고 리뷰를 되살렸어요' : '거절했어요');
};
render();
