// 공통 UI: 아이콘, 화면 틀(탭 바·뒤로 가기·작성 중 확인), 토스트·대화상자·바텀시트, 사진, 리뷰 카드, 약관 문서.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ago, fmtDate, me, nickOf, pinById, pinKind } from '../lib/store.js';

// ---------- 아이콘 ----------
const ICONS = {
  back: '<path d="M15 18l-6-6 6-6"/>', close: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.2-6 8-6s6.8 2 8 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12.5 10 17l9-10"/>',
  locate: '<circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  lock: '<rect x="4.5" y="11" width="15" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  chev: '<path d="m9 18 6-6-6-6"/>', pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  feed: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.5 4.5-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
};
export const iconSvg = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
export const Icon = ({ n, cls = '' }) => <svg className={`i ${cls}`} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[n] || '' }} />;

// ---------- 토스트·대화상자·시트 (화면 위에 하나씩) ----------
let overlay = { toast: null, dialog: null, sheets: [] };
const osubs = new Set();
const setOverlay = patch => { overlay = { ...overlay, ...patch }; osubs.forEach(f => f()); };
let toastTimer;
export const ui = {
  toast(msg, action) {
    clearTimeout(toastTimer);
    setOverlay({ toast: { msg, action, key: Date.now() } });
    toastTimer = setTimeout(() => setOverlay({ toast: null }), action ? 5000 : 2600);
  },
  // true/false, 입력이 있으면 입력값/null 을 돌려줘요.
  dialog(opts) { return new Promise(res => setOverlay({ dialog: { ...opts, res } })); },
  // render(close) → 시트 내용. 닫는 함수를 돌려줘요.
  sheet(render) {
    const s = { render, key: Math.random() };
    const close = () => setOverlay({ sheets: overlay.sheets.filter(x => x !== s) });
    s.close = close;
    setOverlay({ sheets: [...overlay.sheets, s] });
    return close;
  },
};

function Overlays() {
  const o = useSyncExternalStore(f => { osubs.add(f); return () => osubs.delete(f); }, () => overlay);
  return <>
    {o.sheets.map(s => <div key={s.key}><div className="dim" onClick={s.close} /><div className="sheet" role="dialog" aria-modal="true"><div className="grab" />{s.render(s.close)}</div></div>)}
    {o.dialog && <Dialog {...o.dialog} key={o.dialog.title} />}
    {o.toast && <Toast {...o.toast} key={o.toast.key} />}
  </>;
}

function Toast({ msg, action }) {
  const ref = useRef(null), [cls, setCls] = useState('');
  useLayoutEffect(() => {
    const scr = ref.current.closest('.scr');
    setCls(scr.querySelector('.tabbar') ? '' : scr.querySelector('.cta:not([hidden])') ? 'over-cta' : 'low');
  }, []);
  return <div ref={ref} className={`toast ${cls}`} role="status"><span>{msg}</span>
    {action && (action.to
      ? <Link to={action.to} onClick={() => setOverlay({ toast: null })}>{action.label}</Link>
      : <button onClick={() => { setOverlay({ toast: null }); action.fn(); }}>{action.label}</button>)}
  </div>;
}

function Dialog({ title, body = '', ok = '확인', cancel = '취소', danger = false, input = null, res }) {
  const [v, setV] = useState(input?.value || ''), [err, setErr] = useState('');
  const close = r => { setOverlay({ dialog: null }); res(r); };
  const submit = () => {
    if (!input) return close(true);
    const e = input.validate?.(v.trim());
    if (e) return setErr(e);
    close(v.trim());
  };
  return <>
    <div className="dim" onClick={() => close(input ? null : false)} />
    <div className="dialog" role="dialog" aria-modal="true"><h3>{title}</h3>{body && <p>{body}</p>}
      {input && <><div className="control"><input autoFocus maxLength={input.max || 30} value={v} placeholder={input.placeholder || ''}
        onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} /></div><div className="hint bad">{err}</div></>}
      <div className="acts">{cancel && <button className="btn sec" onClick={() => close(input ? null : false)}>{cancel}</button>}
        <button className={`btn ${danger ? 'danger' : ''}`} onClick={submit}>{ok}</button></div></div>
  </>;
}

// ---------- 작성 중 확인 ----------
let dirty = false;
export const markDirty = () => { dirty = true; };
export const clean = () => { dirty = false; };
const confirmLeave = async () => !dirty || (await ui.dialog({ title: '작성을 그만할까요?', body: '입력한 내용은 저장되지 않아요.', ok: '그만하기', danger: true }));

// ---------- 화면 틀 ----------
const TABS = [['홈', '/home', 'home'], ['피드', '/feed', 'feed'], ['마이페이지', '/me', 'user']];
// nav: 탭 바에서 켜질 탭 이름(없으면 탭 바 없음). guard: 입력하면 나갈 때 확인.
export function Screen({ nav, guard, title, children }) {
  const nav2 = useNavigate(), loc = useLocation();
  useEffect(() => { clean(); }, [loc.pathname]);
  useEffect(() => { if (title) document.title = `${title} · Pin it!`; }, [title]);
  // ?toast=… 로 넘어온 안내를 띄우고 주소에서 지워요
  useEffect(() => {
    const p = new URLSearchParams(loc.search), t = p.get('toast');
    if (!t) return;
    p.delete('toast');
    nav2({ pathname: loc.pathname, search: p.toString() }, { replace: true });
    setTimeout(() => ui.toast(t), 60);
  }, [loc.search]);
  return <div className="phone"><div className="scr">
    <div className="contents" onInput={guard ? e => { if (e.target.closest('input,textarea')) markDirty(); } : undefined}>{children}</div>
    {nav && <nav className="tabbar" aria-label="주요 메뉴">{TABS.map(([n, to, i]) =>
      <Link key={n} to={to} className={n === nav ? 'on' : ''} aria-current={n === nav ? 'page' : undefined}
        onClick={async e => { if (!dirty) return; e.preventDefault(); if (await confirmLeave()) { clean(); nav2(to); } }}><Icon n={i} />{n}</Link>)}</nav>}
    <Overlays />
  </div></div>;
}

// 뒤로: 앱 안에서 온 곳이 있으면 그리로, 없으면 fallback
export function BackBtn({ to = '/home', icon = 'back', label = '뒤로' }) {
  const nav = useNavigate();
  return <button type="button" className="icon-btn" aria-label={label} onClick={async () => {
    if (!(await confirmLeave())) return;
    clean();
    window.history.state?.idx > 0 ? nav(-1) : nav(to);
  }}><Icon n={icon} /></button>;
}

// 로그인이 필요한 동작 앞에서: 로그인돼 있으면 true, 아니면 로그인 화면으로 (돌아올 곳 next)
export function useNeedLogin() {
  const nav = useNavigate(), loc = useLocation();
  return (next = loc.pathname + loc.search) => {
    if (me()) return true;
    nav('/login?next=' + encodeURIComponent(next));
    return false;
  };
}

// ---------- 사진 ----------
// 저장된 사진은 시연용 무늬 클래스(ph-1…) 또는 data URL
export const Photo = ({ p, alt = '사진', cls = 'photo' }) => p.startsWith('data:')
  ? <div className={cls}><img src={p} alt={alt} /></div> : <div className={`${cls} ${p}`} role="img" aria-label={alt} />;

export function PhotoPicker({ photos, onAdd, onRemove }) {
  const file = useRef(null);
  return <>
    <div className="photos flush">
      {photos.map((p, i) => <div className="photo" key={i}><img src={p} alt={`첨부 사진 ${i + 1}`} />
        <button type="button" className="x" aria-label={`사진 ${i + 1} 삭제`} onClick={() => onRemove(i)}><Icon n="close" /></button></div>)}
      {photos.length < 3 && <button type="button" className="photo-add" onClick={() => file.current.click()}><Icon n="camera" /><span className="num">{photos.length}/3</span></button>}
    </div>
    <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
      onChange={e => { const f = [...e.target.files]; e.target.value = ''; markDirty(); onAdd(f); }} />
  </>;
}

// ---------- 리뷰 ----------
export const AdLabel = ({ r }) => (r.ad || r.adminLabel) ? <span className="ad-label">협찬·광고</span> : null;

export function ReviewCard({ r, viewer, onMore }) {
  if (r.hidden) return <div className="rv held" id={`rv-${r.id}`}><Icon n="eyeoff" cls="sm" />신고가 접수돼 검토 중인 리뷰예요.</div>;
  const nick = nickOf(r.by, r.nick);
  return <div className="rv" id={`rv-${r.id}`}>
    <div className="who"><span className="avatar">{nick[0].toUpperCase()}</span><span className="nm">{nick}</span>
      <span className="dt">{fmtDate(r.at)}{viewer?.email === r.by ? ' · 내 리뷰' : ''}</span>
      <button className="icon-btn more" aria-label="리뷰 메뉴" onClick={() => onMore(r)}><Icon n="more" /></button></div>
    <AdLabel r={r} />
    <p>{r.body}</p>{r.photos?.length > 0 && <div className="photos">{r.photos.map((p, i) => <Photo key={i} p={p} alt="리뷰 사진" />)}</div>}
  </div>;
}

// 피드·내 활동의 리뷰 카드: 누르면 핀 상세의 그 리뷰로
export function ReviewLink({ r }) {
  const p = pinById(r.pin);
  if (!p) return null;
  return <Link className="frv" to={`/pin?id=${p.id}&at=rv-${r.id}`}>
    <span className="frv-place"><Icon n="pin" cls="sm" /><span className="ell">{p.name}</span></span>
    <span className="frv-who">{nickOf(r.by, r.nick)} · {ago(r.at)} · {pinKind(p)}</span>
    <AdLabel r={r} /><span className="frv-body">{r.body}</span>
    {r.photos?.length > 0 && <span className="photos">{r.photos.map((x, i) => <Photo key={i} p={x} alt="리뷰 사진" />)}</span>}
  </Link>;
}

// ---------- 약관·정책 문서 ----------
const DOCS = {
  terms: ['서비스 이용약관', 'Pin it!은 장소 핀과 리스트를 만들고 공유하는 서비스예요. 다른 사람의 권리를 침해하거나 허위 정보를 올리면 게시물이 숨겨질 수 있어요.'],
  privacy: ['개인정보 수집·이용', '수집 항목: 이메일, 닉네임, 비밀번호(암호화 저장).\n이용 목적: 회원 식별, 리뷰·리스트 작성자 표시.\n보관 기간: 회원 탈퇴 시 바로 삭제해요.\n현재 위치는 저장하지 않고, 사진의 위치 정보는 올리기 전에 지워요.'],
  review: ['리뷰 작성 원칙', '돈·제품·할인 등 대가를 받고 쓴 리뷰는 반드시 "협찬·대가를 받았어요"를 체크해 주세요. 체크한 리뷰는 본문 위에 협찬·광고 표시가 붙어요.\n표시 없이 쓴 광고 리뷰는 신고나 운영자 검토로 숨겨질 수 있어요. 한 장소에는 리뷰를 하나만 쓸 수 있어요.'],
  location: ['위치 정보 이용', '"내 위치" 버튼을 누를 때만 현재 위치를 확인해 지도를 옮겨요. 위치는 저장하거나 다른 사람에게 보여 주지 않아요.'],
  age: ['만 14세 이상 확인', '만 14세 미만은 보호자 동의 없이 가입할 수 없어요.'],
  data: ['장소 데이터 출처', '장소 정보는 공공데이터를 정리해서 보여 줘요.\n· 서울특별시 주요 공원현황 (2026 하반기)\n· 서울특별시 관악구 카페및커피숍 현황 (2022)\n· 서울특별시 강서구 카페(커피숍) 현황 (2025.8.5. 기준)\n주소를 좌표로 바꾸는 데 브이월드(국토교통부) 지오코더를 썼어요.'],
};
export const openDoc = key => {
  const [t, b] = DOCS[key];
  ui.sheet(close => <><h3>{t}</h3><p className="doc">{b}</p><button className="btn" onClick={close}>확인</button></>);
};
