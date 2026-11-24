// 리뷰 검토 (운영자 전용): AI 의심·신고·미판정 대기열, 광고 라벨/숨김/문제없음/삭제 처리 + 되돌리기. 핀 신고(핀 삭제). 카테고리 관리.
// AI 판정은 review_ai_checks(운영자만 읽기). 판정 Edge Function을 붙이기 전까지는 비어 있어요.
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { aiChecks, cats, fmtDate, me, nickOf, pinById, pinReviews, pins, reviews, run, useStore } from '../lib/store.js';
import { supabase } from '../supabase.js';
import { AdLabel, BackBtn, Icon, Screen, ui } from '../ui/kit.jsx';

// ai: AI가 의심(확신도 0.5 이상), pending: AI 호출 실패. 운영자가 처리한 리뷰는 빠져요.
function queue(name) {
  const rs = reviews().filter(r => !r.decision);
  // 신고가 한 건이라도 있으면 보여요 (3건이면 서버가 자동으로 숨겨 둔 상태). 신고 많은 순.
  if (name === 'report') return rs.filter(r => r.reportCount > 0).sort((a, b) => b.reportCount - a.reportCount).map(r => ({ review: r }));
  return aiChecks().filter(x => (name === 'ai' ? x.status === 'done' && x.confidence >= 0.5 : x.status === 'failed'))
    .map(x => ({ queue: name, confidence: x.confidence, reason: x.reason || (name === 'pending' ? 'AI 판정 호출에 실패해 미판정으로 남았어요.' : ''), review: rs.find(r => r.id === x.review_id) }))
    .filter(x => x.review);
}
const TABS = [['ai', 'AI 의심'], ['report', '신고'], ['pin', '핀 신고'], ['pending', '미판정'], ['cat', '카테고리']];
// 신고된 핀, 신고 많은 순
const reportedPins = () => pins().filter(p => p.reports.length).sort((a, b) => b.reports.length - a.reports.length);
const countReasons = list => Object.entries(list.reduce((a, y) => { a[y.reason] = (a[y.reason] || 0) + 1; return a; }, {}));
// RLS가 막으면 오류 없이 0행이 지워져서, 지워진 행이 없으면 실패로 봐요
const del = async (table, id) => { const { data, error } = await run(supabase.from(table).delete().eq('id', id).select('id')); return !error && data?.length > 0; };
const DONE = { label: '광고 라벨을 붙였어요', hide: '리뷰를 숨겼어요', ok: '문제없음으로 처리했어요' };

export default function Admin() {
  useStore();
  const [q, setQ] = useState('ai'), u = me();
  if (!u) return <Navigate to="/login?next=%2Fadmin" replace />;
  // 화면 숨김은 편의일 뿐 — 실서비스는 RLS(app_metadata.role = 'admin')로 차단
  if (!u.admin) return <Screen title="리뷰 검토">
    <div className="top line"><BackBtn to="/me" /><span className="ttl">리뷰 검토</span></div>
    <div className="empty"><span className="ic"><Icon n="shield" /></span><div className="t">접근 권한이 없어요</div><div className="s">운영자 계정만 볼 수 있는 화면이에요.</div><Link className="btn fit" to="/home">지도 홈으로 가기</Link></div>
  </Screen>;

  // 문제없음 → 신고 숨김 해제. 처리한 리뷰는 신고가 더 들어와도 다시 자동 숨김되지 않아요.
  const decide = async (rid, act) => {
    const r = reviews().find(x => x.id === rid), before = { hidden: r.hidden, admin_label: r.adminLabel, admin_decision: null };
    const patch = act === 'label' ? { admin_label: true, hidden: false } : act === 'hide' ? { hidden: true } : { hidden: false };
    const set = p => run(supabase.from('reviews').update(p).eq('id', rid));
    if ((await set({ ...patch, admin_decision: act })).error) return ui.toast('처리하지 못했어요. 다시 시도해 주세요');
    ui.toast(DONE[act], { label: '되돌리기', fn: () => set(before) });
  };
  const removeReview = async r => {
    if (!(await ui.dialog({ title: '이 리뷰를 삭제할까요?', body: '되돌릴 수 없어요.', ok: '삭제', danger: true }))) return;
    ui.toast(await del('reviews', r.id) ? '리뷰를 삭제했어요' : '삭제하지 못했어요. 다시 시도해 주세요');
  };
  const items = q === 'cat' || q === 'pin' ? [] : queue(q);
  return <Screen title="리뷰 검토">
    <div className="top line"><BackBtn to="/me" /><span className="ttl">리뷰 검토</span></div>
    <div className="seg admin-seg">{TABS.map(([k, n]) => <button key={k} className={q === k ? 'on' : ''} onClick={() => setQ(k)}>{n}<span className="n num">{k === 'cat' ? cats().length : k === 'pin' ? reportedPins().length : queue(k).length}</span></button>)}</div>
    {q === 'cat' ? <CatAdmin /> : q === 'pin' ? <PinReports /> : <div className="body">{items.length ? items.map(x => { const r = x.review, p = pinById(r.pin);
      const reasons = countReasons(r.reports);
      return <div className="review-card" key={r.id}>
        <div className="meta"><span><b>{p?.name || '삭제된 핀'}</b> · {nickOf(r.by)} · {fmtDate(r.at)}</span>{r.hidden && <span className="tag">숨김 중</span>}</div>
        <AdLabel r={r} />
        <p className="quote">{r.body}</p>
        {x.queue && <div className="ai-box">
          <div className="ai-head">AI 판정{x.confidence ? <span className="score num">확신도 {x.confidence.toFixed(2)}</span> : <span className="none">미판정</span>}</div>
          {x.confidence && <div className="conf"><i ref={el => { if (el) el.style.width = `${x.confidence * 100}%`; }} /></div>}
          <div className="ai-reason">{x.reason}</div></div>}
        {reasons.length > 0 && <div className="report-line"><b>신고 {r.reports.length}건</b> · <span>{reasons.map(([k, n]) => `${k} ${n}`).join(', ')}</span></div>}
        <div className="decide"><button className="btn sm" onClick={() => decide(r.id, 'label')}>광고 라벨</button>
          <button className="btn sm sec" onClick={() => decide(r.id, 'hide')}>숨김</button>
          <button className="btn sm line" onClick={() => decide(r.id, 'ok')}>문제없음</button>
          <button className="btn sm line danger-line" onClick={() => removeReview(r)}>삭제</button></div>
      </div>; })
      : <div className="empty"><span className="ic"><Icon n="check" /></span><div className="t">검토할 리뷰가 없어요</div><div className="s">새로 들어오면 여기에 보여요.</div></div>}</div>}
  </Screen>;
}

// 핀 신고: 핀은 숨김 칸이 없어서(D18) 운영자가 보고 지워요. 지우면 리뷰·신고도 함께 지워져요.
function PinReports() {
  const list = reportedPins();
  const remove = async p => {
    if (!(await ui.dialog({ title: `"${p.name}" 핀을 삭제할까요?`, body: `리뷰 ${pinReviews(p.id).length}개도 함께 지워지고 되돌릴 수 없어요.`, ok: '삭제', danger: true }))) return;
    ui.toast(await del('pins', p.id) ? '핀을 삭제했어요' : '삭제하지 못했어요. 다시 시도해 주세요');
  };
  return <div className="body">{list.length ? list.map(p => <div className="review-card" key={p.id}>
    <div className="meta"><span><b>{p.name}</b> · {nickOf(p.author)} · {fmtDate(p.created)}</span></div>
    <p className="quote">{p.desc || '설명이 없어요.'}</p>
    <div className="report-line"><b>신고 {p.reports.length}건</b> · <span>{countReasons(p.reports).map(([k, n]) => `${k} ${n}`).join(', ')}</span></div>
    <div className="decide"><Link className="btn sm line" to={`/pin?id=${p.id}`}>핀 보기</Link>
      <button className="btn sm line danger-line" onClick={() => remove(p)}>핀 삭제</button></div>
  </div>) : <div className="empty"><span className="ic"><Icon n="check" /></span><div className="t">신고된 핀이 없어요</div><div className="s">새로 들어오면 여기에 보여요.</div></div>}</div>;
}

// 카테고리: 지도 핀 안에 아이콘(이모지)으로 보여요. 핀이 쓰는 카테고리는 지울 수 없어요(서버 외래키).
function CatAdmin() {
  const save = async (q, done) => {
    const { error } = await run(q);
    ui.toast(!error ? done : error.code === '23505' ? '이미 있는 카테고리 이름이에요'
      : error.code === '23503' ? '이 카테고리를 쓰는 핀이 있어서 지울 수 없어요' : '저장하지 못했어요. 다시 시도해 주세요');
  };
  const nameIn = value => ({ value, max: 10, placeholder: '예: 카페', validate: v => !v && '이름을 적어 주세요' });
  const iconIn = value => ({ value, max: 8, placeholder: '이모지 하나, 예: ☕', validate: v => !v && '아이콘을 적어 주세요' });
  const add = async () => {
    const name = await ui.dialog({ title: '카테고리 추가', ok: '다음', input: nameIn('') });
    if (!name) return;
    const icon = await ui.dialog({ title: `"${name}" 아이콘`, body: '지도 핀 안에 보여요.', ok: '추가', input: iconIn('📍') });
    if (icon) save(supabase.from('categories').insert({ name, icon, sort: cats().length + 1 }), '카테고리를 추가했어요');
  };
  const rename = async c => {
    const name = await ui.dialog({ title: '이름 바꾸기', body: '이 카테고리의 핀도 새 이름으로 바뀌어요.', ok: '바꾸기', input: nameIn(c.name) });
    if (name && name !== c.name) save(supabase.from('categories').update({ name }).eq('name', c.name), '이름을 바꿨어요');
  };
  const reicon = async c => {
    const icon = await ui.dialog({ title: `"${c.name}" 아이콘`, ok: '바꾸기', input: iconIn(c.icon) });
    if (icon && icon !== c.icon) save(supabase.from('categories').update({ icon }).eq('name', c.name), '아이콘을 바꿨어요');
  };
  const del = async c => {
    if (await ui.dialog({ title: `"${c.name}" 카테고리를 지울까요?`, body: '이 카테고리를 쓰는 핀이 있으면 지울 수 없어요.', ok: '지우기', danger: true }))
      save(supabase.from('categories').delete().eq('name', c.name), '카테고리를 지웠어요');
  };
  return <div className="body">
    {cats().map(c => <div className="row cat-row" key={c.name}>
      <button className="cat-ic" aria-label={`${c.name} 아이콘 바꾸기`} onClick={() => reicon(c)}>{c.icon}</button>
      <span className="fl t">{c.name}</span>
      <button className="btn sm line" onClick={() => rename(c)}>이름</button>
      <button className="btn sm sec" onClick={() => del(c)}>삭제</button></div>)}
    <div className="pad"><button className="btn sec" onClick={add}><Icon n="plus" cls="sm" />카테고리 추가</button></div>
    <p className="footnote">아이콘을 누르면 바꿀 수 있어요. 지도 핀 안에 보여요.</p>
  </div>;
}
