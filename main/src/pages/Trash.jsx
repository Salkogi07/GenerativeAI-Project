// 휴지통 (운영자 전용): 지운 리뷰·핀을 7일 동안 보관해요. 되살리면 원래 자리로 돌아가요.
// 7일이 지나면 서버(pg_cron)가 매일 03:00에 완전히 지워요.
import { Link, Navigate } from 'react-router-dom';
import { DAY, fmtDate, me, nickOf, pinById, reportNo, run, trash, useStore } from '../lib/store.js';
import { supabase } from '../supabase.js';
import { BackBtn, Icon, Photo, Screen, ui } from '../ui/kit.jsx';

const RESTORE_ERR = {
  pin_gone: '핀이 지워져 있어서 되살릴 수 없어요. 휴지통에서 핀을 먼저 되살려 주세요',
  23505: '같은 장소의 핀이나 같은 사람의 리뷰가 이미 있어서 되살릴 수 없어요',
};
// ask=false면 확인 없이 바로 되살려요(이의 제기를 받아들일 때)
export async function restore(t, ask = true) {
  const what = t.kind === 'pin' ? '핀을' : '리뷰를';
  if (ask && !(await ui.dialog({ title: `이 ${what} 되살릴까요?`, body: t.kind === 'review' ? '숨김이 풀린 상태로 돌아가요.' : '핀만 돌아와요. 함께 지워진 리뷰는 따로 되살려야 해요.', ok: '되살리기' }))) return false;
  const { error } = await run(supabase.rpc('restore_trash', { tid: t.id }));
  if (error) { ui.toast(RESTORE_ERR[error.code] || RESTORE_ERR[error.message] || '되살리지 못했어요. 다시 시도해 주세요'); return false; }
  ui.toast(`${what} 되살렸어요`);
  return true;
}

export function TrashCard({ t }) {
  const d = t.data, left = Math.max(0, 7 - Math.floor((Date.now() - Date.parse(t.deleted_at)) / DAY));
  const by = !t.deleted_by ? '' : t.deleted_by === d.author ? ' · 작성자가 지움' : ` · ${nickOf(t.deleted_by)}(운영자)가 지움`;
  const photos = d.photos || [];
  return <div className="review-card">
    <div className="meta"><span><b>{t.kind === 'pin' ? d.name : pinById(d.pin_id)?.name || '삭제된 핀'}</b> · {nickOf(d.author)}</span>
      <span className="tag">휴지통 · {left}일 남음</span></div>
    <p className="quote">{(t.kind === 'pin' ? d.description : d.body) || '설명이 없어요.'}</p>
    {photos.length > 0 && <div className="photos">{photos.map((p, i) => <Photo key={i} p={p} alt="지운 사진" zoom={photos} />)}</div>}
    <div className="report-line"><b>{t.kind === 'pin' ? '핀' : '리뷰'}</b> · <span>{fmtDate(Date.parse(t.deleted_at))}{by}</span>
      {t.report_ids.length > 0 && <span className="report-nos num">{t.report_ids.map(id => reportNo(t.kind, id)).join(' · ')}</span>}</div>
    <div className="decide"><button className="btn sm line" onClick={() => restore(t)}>되살리기</button></div>
  </div>;
}

export default function Trash() {
  useStore();
  const u = me();
  if (!u) return <Navigate to="/login?next=%2Ftrash" replace />;
  if (!u.admin) return <Navigate to="/admin" replace />;
  const list = trash();
  return <Screen title="휴지통">
    <div className="top line"><BackBtn to="/me" /><span className="ttl">휴지통</span></div>
    <div className="body">
      <p className="footnote">지운 리뷰·핀을 7일 동안 보관해요. 7일이 지나면 완전히 지워져요.</p>
      {list.length ? list.map(t => <TrashCard key={t.id} t={t} />)
        : <div className="empty"><span className="ic"><Icon n="trash" /></span><div className="t">휴지통이 비어 있어요</div><Link className="btn fit" to="/admin">리뷰 검토로 가기</Link></div>}
    </div>
  </Screen>;
}
