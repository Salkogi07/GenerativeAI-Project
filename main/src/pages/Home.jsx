// 지도 홈: 공개 핀 지도, 카테고리 칩, 핀 미리보기 카드, 내 위치, 핀 찍기.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DB, ago, cats, likeCount, me, nickOf, pinKind, pinReviews, pins, placePhotos, region as curRegion, useStore, visibleCount } from '../lib/store.js';
import { AdLabel, Icon, Photo, Screen, ui, useNeedLogin } from '../ui/kit.jsx';
import { addPins, markerIcon, useMap } from '../ui/map.js';

export default function Home() {
  useStore();
  const nav = useNavigate(), needLogin = useNeedLogin(), u = me();
  const region = curRegion();
  const [ref, map] = useMap({ center: [region[1], region[2]] });
  const [cat, setCat] = useState(''), [sel, setSel] = useState(null), all = pins();
  const selMk = useRef(null);

  useEffect(() => {
    if (!map) return;
    const hide = () => setSel(null);
    map.on('click', hide);
    const list = all.filter(p => !cat || p.cat === cat);
    const mks = addPins(map, list, (p, mk) => {
      if (selMk.current) selMk.current.setIcon(markerIcon(selMk.current.pin));
      mk.setIcon(markerIcon(p, 'sel'));
      selMk.current = mk;
      setSel(p);
    });
    if (!list.length && cat) ui.toast('이 카테고리에는 아직 핀이 없어요', { label: '핀 찍기', to: '/pin-new' });
    return () => { map.off('click', hide); mks.forEach(m => m.remove()); selMk.current = null; setSel(null); };
  }, [map, cat, all]);
  useEffect(() => { if (!sel && selMk.current) { selMk.current.setIcon(markerIcon(selMk.current.pin)); selMk.current = null; } }, [sel]);

  const pinHere = () => {
    const c = map ? map.getCenter() : { lat: region[1], lng: region[2] };
    const to = `/pin-new?lat=${c.lat.toFixed(6)}&lng=${c.lng.toFixed(6)}`;
    if (needLogin(to)) nav(to);
  };
  // 위치는 지도 이동에만 쓰고 저장하지 않음
  const locate = () => {
    const fallback = msg => ui.toast(msg);
    if (u && u.location === false) return fallback('위치 정보 이용이 꺼져 있어요. 마이페이지에서 켤 수 있어요');
    if (!navigator.geolocation) return fallback('이 기기에서는 위치를 확인할 수 없어요');
    navigator.geolocation.getCurrentPosition(p => {
      map?.setView([p.coords.latitude, p.coords.longitude], 16);
    }, () => fallback('위치 권한이 없어 내 위치로 옮기지 못했어요'), { timeout: 6000 });
  };

  // 칩은 3개만: 내가 고른 카테고리(이 기기에 저장, 없으면 앞 3개). 시트에서 고른 게 그 밖이면 맨 앞에 보여 줘요
  const cs = cats(), top = homeCats(cs);
  const shown = !cat || top.some(c => c.name === cat) ? top : [cs.find(c => c.name === cat), ...top.slice(0, 2)].filter(Boolean);
  const pickCat = () => ui.sheet(close => <CatSheet cs={cs} cat={cat} pick={v => { setCat(v); close(); }} />);

  const ph = sel ? placePhotos(sel) : [], rs = sel ? pinReviews(sel.id).filter(r => !r.hidden).slice(0, 2) : [];
  return <Screen nav="홈" title="지도">
    <div className="top"><span className="brand">Pin it!</span>
      <Link className="top-aside region-btn" to="/region" aria-label="지역 바꾸기"><Icon n="pin" cls="xs" /><span>{region[0]}</span><Icon n="chev" cls="xs down" /></Link></div>
    <div className="map fill" ref={ref}>
      <div className="float map-top">
        <Link className="search-pill" to="/search"><Icon n="search" />장소, 키워드, 리스트 검색</Link>
        <div className="chips" role="radiogroup" aria-label="카테고리">
          {shown.map(({ name: c, icon }) => <button key={c} className={`chip raised ${cat === c ? 'on' : ''}`} role="radio" aria-checked={cat === c}
            onClick={() => setCat(cat === c ? '' : c)}>{icon && `${icon} `}{c}</button>)}
          {cs.length > 0 && <button className="chip raised chip-more" aria-label="카테고리 전체 보기" onClick={pickCat}><Icon n="feed" cls="sm" /></button>}
        </div>
      </div>
      {!sel && <button className="float fab fab-loc" aria-label="내 위치로 이동" onClick={locate}><Icon n="locate" /></button>}
      {!sel && <a className="float fab-main fab-pin" href="#/pin-new" onClick={e => { e.preventDefault(); pinHere(); }}><Icon n="plus" />핀 찍기</a>}
      {sel && <Link className="float preview" to={`/pin?id=${sel.id}`}>
        <span className="pv-head"><span className="thumb tint pv-thumb">{ph.length ? <Photo p={ph[0]} alt={`${sel.name} 사진`} cls="pv-ph" /> : <Icon n="pin" />}</span>
          <span className="fl"><span className="pv-name ell">{sel.name}</span>
            <span className="pv-sub">{pinKind(sel)} · 리뷰 {visibleCount(sel.id)} · 찜 {likeCount(sel.id)}</span>
            <span className="pv-by">{nickOf(sel.author)} 님의 핀</span></span>
          <Icon n="chev" cls="muted" /></span>
        <AdLabel r={sel} />
        <span className="pv-desc">{sel.desc || '아직 설명이 없어요.'}</span>
        <span className="pv-rvs">{rs.length ? <><span className="pv-h">최근 리뷰</span>{rs.map(r => <span className="pv-rv" key={r.id}>
          <span className="pv-who">{nickOf(r.by)} · {ago(r.at)}</span><AdLabel r={r} /><span className="pv-body">{r.body}</span></span>)}</>
          : <span className="pv-h">아직 리뷰가 없어요. 첫 리뷰를 남겨 보세요.</span>}</span>
      </Link>}
    </div>
  </Screen>;
}

const MAX = 3;
const homeCats = cs => {
  const mine = (DB.get('homeCats', null) || []).map(n => cs.find(c => c.name === n)).filter(Boolean);
  return mine.length ? mine : cs.slice(0, MAX);
};

// 카테고리 시트: 눌러서 걸러 보기, 편집에서는 지도에 띄울 칩을 3개까지 골라요
function CatSheet({ cs, cat, pick }) {
  const [edit, setEdit] = useState(false), [on, setOn] = useState(() => homeCats(cs).map(c => c.name));
  const toggle = c => setOn(on.includes(c) ? on.filter(x => x !== c) : on.length < MAX ? [...on, c] : on);
  const done = () => { DB.set('homeCats', on); setEdit(false); ui.toast('지도에 띄울 카테고리를 바꿨어요'); };
  return <>
    <div className="sheet-head"><h3>{edit ? '지도에 띄울 카테고리' : '카테고리'}</h3>
      <button onClick={edit ? done : () => setEdit(true)}>{edit ? '완료' : '편집'}</button></div>
    {edit && <p className="lead">{MAX}개까지 고를 수 있어요. 고른 순서대로 지도에 보여요.</p>}
    <div className="chips wrap cat-all" role={edit ? 'group' : 'radiogroup'} aria-label="카테고리 전체">
      {edit ? cs.map(({ name: c, icon }) => { const i = on.indexOf(c);
        return <button key={c} className={`chip ${i >= 0 ? 'on' : ''}`} aria-pressed={i >= 0} disabled={i < 0 && on.length >= MAX}
          onClick={() => toggle(c)}>{i >= 0 && <span className="cat-no">{i + 1}</span>}{icon && `${icon} `}{c}</button>; })
      : [{ name: '전체', icon: '' }, ...cs].map(({ name: c, icon }) => { const v = c === '전체' ? '' : c;
        return <button key={c} className={`chip ${cat === v ? 'on' : ''}`} role="radio" aria-checked={cat === v}
          onClick={() => pick(v)}>{icon && `${icon} `}{c}</button>; })}
    </div></>;
}
