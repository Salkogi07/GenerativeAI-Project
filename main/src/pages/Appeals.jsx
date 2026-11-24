// 이의 제기 (운영자 전용): 처리 알림을 받은 작성자가 보낸 이의 제기를 보고 받아들이거나 거절해요.
// 받아들이면: 지운 리뷰는 휴지통에서 되살리고, 숨긴 리뷰는 숨김을 풀어요. 답변은 작성자 알림 화면에 보여요.
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { appeals, fmtDate, me, nickOf, reportNo, reviews, run, trash, useStore } from '../lib/store.js';
import { supabase } from '../supabase.js';
import { BackBtn, Icon, Photo, Screen, ui } from '../ui/kit.jsx';
import { restore } from './Trash.jsx';

const TABS = [['open', '대기'], ['done', '처리함']];

export default function Appeals() {
  useStore();
  const [q, setQ] = useState('open'), u = me();
  if (!u) return <Navigate to="/login?next=%2Fappeals" replace />;
  if (!u.admin) return <Navigate to="/admin" replace />;
  const list = appeals().filter(a => (q === 'open') === (a.status === 'open'));
  return <Screen title="이의 제기">
    <div className="top line"><BackBtn to="/me" /><span className="ttl">이의 제기</span></div>
    <div className="seg">{TABS.map(([k, n]) => <button key={k} className={q === k ? 'on' : ''} onClick={() => setQ(k)}>{n}
      <span className="n num">{appeals().filter(a => (k === 'open') === (a.status === 'open')).length}</span></button>)}</div>
    <div className="body">{list.length ? list.map(a => <AppealCard key={a.id} a={a} />)
      : <div className="empty"><span className="ic"><Icon n="check" /></span><div className="t">{q === 'open' ? '기다리는 이의 제기가 없어요' : '처리한 이의 제기가 없어요'}</div></div>}</div>
  </Screen>;
}

function AppealCard({ a }) {
  const n = a.notice, nos = n.report_ids.map(id => reportNo('review', id)).join(' · ');
  const answer = async ok => {
    const reply = await ui.dialog({ title: ok ? '이의 제기를 받아들일까요?' : '이의 제기를 거절할까요?',
      body: ok ? (n.kind === 'review_deleted' ? '휴지통에서 리뷰를 되살려요.' : '리뷰 숨김을 풀어요.') + ' 작성자에게 보일 답변을 적어 주세요(선택).' : '작성자에게 보일 답변을 적어 주세요(선택).',
      ok: ok ? '받아들이기' : '거절하기', input: { max: 500, placeholder: '답변 (선택)', validate: () => '' } });
    if (reply === null) return;
    if (ok && !(await fix(n))) return;
    const { error } = await run(supabase.from('appeals').update({ status: ok ? 'accepted' : 'rejected', reply: reply || null, resolved_at: new Date().toISOString() }).eq('id', a.id));
    ui.toast(error ? '처리하지 못했어요. 다시 시도해 주세요' : ok ? '받아들였어요' : '거절했어요');
  };
  return <div className="review-card">
    <div className="meta"><span><b>{n.kind === 'review_deleted' ? '삭제된 리뷰' : '숨긴 리뷰'}</b> · {nickOf(a.user_id)} · {n.pin_name || '삭제된 핀'}</span><span>{fmtDate(Date.parse(a.created_at))}</span></div>
    <p className="quote">{n.body}</p>
    {n.photos.length > 0 && <div className="photos">{n.photos.map((p, i) => <Photo key={i} p={p} alt="처리된 리뷰 사진" zoom={n.photos} />)}</div>}
    <div className="report-line"><b>신고 번호</b> <span className="report-nos num">{nos}</span> · <span>{[...new Set(n.reasons)].join(', ')}</span></div>
    <div className="appeal-box"><b>이의 제기</b><p className="appeal-mine">{a.body}</p>{a.reply && <p className="appeal-reply">답변: {a.reply}</p>}</div>
    {a.status === 'open' ? <div className="decide"><button className="btn sm" onClick={() => answer(true)}>받아들이기</button>
      <button className="btn sm line" onClick={() => answer(false)}>거절</button></div>
      : <p className="footnote">{a.status === 'accepted' ? '받아들였어요' : '거절했어요'} · {fmtDate(Date.parse(a.resolved_at))}</p>}
  </div>;
}

// 받아들일 때 리뷰를 원래대로: 지운 건 휴지통에서 되살리고, 숨긴 건 숨김을 풀어요.
async function fix(n) {
  if (n.kind === 'review_deleted') {
    const t = trash().find(x => x.kind === 'review' && x.item_id === n.review_id);
    if (!t) { ui.toast('휴지통에 없는 리뷰예요. 7일이 지나 완전히 지워졌을 수 있어요'); return false; }
    return restore(t, false);
  }
  if (!reviews().some(r => r.id === n.review_id)) { ui.toast('이미 지워진 리뷰예요'); return false; }
  const { error } = await run(supabase.from('reviews').update({ hidden: false, admin_decision: 'ok' }).eq('id', n.review_id));
  if (error) { ui.toast('숨김을 풀지 못했어요. 다시 시도해 주세요'); return false; }
  return true;
}
