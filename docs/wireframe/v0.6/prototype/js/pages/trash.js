// 휴지통 (운영자 전용): 지운 리뷰·핀을 7일 동안 보관해요. 되살리면 원래 자리로 돌아가요.
if (!needLogin()) throw new Error('login required');
if (!me().admin) { go('admin.html'); throw new Error('not admin'); }

function render() {
  const list = trash();
  $('#list').innerHTML = '<p class="footnote">지운 리뷰·핀을 7일 동안 보관해요. 7일이 지나면 완전히 지워져요.</p>'
    + (list.map(trashCard).join('') || `<div class="empty"><span class="ic">${icon('trash')}</span><div class="t">휴지통이 비어 있어요</div><a class="btn fit" href="admin.html">리뷰 검토로 가기</a></div>`);
}
$('#list').onclick = async e => { if (await trashClick(e)) render(); };
render();
