// 지도 홈: 공개 핀 지도, 카테고리 칩, 핀 미리보기 카드, 내 위치, 핀 찍기.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATS, CENTER, DB, REGIONS, ago, dist, likeCount, me, nickOf, pinKind, pinReviews, pins, placePhotos, useStore, visibleCount } from '../lib/store.js';
import { AdLabel, Icon, Photo, Screen, ui, useNeedLogin } from '../ui/kit.jsx';
import { addPins, markerIcon, useMap } from '../ui/map.js';

export default function Home() {
  useStore();
  const nav = useNavigate(), needLogin = useNeedLogin(), u = me();
  const region = REGIONS.find(r => r[0] === DB.get('region', '')) || REGIONS[0];
  const [ref, map] = useMap({ center: [region[1], region[2]] });
  const [cat, setCat] = useState(''), [sel, setSel] = useState(null);
  const selMk = useRef(null);

  useEffect(() => {
    if (!map) return;
    const hide = () => setSel(null);
    map.on('click', hide);
    const list = pins().filter(p => !cat || p.cat === cat);
    const mks = addPins(map, list, (p, mk) => {
      if (selMk.current) selMk.current.setIcon(markerIcon(selMk.current.pin));
      mk.setIcon(markerIcon(p, 'sel'));
      selMk.current = mk;
      setSel(p);
    });
    if (!list.length) ui.toast('이 카테고리에는 아직 핀이 없어요', { label: '핀 찍기', to: '/pin-new' });
    return () => { map.off('click', hide); mks.forEach(m => m.remove()); selMk.current = null; setSel(null); };
  }, [map, cat]);
  useEffect(() => { if (!sel && selMk.current) { selMk.current.setIcon(markerIcon(selMk.current.pin)); selMk.current = null; } }, [sel]);

  const pinHere = () => {
    const c = map ? map.getCenter() : { lat: CENTER[0], lng: CENTER[1] };
    const to = `/pin-new?lat=${c.lat.toFixed(6)}&lng=${c.lng.toFixed(6)}`;
    if (needLogin(to)) nav(to);
  };
  // 위치는 지도 이동에만 쓰고 저장하지 않음
  const locate = () => {
    const fallback = msg => { map?.setView(CENTER, 15); ui.toast(msg); };
    if (u && u.location === false) return fallback('위치 정보 이용이 꺼져 있어요. 마이페이지에서 켤 수 있어요');
    if (!navigator.geolocation) return fallback('이 기기에서는 위치를 확인할 수 없어요');
    navigator.geolocation.getCurrentPosition(p => {
      const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
      dist(pos, { lat: CENTER[0], lng: CENTER[1] }) > 5000 ? fallback('지금은 성수동만 볼 수 있어서 성수동으로 이동했어요') : map?.setView([pos.lat, pos.lng], 16);
    }, () => fallback('위치 권한이 없어 성수동 중심으로 이동했어요'), { timeout: 6000 });
  };

  const ph = sel ? placePhotos(sel) : [], rs = sel ? pinReviews(sel.id).filter(r => !r.hidden).slice(0, 2) : [];
  return <Screen nav="홈" title="지도">
    <div className="top"><span className="brand">Pin it!</span>
      <Link className="top-aside region-btn" to="/region" aria-label="지역 바꾸기"><Icon n="pin" cls="xs" /><span>{region[0]}</span><Icon n="chev" cls="xs down" /></Link></div>
    <div className="map fill" ref={ref}>
      <div className="float map-top">
        <Link className="search-pill" to="/search"><Icon n="search" />장소, 키워드, 리스트 검색</Link>
        <div className="chips" role="radiogroup" aria-label="카테고리">
          {['전체', ...CATS.slice(0, 4)].map(c => { const v = c === '전체' ? '' : c;
            return <button key={c} className={`chip raised ${cat === v ? 'on' : ''}`} role="radio" aria-checked={cat === v}
              onClick={() => setCat(cat === v ? '' : v)}>{c}</button>; })}
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
        <span className="pv-desc">{sel.desc || '아직 설명이 없어요.'}</span>
        <span className="pv-rvs">{rs.length ? <><span className="pv-h">최근 리뷰</span>{rs.map(r => <span className="pv-rv" key={r.id}>
          <span className="pv-who">{nickOf(r.by, r.nick)} · {ago(r.at)}</span><AdLabel r={r} /><span className="pv-body">{r.body}</span></span>)}</>
          : <span className="pv-h">아직 리뷰가 없어요. 첫 리뷰를 남겨 보세요.</span>}</span>
      </Link>}
    </div>
    <div className="demo-strip">시연용 가상 데이터 · 성수동</div>
  </Screen>;
}
