// 로그인 · 약관 동의 · 회원가입 · 이메일 인증. (다음 단계에서 Supabase Auth로 바꿔요)
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DB, save, userBy, users } from '../lib/store.js';
import { BackBtn, Icon, Screen, clean, openDoc, ui } from '../ui/kit.jsx';

function PwInput({ id, value, onChange, auto, placeholder = '비밀번호' }) {
  const [show, setShow] = useState(false);
  return <><input id={id} type={show ? 'text' : 'password'} autoComplete={auto} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    <button type="button" className="aside" onClick={() => setShow(!show)}>{show ? '숨기기' : '보기'}</button></>;
}

// 인증 메일 재발송: 60초 쿨다운
function ResendBtn({ cls }) {
  const [wait, setWait] = useState(0), t = useRef(null);
  useEffect(() => () => clearInterval(t.current), []);
  const click = () => {
    if (wait) return;
    ui.toast('인증 메일을 다시 보냈어요');
    setWait(60);
    t.current = setInterval(() => setWait(w => { if (w <= 1) clearInterval(t.current); return w - 1; }), 1000);
  };
  return <button type="button" className={cls} disabled={!!wait} onClick={click}>{wait ? `${wait}초 후 다시 보낼 수 있어요` : '인증 메일 다시 보내기'}</button>;
}

// ---------- 로그인: 성공하면 원래 화면(next)으로 ----------
export function Login() {
  const [sp] = useSearchParams(), nav = useNavigate();
  const next = sp.get('next') || '/home';
  const [email, setEmail] = useState(sp.get('email') || ''), [pw, setPw] = useState('');
  // shortcut: 로그인 검사는 나중에 붙여요(사용자 요청). 지금은 버튼을 누르면 로그인된 것으로 처리 —
  // 있는 계정 이메일이면 그 계정(admin@pinit.kr → 운영자), 아니면 데모 계정(demo@pinit.kr).
  // 원래 검사(비밀번호 확인, 미인증이면 안내 + 재발송)는 Supabase Auth로 바꿀 때 이 자리에 붙여요.
  const submit = e => {
    e.preventDefault();
    const u = userBy(email.trim().toLowerCase()) || userBy('demo@pinit.kr');
    if (!u.verified) save('users', users().map(x => (x.email === u.email ? { ...x, verified: true } : x)));
    DB.set('session', u.email);
    nav(next, { replace: true });
  };
  return <Screen title="로그인">
    <div className="top"><span className="brand">Pin it!</span><BackBtn to="/home" icon="close" label="닫기" /></div>
    <form className="body pad" noValidate onSubmit={submit}>
      <h1 className="h1 login-title">다시 만나서 반가워요</h1>
      <div className="field"><label htmlFor="email">이메일</label>
        <div className="control"><input id="email" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div></div>
      <div className="field"><label htmlFor="pw">비밀번호</label>
        <div className="control"><PwInput id="pw" value={pw} onChange={setPw} auto="current-password" /></div></div>
      <button className="btn submit" type="submit">로그인</button>
      <p className="switch-auth">아직 계정이 없나요? <Link className="text-link brand-link" to={'/terms?next=' + encodeURIComponent(next)}>회원가입</Link></p>
    </form>
  </Screen>;
}

// ---------- 약관 동의: 필수 4개를 모두 체크해야 다음 단계 ----------
const ITEMS = [
  ['age', true, '만 14세 이상이에요'],
  ['terms', true, '서비스 이용약관'],
  ['privacy', true, '개인정보 수집·이용', '이메일·닉네임 · 탈퇴하면 바로 삭제'],
  ['review', true, '리뷰 작성 원칙', '대가를 받은 리뷰는 협찬·광고를 꼭 체크해요'],
  ['location', false, '위치 정보 이용', '내 위치로 지도를 옮길 때만 써요 · 저장 안 함'],
];
export function Terms() {
  const [sp] = useSearchParams(), nav = useNavigate();
  const [st, setSt] = useState({});
  const all = ITEMS.every(([k]) => st[k]), okReq = ITEMS.every(([k, req]) => !req || st[k]);
  const next = () => {
    try { sessionStorage.setItem('pinit.consent', JSON.stringify({ location: !!st.location, at: Date.now() })); } catch { /* 저장 불가해도 다음 단계는 진행 */ }
    nav('/signup?' + sp.toString());
  };
  return <Screen title="회원가입">
    <div className="top"><BackBtn to="/login" /><span className="ttl">회원가입</span></div>
    <div className="body pad tight-top">
      <div className="steps"><i className="on" /><i /><i /></div>
      <div className="step-t">1 / 3 · 약관 동의</div>
      <h1 className="h1">Pin it! 이용을 위해<br />동의가 필요해요</h1>
      <button className={`check agree-all ${all ? 'on' : ''}`} onClick={() => setSt(Object.fromEntries(ITEMS.map(([k]) => [k, !all])))}>
        <span className="box"><Icon n="check" /></span><span className="fl"><b>전체 동의</b><span className="note">선택 항목을 포함해 모두 동의해요</span></span></button>
      <div className="agree-list">{ITEMS.map(([k, req, t, s]) => <div className="agree-row" key={k}>
        <button className={`check ${st[k] ? 'on' : ''}`} onClick={() => setSt({ ...st, [k]: !st[k] })}><span className="box"><Icon n="check" /></span>
          <span className="fl"><span className={req ? 'req' : 'opt'}>{req ? '필수' : '선택'}</span> {t}{s && <span className="note">{s}</span>}</span></button>
        <button className="icon-btn muted" aria-label={`${t} 보기`} onClick={() => openDoc(k)}><Icon n="chev" cls="sm" /></button></div>)}</div>
    </div>
    <div className="cta"><button className="btn" disabled={!okReq} onClick={next}>동의하고 계속하기</button></div>
  </Screen>;
}

// ---------- 회원가입 정보 입력: 입력하는 동안 바로 검사 ----------
const NICK = /^[가-힣a-zA-Z0-9_]{2,12}$/, MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function Signup() {
  const [sp] = useSearchParams(), nav = useNavigate();
  const [f, setF] = useState({ nick: '', email: '', pw: '', pw2: '' });
  let consent = null;
  try { consent = JSON.parse(sessionStorage.getItem('pinit.consent')); } catch { /* 없으면 약관부터 */ }
  useEffect(() => { if (!consent) nav('/terms?' + sp.toString(), { replace: true }); }, []);
  const set = k => v => setF({ ...f, [k]: v });
  const nick = f.nick.trim(), email = f.email.trim();
  const nOk = NICK.test(nick), eOk = MAIL.test(email), len = f.pw.length >= 8, mix = /[a-z]/i.test(f.pw) && /\d/.test(f.pw), match = !!f.pw2 && f.pw === f.pw2;
  const ok = nOk && eOk && len && mix && match;
  const submit = e => {
    e.preventDefault();
    if (!ok) return;
    const em = email.toLowerCase(), all = users();
    // 이미 가입된 이메일도 같은 다음 화면으로 → 계정 존재를 드러내지 않음 (PRD 5-5)
    if (!all.some(u => u.email === em)) save('users', [...all, { email: em, pw: f.pw, nick, verified: false, created: Date.now(), location: consent?.location }]);
    clean();
    nav('/verify?email=' + encodeURIComponent(em) + (sp.get('next') ? '&next=' + encodeURIComponent(sp.get('next')) : ''));
  };
  return <Screen guard title="회원가입">
    <div className="top"><BackBtn to="/terms" /><span className="ttl">회원가입</span></div>
    <form id="signup" className="body pad tight-top" noValidate onSubmit={submit}>
      <div className="steps"><i className="on" /><i className="on" /><i /></div>
      <div className="step-t">2 / 3 · 정보 입력</div>
      <h1 className="h1">사용할 정보를 입력해 주세요</h1>
      <div className="field"><label htmlFor="nick">닉네임</label>
        <div className={`control ${nick && !nOk ? 'bad' : ''}`}><input id="nick" maxLength={12} autoComplete="nickname" placeholder="2~12자" value={f.nick} onChange={e => set('nick')(e.target.value)} /><span className="aside num">{nick.length}/12</span></div>
        <div className={`hint ${nick ? (nOk ? 'good' : 'bad') : ''}`}>{nick ? (nOk ? '사용할 수 있어요' : '한글·영문·숫자·_ 2~12자로 입력해 주세요') : '리뷰와 공개 리스트에 이메일 대신 보여요.'}</div></div>
      <div className="field"><label htmlFor="email">이메일</label>
        <div className={`control ${email && !eOk ? 'bad' : ''}`}><input id="email" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" value={f.email} onChange={e => set('email')(e.target.value)} /></div>
        <div className={`hint ${email && !eOk ? 'bad' : ''}`}>{email && !eOk ? '이메일 형식을 확인해 주세요' : '가입 후 이 주소로 인증 메일을 보내요.'}</div></div>
      <div className="field"><label htmlFor="pw">비밀번호</label>
        <div className="control"><PwInput id="pw" value={f.pw} onChange={set('pw')} auto="new-password" /></div>
        <div className="rules"><span className={len ? 'ok' : ''}><Icon n="check" cls="xs" />8자 이상</span><span className={mix ? 'ok' : ''}><Icon n="check" cls="xs" />영문·숫자 포함</span></div></div>
      <div className="field"><label htmlFor="pw2">비밀번호 확인</label>
        <div className={`control ${f.pw2 && !match ? 'bad' : ''}`}><PwInput id="pw2" value={f.pw2} onChange={set('pw2')} auto="new-password" placeholder="한 번 더 입력" /></div>
        <div className={`hint ${f.pw2 ? (match ? 'good' : 'bad') : ''}`}>{f.pw2 ? (match ? '비밀번호가 일치해요' : '비밀번호가 일치하지 않아요') : ''}</div></div>
    </form>
    <div className="cta"><button className="btn" form="signup" type="submit" disabled={!ok}>가입하기</button></div>
  </Screen>;
}

// ---------- 이메일 인증 안내: 시연 환경에는 메일함이 없어서 "인증 완료" 버튼이 링크 클릭을 대신해요 ----------
export function Verify() {
  const [sp] = useSearchParams(), nav = useNavigate(), email = sp.get('email') || '';
  const change = () => {
    const u = userBy(email);
    if (u && !u.verified) save('users', users().filter(x => x.email !== email)); // 인증 전 계정만 정리
    nav('/signup');
  };
  const done = () => {
    save('users', users().map(x => (x.email === email ? { ...x, verified: true } : x)));
    const next = sp.get('next');
    nav('/login?email=' + encodeURIComponent(email) + (next ? '&next=' + encodeURIComponent(next) : '') + '&toast=' + encodeURIComponent('이메일 인증이 끝났어요. 로그인해 주세요'));
  };
  return <Screen title="이메일 인증">
    <div className="top"><BackBtn to="/signup" /><span className="ttl">회원가입</span></div>
    <div className="body pad tight-top">
      <div className="steps"><i className="on" /><i className="on" /><i className="on" /></div>
      <div className="step-t">3 / 3 · 이메일 인증</div>
      <h1 className="h1">메일함에서 인증 링크를<br />눌러 주세요</h1>
      <div className="notice info mail-card"><span className="thumb tint md"><Icon n="mail" /></span>
        <div className="fl"><b className="ell">{email}</b><div className="s">으로 인증 메일을 보냈어요</div></div></div>
      <ul className="tips"><li>메일이 보이지 않으면 스팸함을 확인해 주세요.</li><li>인증 링크는 24시간 동안 쓸 수 있어요.</li></ul>
      <div className="grow" />
      <ResendBtn cls="btn sec" />
      <button className="text-link center" onClick={change}>이메일 주소 바꾸기</button>
    </div>
    <div className="cta"><button className="btn" onClick={done}>인증 완료하고 로그인하기</button></div>
  </Screen>;
}
