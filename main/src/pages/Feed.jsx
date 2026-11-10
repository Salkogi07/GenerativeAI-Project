// 피드: [장소 사진 | 리뷰] 탭, 인기(찜 수 → 리뷰 수) 많은·적은 순, 최신·오래된 순. 장소를 누르면 핀 상세의 리뷰 목록으로.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { likeCount, nickOf, pinById, pins, placePhotos, reviews, useStore, visibleCount } from '../lib/store.js';
import { Icon, Photo, ReviewLink, Screen } from '../ui/kit.jsx';

const SORTS = [['pop', '인기 많은 순'], ['unpop', '인기 적은 순'], ['new', '최신순'], ['old', '오래된 순']];
const hit = (text, ws) => ws.every(w => text.toLowerCase().includes(w));
const popular = (a, b) => likeCount(b.id) - likeCount(a.id) || visibleCount(b.id) - visibleCount(a.id);

export default function Feed() {
  useStore();
  const [sp] = useSearchParams();
  const [tab, setTab] = useState(sp.get('tab') === 'review' ? 'review' : 'photo'), [sort, setSort] = useState('pop'), [q, setQ] = useState('');
  const ws = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const order = (list, when, pinOf) => {
    const by = { pop: (a, b) => popular(pinOf(a), pinOf(b)), new: (a, b) => when(b) - when(a) };
    by.unpop = (a, b) => -by.pop(a, b);
    by.old = (a, b) => -by.new(a, b);
    return [...list].sort(by[sort]);
  };
  const ps = tab === 'photo' ? order(pins().filter(p => hit(`${p.name} ${p.cat} ${p.desc || ''} ${nickOf(p.author)}`, ws)), p => p.created, p => p) : [];
  const rs = tab === 'review' ? order(reviews().filter(r => !r.hidden && pinById(r.pin)
    && hit(`${r.body} ${pinById(r.pin).name} ${nickOf(r.by, r.nick)}`, ws)), r => r.at, r => pinById(r.pin)) : [];
  const n = tab === 'photo' ? ps.length : rs.length;

  return <Screen nav="피드" title="피드">
    <div className="top"><span className="brand">Pin it!</span></div>
    <form className="feed-search" role="search" onSubmit={e => { e.preventDefault(); e.target.querySelector('input').blur(); }}>
      <div className="control search-box"><Icon n="search" cls="sm muted" />
        <input type="search" enterKeyHint="search" placeholder="피드에서 장소, 리뷰 검색" maxLength={50} autoComplete="off" aria-label="피드 검색" value={q} onChange={e => setQ(e.target.value)} />
        {q && <button type="button" className="aside" aria-label="지우기" onClick={() => setQ('')}><Icon n="close" cls="sm" /></button>}
      </div>
    </form>
    <div className="seg"><button className={tab === 'photo' ? 'on' : ''} onClick={() => setTab('photo')}>장소 사진</button><button className={tab === 'review' ? 'on' : ''} onClick={() => setTab('review')}>리뷰</button></div>
    <div className="body">
      <div className="chips sort-chips" role="radiogroup" aria-label="정렬">
        {SORTS.map(([k, nm]) => <button key={k} className={`chip ${sort === k ? 'on' : ''}`} role="radio" aria-checked={sort === k} onClick={() => setSort(k)}>{nm}</button>)}</div>
      {tab === 'photo' && <div className="feed-grid">{ps.map((p, i) => { const ph = placePhotos(p);
        return <Link key={p.id} className={`ftile ${ph.length ? '' : 'nophoto'}`} to={`/pin?id=${p.id}&at=reviews-h`}>
          {ph.length ? <Photo p={ph[0]} alt={`${p.name} 사진`} cls="fph" /> : <div className="fph"><Icon n="pin" /></div>}
          {sort === 'pop' && <span className={`rank num ${i < 3 ? 'top' : ''}`}>{i + 1}</span>}
          {ph.length > 1 && <span className="cnt num"><Icon n="camera" cls="xs" />{ph.length}</span>}
          <span className="cap"><span className="nm ell">{p.name}</span><span className="meta num">찜 {likeCount(p.id)} · 리뷰 {visibleCount(p.id)}</span></span></Link>; })}</div>}
      {tab === 'review' && <div>{rs.map(r => <ReviewLink key={r.id} r={r} />)}</div>}
      {!n && <div className="empty"><span className="ic"><Icon n="feed" /></span>
        <div className="t">{q.trim() ? `"${q.trim()}" 결과가 없어요` : tab === 'photo' ? '아직 보여 줄 장소가 없어요' : '아직 보여 줄 리뷰가 없어요'}</div>
        <div className="s">{q.trim() ? '다른 단어로 검색하거나 다른 탭에서 찾아보세요.' : '장소에 첫 핀과 리뷰를 남겨 보세요.'}</div>
        <Link className="btn fit" to="/home">지도에서 찾기</Link></div>}
    </div>
    <div className="demo-strip">시연용 가상 데이터 · 성수동</div>
  </Screen>;
}
