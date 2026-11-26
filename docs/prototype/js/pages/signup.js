// 회원가입 정보 입력: 닉네임·이메일·비밀번호 규칙·비밀번호 확인을 입력하는 동안 바로 검사.
let consent = null;
try { consent = JSON.parse(sessionStorage.getItem('pinit.consent')); } catch { /* 없으면 약관부터 */ }
if (!consent) go('terms.html' + location.search);

const NICK = /^[가-힣a-zA-Z0-9_]{2,12}$/, MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hint = (el, msg, cls = '') => { el.textContent = msg; el.className = 'hint ' + cls; };

function check() {
  const nick = $('#nick').value.trim(), email = $('#email').value.trim(), pw = $('#pw').value, pw2 = $('#pw2').value;
  const nOk = NICK.test(nick), eOk = MAIL.test(email), len = pw.length >= 8, mix = /[a-z]/i.test(pw) && /\d/.test(pw), match = !!pw2 && pw === pw2;
  $('#nickCount').textContent = `${nick.length}/12`;
  if (nick) hint($('#hNick'), nOk ? '사용할 수 있어요' : '한글·영문·숫자·_ 2~12자로 입력해 주세요', nOk ? 'good' : 'bad');
  else hint($('#hNick'), '리뷰와 공개 리스트에 이메일 대신 보여요.');
  $('#cNick').classList.toggle('bad', !!nick && !nOk);
  if (email) hint($('#hEmail'), eOk ? '로그인할 때 써요.' : '이메일 형식을 확인해 주세요', eOk ? '' : 'bad');
  $('#cEmail').classList.toggle('bad', !!email && !eOk);
  $('#rLen').classList.toggle('ok', len);
  $('#rMix').classList.toggle('ok', mix);
  if (pw2) hint($('#hPw2'), match ? '비밀번호가 일치해요' : '비밀번호가 일치하지 않아요', match ? 'good' : 'bad');
  else hint($('#hPw2'), '');
  $('#cPw2').classList.toggle('bad', !!pw2 && !match);
  $('#submit').disabled = !(nOk && eOk && len && mix && match);
}
$('#f').addEventListener('input', check);

$('#f').onsubmit = e => {
  e.preventDefault();
  check();
  if ($('#submit').disabled) return;
  const email = $('#email').value.trim().toLowerCase(), all = users();
  clean();
  // 이미 가입된 이메일이면 로그인 화면으로
  if (all.some(u => u.email === email)) return go('login.html?email=' + encodeURIComponent(email) + (qs.get('next') ? '&next=' + encodeURIComponent(qs.get('next')) : '') + '&toast=' + encodeURIComponent('이미 가입된 이메일이면 로그인해 주세요'));
  // 이메일 인증 없이 바로 로그인
  all.push({ email, pw: $('#pw').value, nick: $('#nick').value.trim(), created: Date.now(), location: consent.location });
  save('users', all);
  DB.set('session', email);
  const next = qs.get('next') || 'home.html';
  go(next + (next.includes('?') ? '&' : '?') + 'toast=' + encodeURIComponent('가입을 환영해요!'));
};
