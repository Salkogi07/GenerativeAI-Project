// 내 활동(핀·리뷰), 내 찜 리스트 목록, 리스트 상세, 공유 리스트.
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ago, likeCount, lists, me, nickOf, pinById, pinKind, pins, reviews, save, uid, useStore, uuid, visibleCount } from '../lib/store.js';
import { BackBtn, Icon, Photo, ReviewLink, Screen, ui, useNeedLogin } from '../ui/kit.jsx';
import { addPins, fitTo, useMap } from '../ui/map.js';

// ---------- 내 활동: 내가 찍은 핀, 내가 쓴 리뷰 (최신순) ----------
export function Mine() {
  useStore();
  const [sp] = useSearchParams(), u = me();
  const [tab, setTab] = useState(sp.get('tab') === 'review' ? 'review' : 'pin');
  if (!u) return <Navigate to="/login?next=%2Fmine" replace />;
  const myPins = pins().filter(p => p.author === u.email).sort((a, b) => b.created - a.created);
  const myRvs = reviews().filter(r => r.by === u.email).sort((a, b) => b.at - a.at); // 내 리뷰는 신고로 가려져도 나에게는 보여요
  return <Screen nav="마이페이지" title="내 활동">
    <div className="top line"><BackBtn to="/me" /><span className="ttl">내 활동</span></div>
    <div className="seg"><button className={tab === 'pin' ? 'on' : ''} onClick={() => setTab('pin')}>내가 찍은 핀<span className="n num">{myPins.length}</span></button>
      <button className={tab === 'review' ? 'on' : ''} onClick={() => setTab('review')}>내가 쓴 리뷰<span className="n num">{myRvs.length}</span></button></div>
    <div className="body">
      {tab === 'pin' && (myPins.length ? myPins.map(p => <Link className="row" key={p.id} to={`/pin?id=${p.id}`}>
        {p.photos?.length ? <Photo p={p.photos[0]} alt={`${p.name} 사진`} cls="thumb" /> : <span className="thumb tint"><Icon n="pin" /></span>}
        <span className="fl"><span className="t ell">{p.name}</span><span className="s">{pinKind(p)} · 리뷰 {visibleCount(p.id)} · 찜 {likeCount(p.id)} · {ago(p.created)}</span></span>
        <span className="chev"><Icon n="chev" cls="sm" /></span></Link>)
        : <div className="empty"><span className="ic"><Icon n="pin" /></span><div className="t">아직 찍은 핀이 없어요</div><div className="s">가게가 아닌 곳도 핀으로 남길 수 있어요.</div><Link className="btn fit" to="/pin-new">핀 찍기</Link></div>)}
      {tab === 'review' && (myRvs.length ? myRvs.map(r => <ReviewLink key={r.id} r={r} />)
        : <div className="empty"><span className="ic"><Icon n="edit" /></span><div className="t">아직 쓴 리뷰가 없어요</div><div className="s">다녀온 장소에 첫 리뷰를 남겨 보세요.</div><Link className="btn fit" to="/feed">피드 둘러보기</Link></div>)}
    </div>
  </Screen>;
}

// ---------- 내 찜 리스트: 목록(공개·비공개), 새 리스트(기본 비공개) ----------
export function Lists() {
  useStore();
  const nav = useNavigate(), needLogin = useNeedLogin(), u = me();
  const create = async () => {
    if (!needLogin()) return;
    const name = await ui.dialog({ title: '새 리스트', body: '처음에는 나만 볼 수 있는 비공개 리스트로 만들어져요.', ok: '만들기',
      input: { placeholder: '예: 성수 카페 투어', max: 20, validate: v => (v ? '' : '리스트 이름을 적어 주세요') } });
    if (!name) return;
    const l = { id: 'l' + uid(), name, owner: u.email, public: false, token: uuid(), pins: [], updated: Date.now() };
    save('lists', [...lists(), l]);
    nav(`/list?id=${l.id}&toast=${encodeURIComponent('리스트를 만들었어요')}`);
  };
  const mine = u ? lists().filter(l => l.owner === u.email).sort((a, b) => b.updated - a.updated) : [];
  return <Screen nav="마이페이지" title="찜 리스트">
    <div className="top line"><BackBtn to="/me" /><span className="ttl">찜 리스트</span>{u && <button className="icon-btn" aria-label="새 리스트 만들기" onClick={create}><Icon n="plus" /></button>}</div>
    <div className="body">
      {!u ? <div className="empty"><span className="ic"><Icon n="lock" /></span><div className="t">로그인하고 리스트를 만들어 보세요</div><div className="s">찜한 핀을 주제별로 모아 볼 수 있어요.</div><Link className="btn fit" to="/login?next=%2Flists">로그인</Link></div>
        : mine.length ? <>
          {mine.map(l => <Link className="row" key={l.id} to={`/list?id=${l.id}`}>
            <span className={`thumb ${l.public ? 'tint' : ''}`}><Icon n={l.public ? 'globe' : 'lock'} /></span>
            <span className="fl"><span className="t ell">{l.name}</span><span className="s">핀 {l.pins.length} · {ago(l.updated)} 수정</span></span>
            <span className={`tag ${l.public ? 'pub' : ''}`}>{l.public ? '공개' : '비공개'}</span></Link>)}
          <div className="pad"><button className="btn sec" onClick={create}><Icon n="plus" cls="sm" />새 리스트 만들기</button></div></>
          : <div className="empty"><span className="ic"><Icon n="bookmark" /></span><div className="t">마음에 드는 핀을 모아 보세요</div><div className="s">주제별 리스트를 만들고 친구에게 링크로 보낼 수 있어요.</div><button className="btn fit" onClick={create}>새 리스트 만들기</button></div>}
    </div>
  </Screen>;
}

function PinsMap({ ps, cls }) {
  const nav = useNavigate(), [ref, map] = useMap();
  useEffect(() => {
    if (!map) return;
    const mks = addPins(map, ps, p => nav(`/pin?id=${p.id}`));
    setTimeout(() => { map.invalidateSize(); fitTo(map, ps); }, 0);
    return () => mks.forEach(m => m.remove());
  }, [map, ps.map(p => p.id).join()]);
  return <div className={`map ${cls}`} ref={ref} hidden={!ps.length} />;
}

// ---------- 리스트 상세: 공개·비공개 전환, 공유 링크(무작위 토큰), 핀 빼기(되돌리기), 이름 변경·삭제 ----------
const shareUrl = l => `${location.origin}${location.pathname}#/shared?t=${l.token}`;
export function List() {
  useStore();
  const [sp] = useSearchParams(), nav = useNavigate(), u = me(), id = sp.get('id');
  const l = lists().find(x => x.id === id);
  if (!u) return <Navigate to={`/login?next=${encodeURIComponent('/list?id=' + id)}`} replace />;
  if (!l) return <Navigate to="/lists" replace />;
  if (l.owner !== u.email) return <Navigate to={`/shared?t=${l.token}`} replace />;
  const update = fn => save('lists', lists().map(x => (x.id === id ? (fn(x), x.updated = Date.now(), x) : x)));
  const ps = l.pins.map(pinById).filter(Boolean);

  const togglePub = async () => {
    if (l.public && !(await ui.dialog({ title: '비공개로 바꿀까요?', body: '링크로 보던 사람도 더 이상 볼 수 없고, 리스트 검색에서도 빠져요.', ok: '비공개로 바꾸기' }))) return;
    update(x => { x.public = !x.public; });
    ui.toast(!l.public ? '공개 리스트가 됐어요' : '비공개 리스트가 됐어요');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareUrl(l)); ui.toast('링크를 복사했어요', { label: '열어 보기', to: `/shared?t=${l.token}` }); }
    catch { await ui.dialog({ title: '공유 링크', body: shareUrl(l), cancel: '' }); }
  };
  const remove = pid => {
    const idx = l.pins.indexOf(pid);
    update(x => { x.pins = x.pins.filter(y => y !== pid); });
    ui.toast('리스트에서 뺐어요', { label: '되돌리기', fn: () => update(x => { x.pins.splice(idx, 0, pid); }) });
  };
  const menu = () => ui.sheet(close => <div className="menu-sheet">
    <button onClick={async () => {
      close();
      const name = await ui.dialog({ title: '리스트 이름 바꾸기', ok: '저장', input: { value: l.name, max: 20, validate: v => (v ? '' : '리스트 이름을 적어 주세요') } });
      if (name) { update(x => { x.name = name; }); ui.toast('이름을 바꿨어요'); }
    }}><Icon n="edit" />이름 바꾸기</button>
    <button className="danger" onClick={async () => {
      close();
      if (!(await ui.dialog({ title: '리스트를 삭제할까요?', body: '담긴 핀은 지워지지 않지만, 공유 링크는 더 이상 열리지 않아요.', ok: '삭제', danger: true }))) return;
      save('lists', lists().filter(x => x.id !== id));
      nav('/lists?toast=' + encodeURIComponent('리스트를 삭제했어요'));
    }}><Icon n="trash" />리스트 삭제</button>
    <button onClick={close}><Icon n="close" />닫기</button></div>);

  return <Screen nav="마이페이지" title={l.name}>
    <div className="top"><BackBtn to="/lists" /><span className="ttl">{l.name}</span><button className="icon-btn" aria-label="리스트 메뉴" onClick={menu}><Icon n="more" /></button></div>
    <div className="body">
      <div className="pad tight-top share-box">
        <button className="check pub-row" role="switch" aria-checked={l.public} onClick={togglePub}>
          <span className="fl"><b>{l.public ? '공개 리스트' : '비공개 리스트'}</b><span className="note">{l.public ? '링크가 있는 누구나, 리스트 검색에서 볼 수 있어요.' : '나만 볼 수 있어요. 링크로도 열리지 않아요.'}</span></span>
          <span className={`switch ${l.public ? 'on' : ''}`} /></button>
        <button className="btn copy-btn" disabled={!l.public} onClick={copy}><Icon n="link" cls="sm" />공유 링크 복사</button>
        {!l.public && <div className="hint center">공개로 바꾸면 링크를 복사할 수 있어요.</div>}
      </div>
      <PinsMap ps={ps} cls="h180" />
      {ps.map(p => <div className="row pin-row" key={p.id}><Link className="row-main" to={`/pin?id=${p.id}`}><span className="thumb tint"><Icon n="pin" /></span>
        <span className="fl"><span className="t ell">{p.name}</span><span className="s ell">{p.desc || pinKind(p)}</span></span></Link>
        <button className="icon-btn muted" aria-label={`${p.name} 리스트에서 빼기`} onClick={() => remove(p.id)}><Icon n="close" cls="sm" /></button></div>)}
      {!ps.length && <div className="empty"><span className="ic"><Icon n="pin" /></span><div className="t">아직 담은 핀이 없어요</div><div className="s">핀 상세에서 하트를 눌러 이 리스트에 담아 보세요.</div><Link className="btn fit" to="/home">지도 둘러보기</Link></div>}
    </div>
  </Screen>;
}

// ---------- 공유 리스트 보기: 로그인 없이 읽기만. 비공개·삭제·토큰 변조는 모두 같은 안내 ----------
export function Shared() {
  useStore();
  const [sp] = useSearchParams(), l = lists().find(x => x.token === sp.get('t'));
  const ok = l && l.public, ps = ok ? l.pins.map(pinById).filter(Boolean) : [];
  return <Screen title={ok ? l.name : '공유 리스트'}>
    <div className="top line"><Link className="brand" to="/home">Pin it!</Link>{!me() && <Link className="btn sm sec login-btn" to="/login">로그인</Link>}</div>
    {ok ? <>
      <div className="body">
        <div className="pad list-head"><span className="tag pub"><Icon n="globe" />공개 리스트</span>
          <h1 className="list-name">{l.name}</h1><div className="list-meta">{nickOf(l.owner)} 님의 리스트 · 핀 {ps.length}</div></div>
        <PinsMap ps={ps} cls="h220" />
        {ps.length ? ps.map(p => <Link className="row" key={p.id} to={`/pin?id=${p.id}`}><span className="thumb tint"><Icon n="pin" /></span>
          <span className="fl"><span className="t ell">{p.name}</span><span className="s">{p.desc || pinKind(p)}</span></span><span className="chev"><Icon n="chev" cls="sm" /></span></Link>)
          : <div className="empty inline"><div className="s">아직 담긴 핀이 없어요.</div></div>}
      </div>
      <div className="cta"><Link className="btn sec" to="/home"><Icon n="map" cls="sm" />Pin it!에서 더 둘러보기</Link></div>
    </> : <div className="empty"><span className="ic"><Icon n="lock" /></span><div className="t">볼 수 없는 리스트예요</div><div className="s">비공개로 바뀌었거나 삭제된 리스트예요.</div><Link className="btn fit" to="/home">지도 홈으로 가기</Link></div>}
  </Screen>;
}
