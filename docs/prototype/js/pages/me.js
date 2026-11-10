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
