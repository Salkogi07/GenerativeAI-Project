// 지역 선택: 입력창을 맨 위에 둬서 모바일 키보드가 올라와도 입력창·결과가 가려지지 않게 해요.
// shortcut: 성수동 밖은 시연 데이터가 없어 지도만 옮겨요 — 지역 데이터 연동 때 핀 불러오기 추가
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB, REGIONS } from '../lib/store.js';
import { BackBtn, Icon, Screen } from '../ui/kit.jsx';

export default function Region() {
  const nav = useNavigate(), cur = DB.get('region', REGIONS[0][0]);
  const [q, setQ] = useState(''), inp = useRef(null);
  const rs = REGIONS.filter(r => r[0].includes(q.trim()));
  const pick = name => {
    DB.set('region', name);
    nav(name === REGIONS[0][0] ? '/home' : `/home?toast=${encodeURIComponent('이 지역은 아직 시연 데이터가 없어요')}`, { replace: true });
  };
  return <Screen nav="홈" title="지역 선택">
    {/* 키보드의 검색 키: 첫 번째 결과로 */}
    <form className="top line search-top" role="search" onSubmit={e => { e.preventDefault(); if (rs[0]) pick(rs[0][0]); }}>
      <BackBtn to="/home" />
      <div className="control search-box"><Icon n="search" cls="sm muted" />
        <input ref={inp} type="search" enterKeyHint="search" placeholder="동네 이름 검색 (예: 연남동)" maxLength={20} autoComplete="off" aria-label="지역 검색" value={q} onChange={e => setQ(e.target.value)} />
        {q && <button type="button" className="aside" aria-label="지우기" onClick={() => { setQ(''); inp.current.focus(); }}><Icon n="close" cls="sm" /></button>}
      </div>
    </form>
    <p className="region-note">지금은 성수동에만 시연 데이터가 있어요. 다른 지역은 지도만 옮겨요.</p>
    {/* 목록을 스크롤하면 키보드를 내려 더 많이 보이게 */}
    <div className="body" onTouchMove={() => inp.current?.blur()}>
      <div className="region-list" role="radiogroup" aria-label="지역">{rs.map(([n]) =>
        <button key={n} className={`check ${n === cur ? 'on' : ''}`} role="radio" aria-checked={n === cur} onClick={() => pick(n)}>
          <span className="radio" /><span className="fl">{n}</span>{n === cur && <span className="now">현재 지역</span>}</button>)}</div>
      {!rs.length && <p className="region-empty">찾는 지역이 없어요. 동네 이름으로 다시 검색해 보세요.</p>}
    </div>
  </Screen>;
}
