// 로그인·가입 화면 공통: 비밀번호 보기 토글, 인증 메일 재발송 쿨다운.
$$('[data-reveal]').forEach(b => b.onclick = () => {
  const i = $('#' + b.dataset.reveal);
  i.type = i.type === 'password' ? 'text' : 'password';
  b.textContent = i.type === 'password' ? '보기' : '숨기기';
});

function resendButton(btn) {
  let wait = 0;
  btn.onclick = () => {
    if (wait) return;
    toast('인증 메일을 다시 보냈어요');
    wait = 60; btn.disabled = true;
    const t = setInterval(() => {
      btn.textContent = `${--wait}초 후 다시 보낼 수 있어요`;
      if (!wait) { clearInterval(t); btn.disabled = false; btn.textContent = '인증 메일 다시 보내기'; }
    }, 1000);
  };
}
