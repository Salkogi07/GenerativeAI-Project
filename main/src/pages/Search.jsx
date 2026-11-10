// 검색: 입력 중 최근·추천 검색어, 결과는 [핀 | 리스트] 탭. 장소는 Supabase(공공데이터). 비공개 리스트는 검색되지 않음.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CENTER, DB, dist, fmtDist, likeCount, lists, me, nickOf, pinKind, pins, useStore, visibleCount } from '../lib/store.js';
import { searchPlaces } from '../lib/places.js';
import { BackBtn, Icon, Screen, useNeedLogin } from '../ui/kit.jsx';
import { addPins, fitTo, useMap } from '../ui/map.js';

const DEFAULT_RECENT = ['성수 카페', '산책'];
// 시연 지역이 성수동 하나라 지역명은 핀 검색 조건에서 뺌
const words = s => s.trim().toLowerCase().split(/\s+/).filter(w => w && w !== '성수' && w !== '성수동');
const hit = (text, ws) => ws.every(w => text.toLowerCase().includes(w));
const recent = () => DB.get('recent', DEFAULT_RECENT);

export default function Search() {
  useStore();
  const [sp] = useSearchParams(), nav = useNavigate(), needLogin = useNeedLogin();
  const init = sp.get('q') || '';
  const [q, setQ] = useState(init), [typing, setTyping] = useState(!init);
  const inp = useRef(null);
  useEffect(() => { setQ(init); setTyping(!init); if (!init) inp.current?.focus(); }, [init]);
  const go = (text, tab) => nav(`/search?q=${encodeURIComponent(text)}${tab ? '&tab=' + tab : ''}`);

  return <Screen nav="홈" title="검색">
    <form className="top search-top" role="search" onSubmit={e => { e.preventDefault(); if (q.trim()) go(q.trim()); }}>
      <BackBtn to="/home" />
      <div className="control search-box"><Icon n="search" cls="sm muted" />
        <input ref={inp} type="search" enterKeyHint="search" placeholder="장소, 키워드, 리스트 검색" autoComplete="off" maxLength={50}
          value={q} onChange={e => { setQ(e.target.value); setTyping(true); }} onFocus={() => setTyping(true)} />
        {q && <button type="button" className="aside" aria-label="지우기" onClick={() => { setQ(''); setTyping(true); inp.current.focus(); }}><Icon n="close" cls="sm" /></button>}
      </div>
    </form>
    {typing || !init ? <Typing q={q} go={go} /> : <Results text={init} tab0={sp.get('tab')} needLogin={needLogin} nav={nav} go={go} />}
  </Screen>;
}

function Typing({ q, go }) {
  const r = recent(), raw = q.trim();
  const ws = words(raw).length ? words(raw) : [raw.toLowerCase()];
  const sug = raw ? [...pins().filter(p => hit(p.name + p.cat, ws)).map(p => [p.name, 'pin']),
    ...lists().filter(l => l.public && hit(l.name, ws)).map(l => [l.name, 'list'])].slice(0, 6) : [];
  return <div className="body">
    {r.length > 0 && <div><div className="sec-h">최근 검색<button onClick={() => DB.set('recent', [])}>전체 삭제</button></div>
      {r.map((x, i) => <div className="row compact" key={x}><span className="lead-ic"><Icon n="search" cls="sm" /></span>
        <a className="fl" href="#" onClick={e => { e.preventDefault(); go(x); }}>{x}</a>
        <button className="icon-btn muted" aria-label={`${x} 삭제`} onClick={() => { const a = recent(); a.splice(i, 1); DB.set('recent', a); }}><Icon n="close" cls="sm" /></button></div>)}</div>}
    {sug.length > 0 && <div><div className="sec-h">추천</div>
      {sug.map(([n, t]) => <a key={t + n} className="row compact link" href="#" onClick={e => { e.preventDefault(); go(n, t === 'list' ? 'list' : ''); }}>
        <span className="lead-ic"><Icon n={t === 'list' ? 'bookmark' : 'pin'} cls="sm" /></span><span className="fl">{n}</span>{t === 'list' && <span className="tag">리스트</span>}</a>)}</div>}
    {!r.length && !sug.length && <div className="empty"><span className="ic"><Icon n="search" /></span><div className="t">무엇을 찾고 있나요?</div><div className="s">"성수 카페", "서울숲"처럼 검색해 보세요.</div></div>}
  </div>;
}

function Results({ text, tab0, needLogin, nav, go }) {
  const ws = words(text), all = pins();
  const [places, setPlaces] = useState([]), [fail, setFail] = useState(false);
  useEffect(() => { DB.set('recent', [text, ...recent().filter(r => r !== text)].slice(0, 8)); }, [text]);
  // 장소 검색은 지역명도 단어로 써요(예: "관악 카페"는 이름에 없으니 빼고 찾음)
  useEffect(() => {
    let live = true;
    searchPlaces(text.trim().split(/\s+/).filter(Boolean)).then(r => {
      if (!live) return;
      setFail(r === null);
      const pinned = new Set(all.map(p => String(p.placeId)).filter(x => x !== 'undefined'));
      setPlaces((r || []).filter(p => !pinned.has(String(p.id))));
    });
    return () => { live = false; };
  }, [text]);
  const ps = all.filter(p => hit(`${p.name} ${p.cat} ${p.desc || ''}`, ws));
  const pub = lists().filter(l => l.public && hit(l.name, ws));
  const none = !ps.length && !places.length && !pub.length;
  const [tab, setTab] = useState(null);
  const cur = tab || (tab0 === 'list' || (!ps.length && !places.length) ? 'list' : 'pin');
  const c = { lat: CENTER[0], lng: CENTER[1] }, myEmail = me()?.email;
  const newPin = p => `/pin-new?place=${p.id}`;
  const needThen = to => { if (needLogin(to)) nav(to); };

  return <>
    <div className="seg"><button className={cur === 'pin' ? 'on' : ''} onClick={() => setTab('pin')}>핀<span className="n num">{ps.length + places.length}</span></button>
      <button className={cur === 'list' ? 'on' : ''} onClick={() => setTab('list')}>리스트<span className="n num">{pub.length}</span></button></div>
    <div className="body">
      {fail && <div className="notice warn inset"><b>새 장소 검색이 잠시 안 돼요</b><div className="s">잠시 후 다시 시도해 주세요. 저장된 핀만 보여 드려요.</div></div>}
      {none ? <div className="empty"><span className="ic"><Icon n="pin" /></span><div className="t">"{text}" 검색 결과가 없어요</div>
        <div className="s">이 장소의 첫 핀을 남기거나<br />검색 범위를 넓혀 보세요.</div>
        <div className="actions"><button className="btn" onClick={() => needThen('/pin-new')}>첫 핀 남기기</button>
          <button className="btn sec" onClick={() => go(words(text)[0] || '카페')}>범위 넓히기</button></div></div>
        : <>
          <div hidden={cur !== 'pin'}>
            <ResultMap pins={ps} places={places} visible={cur === 'pin'} onPin={p => nav(`/pin?id=${p.id}`)} onPlace={p => needThen(newPin(p))} />
            {ps.map(p => <Link className="row" key={p.id} to={`/pin?id=${p.id}`}><span className="thumb tint"><Icon n="pin" /></span>
              <span className="fl"><span className="t ell">{p.name}</span><span className="s">{pinKind(p)} · 리뷰 {visibleCount(p.id)} · 찜 {likeCount(p.id)}</span></span>
              <span className="end num">{fmtDist(dist(c, p))}</span></Link>)}
            {places.map(p => <div className="row" key={'pl' + p.id}><span className="thumb"><Icon n="pin" /></span>
              <span className="fl"><span className="t ell">{p.name}</span><span className="s ell">{p.cat} · {p.address || '아직 핀이 없어요'}</span></span>
              <button className="btn sm line" onClick={() => needThen(newPin(p))}>핀 남기기</button></div>)}
          </div>
          <div hidden={cur !== 'list'}>
            {pub.map(l => <Link className="row" key={l.id} to={l.owner === myEmail ? `/list?id=${l.id}` : `/shared?t=${l.token}`}>
              <span className="thumb tint"><Icon n="bookmark" /></span><span className="fl"><span className="t ell">{l.name}</span><span className="s">핀 {l.pins.length} · {nickOf(l.owner)}</span></span>
              <span className="chev"><Icon n="chev" cls="sm" /></span></Link>)}
            <p className="footnote">공개 리스트만 검색돼요.</p></div>
        </>}
    </div>
  </>;
}

function ResultMap({ pins: ps, places, visible, onPin, onPlace }) {
  const [ref, map] = useMap();
  useEffect(() => {
    if (!map) return;
    const mks = [...addPins(map, ps, onPin), ...addPins(map, places.map(p => ({ ...p, kind: '장소' })), onPlace, 'dim')];
    fitTo(map, [...ps, ...places]);
    return () => mks.forEach(m => m.remove());
  }, [map, ps.length, places]);
  useEffect(() => { if (visible) setTimeout(() => map?.invalidateSize(), 0); }, [visible, map]);
  return <div className="map h200" ref={ref} />;
}
