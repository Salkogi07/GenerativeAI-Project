// 핀 상세: 정보·설명, 리뷰 목록(협찬·광고 라벨, 신고 숨김), 리뷰 메뉴 → 신고 시트, 찜하기 시트.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { likeCount, lists, me, nickOf, pinById, pinReviews, reviews, save, uid, useStore, uuid } from '../lib/store.js';
import { BackBtn, Icon, Photo, ReviewCard, Screen, ui, useNeedLogin } from '../ui/kit.jsx';
import { L, markerIcon, useMap } from '../ui/map.js';

const REASONS = ['광고인데 표시가 없어요', '허위 정보예요', '욕설·비방이 있어요', '기타'];

export default function Pin() {
  useStore();
  const [sp] = useSearchParams(), nav = useNavigate(), needLogin = useNeedLogin();
  const pin = pinById(sp.get('id')), u = me();
  if (!pin) return <Screen nav="홈" title="핀">
    <div className="top"><BackBtn to="/home" /><span className="ttl" /></div>
    <div className="empty"><span className="ic"><Icon n="pin" /></span><div className="t">찾을 수 없는 핀이에요</div><div className="s">숨겨졌거나 삭제된 핀이에요.</div><Link className="btn fit" to="/home">지도 홈으로 가기</Link></div>
  </Screen>;

  const isMine = u?.email === pin.author, rs = pinReviews(pin.id), mine = rs.find(r => r.by === u?.email);
  const inMine = !!u && lists().some(l => l.owner === u.email && l.pins.includes(pin.id));
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const share = async () => {
    const url = `${location.origin}${location.pathname}#/pin?id=${pin.id}`;
    try {
      if (navigator.share) await navigator.share({ title: pin.name, url });
      else { await navigator.clipboard.writeText(url); ui.toast('핀 링크를 복사했어요'); }
    } catch { /* 사용자가 공유를 취소 */ }
  };
  const write = () => {
    if (mine) return scrollTo('rv-' + mine.id);
    const to = `/review-new?pin=${pin.id}`;
    if (needLogin(to)) nav(to);
  };
  // 리뷰 메뉴 → 삭제(내 리뷰) / 신고(남의 리뷰)
  const more = r => {
    if (u?.email === r.by) return ui.sheet(close => <div className="menu-sheet">
      <button className="danger" onClick={async () => {
        close();
        if (!(await ui.dialog({ title: '리뷰를 삭제할까요?', body: '삭제한 리뷰는 되돌릴 수 없어요.', ok: '삭제', danger: true }))) return;
        save('reviews', reviews().filter(x => x.id !== r.id));
        ui.toast('리뷰를 삭제했어요');
      }}><Icon n="trash" />내 리뷰 삭제</button>
      <button onClick={close}><Icon n="close" />닫기</button></div>);
    ui.sheet(close => <div className="menu-sheet">
      <button onClick={() => { close(); if (needLogin()) ui.sheet(c => <ReportSheet rid={r.id} close={c} />); }}><Icon n="flag" />신고하기</button>
      <button onClick={close}><Icon n="close" />닫기</button></div>);
  };
  const like = () => { if (needLogin()) ui.sheet(close => <LikeSheet pin={pin} close={close} />); };

  return <Screen nav="홈" title={pin.name}>
    <div className="top"><BackBtn to="/home" /><span className="ttl" />
      <Link className="icon-btn" to="/home" aria-label="지도 홈으로"><Icon n="home" /></Link>
      <button className="icon-btn" aria-label="공유" onClick={share}><Icon n="share" /></button></div>
    <div className="body">
      <PinMap pin={pin} />
      <div className="pad pin-info">
        <div className="pin-tags"><span className="tag">{pin.kind === '위치' ? '위치 핀' : '장소'}</span><span className="tag">{pin.cat}</span></div>
        <h1 className="pin-name">{pin.name}</h1>
        <div className="pin-meta"><span>{nickOf(pin.author)} 님의 핀</span>
          {pin.kind === '장소' && <><span>·</span><a className="text-link" target="_blank" rel="noopener"
            href={`https://www.openstreetmap.org/?mlat=${pin.lat}&mlon=${pin.lng}#map=18/${pin.lat}/${pin.lng}`}>지도에서 크게 보기</a></>}</div>
        <p className={`pin-desc ${pin.desc ? '' : 'is-empty'}`}>{pin.desc || (isMine ? '아직 설명이 없어요. 이 장소를 어떻게 쓰면 좋은지 적어 보세요.' : '아직 설명이 없어요.')}</p>
        {pin.photos?.length > 0 && <div className="photos">{pin.photos.map((p, i) => <Photo key={i} p={p} alt={`${pin.name} 사진`} />)}</div>}
        {isMine && <Link className="btn sm line pin-edit" to={`/pin-edit?id=${pin.id}`}><Icon n="edit" cls="sm" />설명 수정</Link>}
      </div>
      <div className="divider" />
      <div className="sec-h reviews-h" id="reviews-h"><span>리뷰 <span className="num">{rs.filter(r => !r.hidden).length}</span></span><span className="order">최신순</span></div>
      {rs.length ? rs.map(r => <ReviewCard key={r.id} r={r} viewer={u} onMore={more} />)
        : <div className="empty inline"><span className="ic"><Icon n="edit" /></span><div className="t">첫 리뷰를 남겨 보세요</div><div className="s">다녀온 경험이 다른 사람의 선택을 도와요.</div></div>}
      <ScrollToAt at={sp.get('at')} />
    </div>
    <div className="cta">
      <button className={`btn line like-btn ${inMine ? 'liked' : ''}`} onClick={like} aria-label={inMine ? '찜한 핀 · 담을 리스트 바꾸기' : '찜하기'}><Icon n="heart" /><span className="num">{likeCount(pin.id)}</span></button>
      <button className="btn" onClick={write}>{mine ? '내 리뷰 보기' : '리뷰 쓰기'}</button>
    </div>
  </Screen>;
}

// 피드·내 활동에서 &at=reviews-h(리뷰 목록)나 &at=rv-…(특정 리뷰)로 들어오면 그 위치로
function ScrollToAt({ at }) {
  useEffect(() => { if (at) setTimeout(() => document.getElementById(at)?.scrollIntoView({ block: 'start' }), 50); }, [at]);
  return null;
}

function PinMap({ pin }) {
  const [ref, map] = useMap({ center: [pin.lat + 0.0004, pin.lng], zoom: 16, interactive: false });
  useEffect(() => {
    if (!map) return;
    const mk = L.marker([pin.lat, pin.lng], { icon: markerIcon(pin, 'sel') }).addTo(map);
    return () => mk.remove();
  }, [map]);
  return <div className="map h150" ref={ref} />;
}

function ReportSheet({ rid, close }) {
  const [reason, setReason] = useState('');
  const send = () => {
    const u = me(), all = reviews(), r = all.find(x => x.id === rid);
    close();
    if (r.reports.some(x => x.by === u.email)) return ui.toast('이미 신고한 리뷰예요');
    r.reports.push({ by: u.email, reason, at: Date.now() });
    if (new Set(r.reports.map(x => x.by)).size >= 3) r.hidden = true; // 서로 다른 계정 3건 → 자동 숨김
    save('reviews', all);
    ui.toast(r.hidden ? '신고가 쌓여 리뷰를 가렸어요. 운영자가 검토해요' : '신고했어요. 운영자가 확인할게요');
  };
  return <><h3>리뷰 신고</h3><p className="lead">신고 이유를 골라 주세요. 신고한 사람은 공개되지 않아요.</p>
    <div>{REASONS.map(x => <button key={x} className={`check ${reason === x ? 'on' : ''}`} onClick={() => setReason(x)}><span className="radio" /><span className="fl">{x}</span></button>)}</div>
    <div className="acts"><button className="btn sec fixed-w" onClick={close}>취소</button><button className="btn" disabled={!reason} onClick={send}>신고하기</button></div></>;
}

// 찜하기: 여러 리스트에 담기 + 새 리스트(기본 비공개)
function LikeSheet({ pin, close }) {
  const u = me(), mine = lists().filter(l => l.owner === u.email);
  const [sel, setSel] = useState(() => new Set(mine.filter(l => l.pins.includes(pin.id)).map(l => l.id)));
  const [name, setName] = useState(''), [pub, setPub] = useState(false);
  const n = sel.size + (name.trim() ? 1 : 0);
  const toggle = id => setSel(s => { const t = new Set(s); t.has(id) ? t.delete(id) : t.add(id); return t; });
  const submit = () => {
    const all = lists(), now = Date.now(), nm = name.trim();
    all.forEach(l => {
      if (l.owner !== u.email) return;
      const has = l.pins.includes(pin.id), want = sel.has(l.id);
      if (has !== want) { l.pins = want ? [...l.pins, pin.id] : l.pins.filter(x => x !== pin.id); l.updated = now; }
    });
    if (nm) all.push({ id: 'l' + uid(), name: nm, owner: u.email, public: pub, token: uuid(), pins: [pin.id], updated: now });
    save('lists', all);
    close();
    ui.toast(n ? `${n}개 리스트에 저장했어요` : '리스트에서 뺐어요', { label: '리스트 보기', to: '/lists' });
  };
  return <><h3>리스트에 담기</h3><p className="lead">여러 리스트에 한 번에 담을 수 있어요.</p>
    <div>{mine.length ? mine.map(l => <button key={l.id} className={`check ${sel.has(l.id) ? 'on' : ''}`} onClick={() => toggle(l.id)}>
      <span className="box"><Icon n="check" /></span><span className="fl ell">{l.name}</span>
      <span className={`tag ${l.public ? 'pub' : ''}`}><Icon n={l.public ? 'globe' : 'lock'} />{l.public ? '공개' : '비공개'}</span></button>)
      : <p className="empty-note">아직 리스트가 없어요. 아래에서 만들어 보세요.</p>}</div>
    <div className="new-box"><div className="label">새 리스트</div>
      <div className="control"><input maxLength={20} placeholder="리스트 이름" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="switch-line"><span><b>공개</b> <span className="sub">{pub ? '· 링크와 검색으로 누구나 볼 수 있어요' : '· 끄면 나만 볼 수 있어요'}</span></span>
        <span className={`switch ${pub ? 'on' : ''}`} role="switch" aria-checked={pub} tabIndex={0} onClick={() => setPub(!pub)} /></div></div>
    <button className="btn submit" onClick={submit}>{n ? `${n}개 리스트에 저장` : '저장'}</button></>;
}
