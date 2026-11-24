// 이메일 인증 안내. 시연 환경에는 실제 메일함이 없어서 "인증 완료" 버튼이 인증 링크 클릭을 대신해요.
const email = qs.get('email') || '';
$('#mail').textContent = email;
resendButton($('#resend'));

$('#change').onclick = () => {
  const all = users(), u = all.find(x => x.email === email);
  if (u && !u.verified) save('users', all.filter(x => x !== u)); // 인증 전 계정만 정리
  go('signup.html');
};
$('#done').onclick = () => {
  const all = users(), u = all.find(x => x.email === email);
  if (u) { u.verified = true; save('users', all); }
  const next = qs.get('next');
  go('login.html?email=' + encodeURIComponent(email) + (next ? '&next=' + encodeURIComponent(next) : '')
    + '&toast=' + encodeURIComponent('이메일 인증이 끝났어요. 로그인해 주세요'));
};
