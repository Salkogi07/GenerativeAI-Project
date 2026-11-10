// 마이페이지: 프로필·활동 수(눌러서 펼치기), 신규 계정 리뷰 제한, 닉네임 수정, 위치 정보 이용, 약관, 로그아웃·탈퇴.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DAY, DB, ago, isNew, lists, me, pinKind, pins, reviews, save, todayCount, useStore, users, visibleCount } from '../lib/store.js';
import { Icon, Photo, ReviewLink, Screen, openDoc, ui } from '../ui/kit.jsx';

export default function Me() {
  useStore();
  const nav = useNavigate(), u = me();
  const [open, setOpen] = useState('');
  if (!u) return <Screen nav="마이페이지" title="마이페이지">
    <div className="top"><span className="brand">Pin it!</span></div>
    <div className="body"><div className="empty"><span className="ic"><Icon n="user" /></span><div className="t">로그인이 필요해요</div><div className="s">로그인하면 핀을 남기고<br />리스트를 만들 수 있어요.</div>
      <Link className="btn fit" to="/login?next=%2Fme">로그인</Link><Link className="text-link" to="/terms">회원가입</Link></div></div>
  </Screen>;

  const updateMe = fn => save('users', users().map(x => (x.email === u.email ? (fn(x), x) : x)));
  const j = new Date(u.created), free = new Date(u.created + 7 * DAY);
  const myPins = pins().filter(p => p.author === u.email).sort((a, b) => b.created - a.created);
  const myRvs = reviews().filter(r => r.by === u.email).sort((a, b) => b.at - a.at);
  const myLists = lists().filter(l => l.owner === u.email).sort((a, b) => b.updated - a.updated);
  // 활동 칸을 누르면 페이지 이동 대신 아래로 최근 3개를 펼쳐요. 다시 누르면 접혀요.
  const TILES = [
    ['pin', myPins.length, '찍은 핀', '/mine?tab=pin', '아직 찍은 핀이 없어요', myPins.slice(0, 3).map(p => <Link className="row" key={p.id} to={`/pin?id=${p.id}`}>
      {p.photos?.length ? <Photo p={p.photos[0]} alt={`${p.name} 사진`} cls="thumb" /> : <span className="thumb tint"><Icon n="pin" /></span>}
      <span className="fl"><span className="t ell">{p.name}</span><span className="s">{pinKind(p)} · 리뷰 {visibleCount(p.id)} · {ago(p.created)}</span></span></Link>)],
    ['review', myRvs.length, '쓴 리뷰', '/mine?tab=review', '아직 쓴 리뷰가 없어요', myRvs.slice(0, 3).map(r => <ReviewLink key={r.id} r={r} />)],
    ['list', myLists.length, '찜 리스트', '/lists', '아직 만든 리스트가 없어요', myLists.slice(0, 3).map(l => <Link className="row" key={l.id} to={`/list?id=${l.id}`}>
      <span className={`thumb ${l.public ? 'tint' : ''}`}><Icon n={l.public ? 'globe' : 'lock'} /></span>
      <span className="fl"><span className="t ell">{l.name}</span><span className="s">핀 {l.pins.length} · {l.public ? '공개' : '비공개'}</span></span></Link>)],
  ];
  const t = TILES.find(x => x[0] === open);

  const editNick = async () => {
    const v = await ui.dialog({ title: '닉네임 수정', body: '리뷰와 공개 리스트에 보이는 이름이에요.', ok: '저장',
      input: { value: u.nick, max: 12, validate: x => (/^[가-힣a-zA-Z0-9_]{2,12}$/.test(x) ? '' : '한글·영문·숫자·_ 2~12자로 입력해 주세요') } });
    if (v) { updateMe(x => { x.nick = v; }); ui.toast('닉네임을 바꿨어요'); }
  };
  const pw = async () => { if (await ui.dialog({ title: '비밀번호를 바꿀까요?', body: `${u.email}로 비밀번호 변경 링크를 보내 드려요.`, ok: '메일 보내기' })) ui.toast('비밀번호 변경 메일을 보냈어요'); };
  const loc = () => { const off = u.location !== false; updateMe(x => { x.location = !off; }); ui.toast(off ? '위치 정보 이용을 껐어요' : '위치 정보 이용을 켰어요'); };
  const logout = async () => { if (!(await ui.dialog({ title: '로그아웃할까요?', ok: '로그아웃' }))) return; DB.set('session', null); nav('/login'); };
  const leave = async () => {
    if (!(await ui.dialog({ title: '정말 탈퇴할까요?', body: '이메일·닉네임과 내 리스트가 바로 삭제되고 되돌릴 수 없어요.', ok: '탈퇴하기', danger: true }))) return;
    save('lists', lists().filter(l => l.owner !== u.email));
    save('users', users().filter(x => x.email !== u.email));
    DB.set('session', null);
    nav('/login');
  };

  return <Screen nav="마이페이지" title="마이페이지">
    <div className="top"><span className="brand">Pin it!</span></div>
    <div className="body">
      <div className="big-title">마이페이지</div>
      <div className="profile">
        <span className="avatar lg">{u.nick[0].toUpperCase()}</span>
        <div className="fl"><div className="p-nick">{u.nick}</div><div className="p-mail ell">{u.email} · 인증 완료</div>
          <div className="p-date">{j.getFullYear()}.{j.getMonth() + 1}.{j.getDate()} 가입</div></div>
        <button className="btn sm sec" onClick={editNick}>수정</button>
      </div>
      <div className="stats">{TILES.map(([k, n, label, to]) => <a key={k} href={'#' + to} className={open === k ? 'on' : ''}
        onClick={e => { e.preventDefault(); setOpen(open === k ? '' : k); }}><b className="num">{n}</b><span>{label}<Icon n="chev" cls="xs" /></span></a>)}</div>
      {t && <div className="stat-panel">{t[1] ? t[5] : <div className="sp-empty">{t[4]}</div>}
        <Link className="sp-all" to={t[3]}>{t[1] > 3 ? `전체 ${t[1]}개 보기` : '전체 보기'}<Icon n="chev" cls="xs" /></Link></div>}
      {isNew(u) && <div className="notice info inset"><b>새로 가입한 계정은 리뷰를 하루 3개까지 쓸 수 있어요</b>
        <div className="s">오늘 {todayCount(u)} / 3 · {free.getMonth() + 1}월 {free.getDate()}일부터 제한이 풀려요</div></div>}

      <div className="sec-h">계정</div>
      <button className="row" onClick={pw}><span className="fl t plain">비밀번호 변경</span><span className="chev"><Icon n="chev" cls="sm" /></span></button>
      <button className="row" role="switch" aria-checked={u.location !== false} onClick={loc}><span className="fl"><span className="t plain">위치 정보 이용</span><span className="s">내 위치로 지도를 옮길 때만 써요</span></span>
        <span className={`switch ${u.location !== false ? 'on' : ''}`} /></button>
      {/* 메뉴 숨김은 편의, 실제 차단은 RLS */}
      {u.admin && <Link className="row admin-row" to="/admin"><span className="thumb tint md"><Icon n="shield" /></span><span className="fl"><span className="t">리뷰 검토</span><span className="s">운영자 전용</span></span><span className="chev"><Icon n="chev" cls="sm" /></span></Link>}

      <div className="sec-h">정보</div>
      {[['terms', '서비스 이용약관'], ['privacy', '개인정보 처리방침'], ['review', '리뷰 작성 원칙'], ['data', '장소 데이터 출처']].map(([k, nm]) =>
        <button className="row" key={k} onClick={() => openDoc(k)}><span className="fl t plain">{nm}</span><span className="chev"><Icon n="chev" cls="sm" /></span></button>)}
      <div className="row"><span className="fl t plain">지도 데이터</span><span className="end">© OpenStreetMap contributors</span></div>
      <div className="row"><span className="fl t plain">버전</span><span className="end num">1.0.0</span></div>

      <div className="pad stack account-actions">
        <button className="btn sec" onClick={logout}>로그아웃</button>
        <button className="text-link center leave" onClick={leave}>회원 탈퇴</button>
      </div>
    </div>
  </Screen>;
}
