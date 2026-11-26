// 로그인·가입 화면 공통: 비밀번호 보기 토글.
$$('[data-reveal]').forEach(b => b.onclick = () => {
  const i = $('#' + b.dataset.reveal);
  i.type = i.type === 'password' ? 'text' : 'password';
  b.textContent = i.type === 'password' ? '보기' : '숨기기';
});

