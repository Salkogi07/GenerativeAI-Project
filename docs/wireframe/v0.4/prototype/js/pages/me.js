// 마이페이지: 프로필·활동 수, 신규 계정 리뷰 제한, 닉네임 수정, 위치 정보 이용, 약관, 로그아웃·탈퇴.
let u = me();
function render() {
  u = me();
  if (!u) { $('#guest').hidden = false; $('#member').hidden = true; return; }
  $('#member').hidden = false;
  $('#av').textContent = u.nick[0].toUpperCase();
  $('#nick').textContent = u.nick;
  $('#email').textContent = `${u.email} · 인증 완료`;
  const j = new Date(u.created);
  $('#joined').textContent = `${j.getFullYear()}.${j.getMonth() + 1}.${j.getDate()} 가입`;
  $('#sPins').textContent = pins().filter(p => p.author === u.email).length;
  $('#sReviews').textContent = reviews().filter(r => r.by === u.email).length;
  $('#sLists').textContent = lists().filter(l => l.owner === u.email).length;
  $('#limit').hidden = !isNew(u);
  if (isNew(u)) {
    const free = new Date(u.created + 7 * DAY);
    $('#limitS').textContent = `오늘 ${todayCount(u)} / 3 · ${free.getMonth() + 1}월 ${free.getDate()}일부터 제한이 풀려요`;
  }
  $('#loc').classList.toggle('on', u.location !== false);
  $('#locRow').setAttribute('aria-checked', u.location !== false);
  $('#admin').hidden = !u.admin; // 메뉴 숨김은 편의, 실제 차단은 RLS
}
const updateMe = fn => { const all = users(), x = all.find(y => y.email === u.email); fn(x); save('users', all); render(); };

$('#editNick').onclick = async () => {
  const v = await dialog({ title: '닉네임 수정', body: '리뷰와 공개 리스트에 보이는 이름이에요.', ok: '저장',
    input: { value: u.nick, max: 12, validate: x => (/^[가-힣a-zA-Z0-9_]{2,12}$/.test(x) ? '' : '한글·영문·숫자·_ 2~12자로 입력해 주세요') } });
  if (v) { updateMe(x => { x.nick = v; }); toast('닉네임을 바꿨어요'); }
};
$('#pw').onclick = async () => {
  if (await dialog({ title: '비밀번호를 바꿀까요?', body: `${u.email}로 비밀번호 변경 링크를 보내 드려요.`, ok: '메일 보내기' })) toast('비밀번호 변경 메일을 보냈어요');
};
$('#locRow').onclick = () => {
  updateMe(x => { x.location = x.location === false; });
  toast(me().location === false ? '위치 정보 이용을 껐어요' : '위치 정보 이용을 켰어요');
};
// 활동 칸을 누르면 페이지 이동 대신 아래로 최근 3개를 펼쳐요. 다시 누르면 접혀요.
const tiles = $$('.stats>a');
const panel = {
  pin: () => {
    const a = pins().filter(p => p.author === u.email).sort((x, y) => y.created - x.created);
    return [a.length, '아직 찍은 핀이 없어요', a.slice(0, 3).map(p => `<a class="row" href="pin.html?id=${p.id}">
      ${p.photos?.length ? photoHTML(p.photos[0], `${p.name} 사진`, 'thumb') : `<span class="thumb tint">${icon('pin')}</span>`}
      <span class="fl"><span class="t ell">${esc(p.name)}</span><span class="s">${esc(pinKind(p))} · 리뷰 ${visibleCount(p.id)} · ${ago(p.created)}</span></span></a>`)];
  },
  review: () => {
    const a = reviews().filter(r => r.by === u.email).sort((x, y) => y.at - x.at);
    return [a.length, '아직 쓴 리뷰가 없어요', a.slice(0, 3).map(reviewLinkHTML)];
  },
  list: () => {
    const a = lists().filter(l => l.owner === u.email).sort((x, y) => y.updated - x.updated);
    return [a.length, '아직 만든 리스트가 없어요', a.slice(0, 3).map(l => `<a class="row" href="list.html?id=${l.id}">
      <span class="thumb ${l.public ? 'tint' : ''}">${icon(l.public ? 'globe' : 'lock')}</span>
      <span class="fl"><span class="t ell">${esc(l.name)}</span><span class="s">핀 ${l.pins.length} · ${l.public ? '공개' : '비공개'}</span></span></a>`)];
  },
};
const kinds = ['pin', 'review', 'list'];
tiles.forEach((t, i) => {
  t.onclick = e => {
    e.preventDefault();
    const open = !t.classList.contains('on');
    tiles.forEach(x => x.classList.toggle('on', x === t && open));
    $('#statPanel').hidden = !open;
    if (!open) return;
    const [n, emptyMsg, rows] = panel[kinds[i]]();
    $('#statPanel').innerHTML = (n ? rows.join('') : `<div class="sp-empty">${emptyMsg}</div>`)
      + `<a class="sp-all" href="${t.getAttribute('href')}">${n > 3 ? `전체 ${n}개 보기` : '전체 보기'}${icon('chev', 'xs')}</a>`;
  };
});
$$('[data-doc]').forEach(b => { b.onclick = () => openDoc(b.dataset.doc); });
$('#logout').onclick = async () => {
  if (!(await dialog({ title: '로그아웃할까요?', ok: '로그아웃' }))) return;
  DB.set('session', null);
  go('login.html');
};
$('#leave').onclick = async () => {
  if (!(await dialog({ title: '정말 탈퇴할까요?', body: '이메일·닉네임과 내 리스트가 바로 삭제되고 되돌릴 수 없어요.', ok: '탈퇴하기', danger: true }))) return;
  save('lists', lists().filter(l => l.owner !== u.email));
  save('users', users().filter(x => x.email !== u.email));
  DB.set('session', null);
  go('login.html');
};
render();
