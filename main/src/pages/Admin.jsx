// 리뷰 검토 (운영자 전용): AI 의심·신고 누적·미판정 대기열, 광고 라벨/숨김/문제없음 처리 + 되돌리기.
// AI 판정은 review_ai_checks(운영자만 읽기). 판정 Edge Function을 붙이기 전까지는 비어 있어요.
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { aiChecks, fmtDate, me, nickOf, pinById, reviews, run, useStore } from '../lib/store.js';
import { supabase } from '../supabase.js';
import { AdLabel, BackBtn, Icon, Screen, ui } from '../ui/kit.jsx';

// ai: AI가 의심(확신도 0.5 이상), pending: AI 호출 실패. 운영자가 처리한 리뷰는 빠져요.
function queue(name) {
  const rs = reviews().filter(r => !r.decision);
  if (name === 'report') return rs.filter(r => r.reportCount >= 3).map(r => ({ review: r }));
  return aiChecks().filter(x => (name === 'ai' ? x.status === 'done' && x.confidence >= 0.5 : x.status === 'failed'))
    .map(x => ({ queue: name, confidence: x.confidence, reason: x.reason || (name === 'pending' ? 'AI 판정 호출에 실패해 미판정으로 남았어요.' : ''), review: rs.find(r => r.id === x.review_id) }))
    .filter(x => x.review);
}
const TABS = [['ai', 'AI 의심'], ['report', '신고 누적'], ['pending', '미판정']];
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
  const items = queue(q);
  return <Screen title="리뷰 검토">
    <div className="top line"><BackBtn to="/me" /><span className="ttl">리뷰 검토</span></div>
    <div className="seg">{TABS.map(([k, n]) => <button key={k} className={q === k ? 'on' : ''} onClick={() => setQ(k)}>{n}<span className="n num">{queue(k).length}</span></button>)}</div>
    <div className="body">{items.length ? items.map(x => { const r = x.review, p = pinById(r.pin);
      const reasons = Object.entries(r.reports.reduce((a, y) => { a[y.reason] = (a[y.reason] || 0) + 1; return a; }, {}));
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
          <button className="btn sm line" onClick={() => decide(r.id, 'ok')}>문제없음</button></div>
      </div>; })
      : <div className="empty"><span className="ic"><Icon n="check" /></span><div className="t">검토할 리뷰가 없어요</div><div className="s">새로 들어오면 여기에 보여요.</div></div>}</div>
  </Screen>;
}
