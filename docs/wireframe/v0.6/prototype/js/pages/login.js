// 로그인: 성공하면 원래 화면(next)으로.
const next = qs.get('next') || 'home.html';
$('#toSignup').href = 'terms.html?next=' + encodeURIComponent(next);
$('#email').value = qs.get('email') || '';

// shortcut: 로그인 검사는 나중에 붙여요. 지금은 버튼을 누르면 로그인된 것으로 처리 —
// 있는 계정 이메일이면 그 계정(admin@pinit.kr → 운영자), 아니면 데모 계정(demo@pinit.kr).
// 원래 검사(비밀번호 확인, 미인증이면 #unverified 안내 + 재발송)는 이 자리에서 다시 살리면 돼요.
$('#f').onsubmit = e => {
  e.preventDefault();
  const email = $('#email').value.trim().toLowerCase();
  const u = userBy(email) || userBy('demo@pinit.kr');
  if (!u.verified) { u.verified = true; save('users', users().map(x => (x.email === u.email ? u : x))); }
  DB.set('session', u.email);
  go(next);
};
resendButton($('#resend'));
