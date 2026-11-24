// 알림: 신고된 내 리뷰를 운영자가 숨기거나 지우면 여기에 와요(서버 트리거가 notices에 써요).
// 무엇이 처리됐는지(본문·사진), 신고 번호·이유를 보여 주고, 알림마다 한 번 이의 제기를 할 수 있어요.
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { appeals, fmtDate, me, notices, refresh, reportNo, run, useStore } from '../lib/store.js';
import { supabase } from '../supabase.js';
import { BackBtn, Icon, Photo, Screen, ui } from '../ui/kit.jsx';

const KIND = { review_hidden: '리뷰가 숨겨졌어요', review_deleted: '리뷰가 삭제됐어요' };
const STATUS = { open: '운영자가 확인하고 있어요', accepted: '이의 제기가 받아들여졌어요', rejected: '이의 제기가 받아들여지지 않았어요' };
const nosOf = n => n.report_ids.map(id => reportNo('review', id)).join(', ');

export default function Notices() {
  useStore();
  const u = me(), list = notices();
  // 열어 보면 읽음으로 표시해요 (마이페이지 빨간 숫자가 사라져요)
  useEffect(() => {
    const unread = list.filter(n => !n.read_at).map(n => n.id);
    if (unread.length) supabase.from('notices').update({ read_at: new Date().toISOString() }).in('id', unread).then(() => refresh().catch(() => {}));
  }, [list.length]);
  if (!u) return <Navigate to="/login?next=%2Fnotices" replace />;

  return <Screen nav="마이페이지" title="알림">
    <div className="top line"><BackBtn to="/me" /><span className="ttl">알림</span></div>
    <div className="body">{list.length ? list.map(n => <NoticeCard key={n.id} n={n} />)
      : <div className="empty"><span className="ic"><Icon n="mail" /></span><div className="t">새 알림이 없어요</div><div className="s">신고된 내 리뷰를 운영자가 처리하면 여기에 알려 드려요.</div></div>}</div>
  </Screen>;
}

function NoticeCard({ n }) {
  const a = appeals().find(x => x.notice_id === n.id);
  const why = [...new Set(n.reasons)].join(', ');
  return <div className="review-card notice-card">
    <div className="meta"><span><b>{KIND[n.kind]}</b></span><span>{fmtDate(Date.parse(n.created_at))}</span></div>
    <p className="notice-where"><Icon n="pin" cls="xs" />{n.pin_name || '삭제된 핀'}</p>
    <p className="quote">{n.body}</p>
    {n.photos.length > 0 && <div className="photos">{n.photos.map((p, i) => <Photo key={i} p={p} alt="처리된 리뷰 사진" zoom={n.photos} />)}</div>}
    <div className="report-line"><b>신고 번호 <span className="num">{nosOf(n)}</span></b>{why && <> · <span>{why}</span></>}</div>
    {a ? <div className={`appeal-box ${a.status}`}>
      <b>{STATUS[a.status]}</b>
      <p className="appeal-mine">내 이의 제기: {a.body}</p>
      {a.reply && <p className="appeal-reply">운영자 답변: {a.reply}</p>}
    </div> : <>
      <p className="footnote notice-help">잘못 처리됐다고 생각하면 이의 제기를 해 주세요. 신고 번호({nosOf(n)})가 함께 운영자에게 전달돼요.</p>
      <div className="decide"><button className="btn sm line" onClick={() => ui.sheet(close => <AppealSheet n={n} close={close} />)}>이의 제기하기</button></div>
    </>}
  </div>;
}

function AppealSheet({ n, close }) {
  const [body, setBody] = useState(''), [busy, setBusy] = useState(false);
  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    const { error } = await run(supabase.from('appeals').insert({ notice_id: n.id, body: body.trim() }));
    setBusy(false);
    if (error) return ui.toast(error.code === '23505' ? '이미 이의 제기를 했어요' : '보내지 못했어요. 다시 시도해 주세요');
    close();
    ui.toast('이의 제기를 보냈어요. 운영자가 확인하면 여기에 답변이 와요');
  };
  return <><h3>이의 제기</h3>
    <p className="lead">신고 번호 <b className="num">{nosOf(n)}</b>에 대한 이의 제기예요. 운영자가 확인하고 답변해요.</p>
    <div className="control area"><textarea rows={5} maxLength={1000} value={body} autoFocus placeholder="왜 문제가 없는지 적어 주세요. 예: 직접 돈을 내고 다녀왔어요."
      onChange={e => setBody(e.target.value)} aria-label="이의 제기 내용" /></div>
    <div className="count num">{body.length} / 1000</div>
    <div className="acts"><button className="btn sec fixed-w" onClick={close}>취소</button><button className="btn" disabled={!body.trim() || busy} onClick={send}>보내기</button></div></>;
}
