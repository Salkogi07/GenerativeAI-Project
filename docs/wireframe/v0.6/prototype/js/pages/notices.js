// 알림: 신고된 내 리뷰를 운영자가 지우면 여기에 와요(실서비스: 서버 트리거가 notices에 써요).
// 무엇이 처리됐는지(본문·사진), 신고 번호·이유를 보여 주고, 알림마다 한 번 이의 제기를 할 수 있어요.
if (!needLogin()) throw new Error('login required');
const u = me();
const KIND = { review_hidden: '리뷰가 숨겨졌어요', review_deleted: '리뷰가 삭제됐어요' };
const STATUS = { open: '운영자가 확인하고 있어요', accepted: '이의 제기가 받아들여졌어요', rejected: '이의 제기가 받아들여지지 않았어요' };
const mine = () => notices().filter(n => n.user === u.email);
const nosOf = n => n.reports.map(id => reportNo('review', id)).join(', ');

function card(n) {
  const a = appeals().find(x => x.notice === n.id), why = [...new Set(n.reasons)].join(', ');
  return `<div class="review-card notice-card" data-n="${n.id}">
    <div class="meta"><span><b>${KIND[n.kind]}</b></span><span>${fmtDate(n.at)}</span></div>
    <p class="notice-where">${icon('pin', 'xs')}${esc(n.pinName || '삭제된 핀')}</p>
    <p class="quote">${esc(n.body)}</p>
    ${n.photos.length ? `<div class="photos">${n.photos.map(p => photoHTML(p, '처리된 리뷰 사진')).join('')}</div>` : ''}
    <div class="report-line"><b>신고 번호 <span class="num">${nosOf(n)}</span></b>${why ? ` · <span>${esc(why)}</span>` : ''}</div>
    ${a ? `<div class="appeal-box ${a.status}"><b>${STATUS[a.status]}</b><p class="appeal-mine">내 이의 제기: ${esc(a.body)}</p>${a.reply ? `<p class="appeal-reply">운영자 답변: ${esc(a.reply)}</p>` : ''}</div>`
      : `<p class="footnote notice-help">잘못 처리됐다고 생각하면 이의 제기를 해 주세요. 신고 번호(${nosOf(n)})가 함께 운영자에게 전달돼요.</p>
        <div class="decide"><button class="btn sm line" data-appeal>이의 제기하기</button></div>`}
  </div>`;
}
function render() {
  $('#list').innerHTML = mine().map(card).join('')
    || `<div class="empty"><span class="ic">${icon('mail')}</span><div class="t">새 알림이 없어요</div><div class="s">신고된 내 리뷰를 운영자가 처리하면 여기에 알려 드려요.</div></div>`;
}
// 열어 보면 읽음으로 표시해요 (마이페이지 빨간 숫자가 사라져요)
DB.set('notices', notices().map(n => n.user === u.email ? { ...n, read: true } : n));
$('#list').onclick = e => {
  if (!e.target.closest('[data-appeal]')) return;
  const n = mine().find(x => x.id === Number(e.target.closest('[data-n]').dataset.n));
  sheet(`<h3>이의 제기</h3><p class="lead">신고 번호 <b class="num">${nosOf(n)}</b>에 대한 이의 제기예요. 운영자가 확인하고 답변해요.</p>
    <div class="control area"><textarea data-body rows="5" maxlength="1000" placeholder="왜 문제가 없는지 적어 주세요. 예: 직접 돈을 내고 다녀왔어요." aria-label="이의 제기 내용"></textarea></div>
    <div class="count num" data-count>0 / 1000</div>
    <div class="acts"><button class="btn sec fixed-w" data-close>취소</button><button class="btn" data-send disabled>보내기</button></div>`, (w, close) => {
    const t = $('[data-body]', w);
    t.focus();
    t.oninput = () => { $('[data-count]', w).textContent = `${t.value.length} / 1000`; $('[data-send]', w).disabled = !t.value.trim(); };
    $('[data-send]', w).onclick = () => {
      DB.set('appeals', [{ id: nextSeq('appealSeq'), notice: n.id, user: u.email, body: t.value.trim(), status: 'open', reply: '', at: Date.now() }, ...appeals()]);
      close();
      render();
      toast('이의 제기를 보냈어요. 운영자가 확인하면 여기에 답변이 와요');
    };
  });
};
render();
