// 지역 선택: 전국 행정구역 검색(브이월드). 입력창을 맨 위에 둬서 모바일 키보드가 올라와도 입력창·결과가 가려지지 않게 해요.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB, REGIONS, region } from '../lib/store.js';
import { geoSearch } from '../lib/places.js';
import { BackBtn, Icon, Screen } from '../ui/kit.jsx';

// "서울특별시 마포구 연남동" → "연남동"
const short = title => title.split(' ').pop();

export default function Region() {
  const nav = useNavigate(), cur = region()[0];
  const [q, setQ] = useState(''), [found, setFound] = useState(null), [fail, setFail] = useState(false), inp = useRef(null);
  // 입력이 멈추고 0.4초 뒤에 찾아요
  useEffect(() => {
    const w = q.trim();
    if (!w) return setFound(null);
    let live = true;
    const tm = setTimeout(() => geoSearch(w, 'district').then(r => { if (live) { setFail(r === null); setFound(r || []); } }), 400);
    return () => { live = false; clearTimeout(tm); };
  }, [q]);
  const rs = found ? found.map(r => [short(r.name), r.lat, r.lng, r.name]) : REGIONS.map(r => [...r, '']);
  const pick = r => { DB.set('region', r.slice(0, 3)); nav('/home', { replace: true }); };

  return <Screen nav="홈" title="지역 선택">
    {/* 키보드의 검색 키: 첫 번째 결과로 */}
    <form className="top line search-top" role="search" onSubmit={e => { e.preventDefault(); if (found?.[0]) pick(rs[0]); }}>
      <BackBtn to="/home" />
      <div className="control search-box"><Icon n="search" cls="sm muted" />
        <input ref={inp} type="search" enterKeyHint="search" placeholder="동네·시군구 검색 (예: 해운대구)" maxLength={20} autoComplete="off" aria-label="지역 검색" value={q} onChange={e => setQ(e.target.value)} />
        {q && <button type="button" className="aside" aria-label="지우기" onClick={() => { setQ(''); inp.current.focus(); }}><Icon n="close" cls="sm" /></button>}
      </div>
    </form>
    <p className="region-note">{found ? '전국 행정구역에서 찾았어요.' : '전국 어디든 동네 이름으로 찾을 수 있어요. 자주 찾는 곳:'}</p>
    {/* 목록을 스크롤하면 키보드를 내려 더 많이 보이게 */}
    <div className="body" onTouchMove={() => inp.current?.blur()}>
      <div className="region-list" role="radiogroup" aria-label="지역">{rs.map(r =>
        <button key={r[3] || r[0]} className={`check ${r[0] === cur ? 'on' : ''}`} role="radio" aria-checked={r[0] === cur} onClick={() => pick(r)}>
          <span className="radio" /><span className="fl">{r[0]}{r[3] && <span className="near-meta"> · {r[3]}</span>}</span>{r[0] === cur && <span className="now">현재 지역</span>}</button>)}</div>
      {found && !rs.length && <p className="region-empty">{fail ? '지역 검색이 잠시 안 돼요. 잠시 후 다시 시도해 주세요.' : '찾는 지역이 없어요. 동네나 시군구 이름으로 다시 검색해 보세요.'}</p>}
    </div>
  </Screen>;
}
