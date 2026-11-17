// 핀 수정·삭제: 핀을 만든 사람만 (서버는 RLS로 거부). 다른 사람 리뷰가 달린 핀은 지울 수 없어요.
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { CATS, me, pinById, reviews, run } from '../lib/store.js';
import { supabase } from '../supabase.js';
import { log } from '../lib/log.js';
import { BackBtn, Screen, clean, ui } from '../ui/kit.jsx';

export default function PinEdit() {
  const [sp] = useSearchParams(), nav = useNavigate(), u = me(), pin = pinById(sp.get('id'));
  const [name, setName] = useState(pin?.name || ''), [cat, setCat] = useState(pin?.cat || ''), [desc, setDesc] = useState(pin?.desc || '');
  const [nameErr, setNameErr] = useState(''), [busy, setBusy] = useState(false);
  if (!u) return <Navigate to={`/login?next=${encodeURIComponent('/pin-edit?' + sp.toString())}`} replace />;
  if (!pin) return <Navigate to="/home" replace />;
  if (pin.author !== u.id) return <Navigate to={`/pin?id=${pin.id}&toast=${encodeURIComponent('핀을 만든 사람만 고칠 수 있어요')}`} replace />;

  const submit = async () => {
    const nm = name.trim();
    if (!nm) return setNameErr('핀 이름을 적어 주세요.');
    setBusy(true);
    const { error } = await run(supabase.from('pins').update({ name: nm, cat, description: desc.trim() }).eq('id', pin.id));
    setBusy(false);
    if (error) { log('pin.update', error); return ui.toast('저장하지 못했어요. 다시 시도해 주세요'); }
    clean();
    nav(`/pin?id=${pin.id}&toast=${encodeURIComponent('핀을 수정했어요')}`);
  };

  const remove = async () => {
    if (reviews().some(r => r.pin === pin.id && r.by !== u.id)) return ui.toast('다른 사람의 리뷰가 달린 핀은 지울 수 없어요');
    if (!(await ui.dialog({ title: '핀을 지울까요?', body: '내가 쓴 리뷰도 함께 지워지고, 되돌릴 수 없어요.', ok: '지우기', danger: true }))) return;
    setBusy(true);
    // 정책에 막히면 오류 없이 0건이 지워져서, 지운 행을 돌려받아 확인해요
    const { data, error } = await run(supabase.from('pins').delete().eq('id', pin.id).select('id'));
    setBusy(false);
    if (error || !data?.length) { log('pin.delete', error || '지운 핀 없음 (다른 사람 리뷰가 있거나 권한 없음)'); return ui.toast('핀을 지우지 못했어요'); }
    clean();
    nav(`/home?toast=${encodeURIComponent('핀을 지웠어요')}`, { replace: true });
  };

  return <Screen guard title="핀 수정">
    <div className="top line"><BackBtn to={`/pin?id=${pin.id}`} /><span className="ttl">핀 수정</span></div>
    <div className="body pad">
      <div className="field"><label htmlFor="name">핀 이름</label>
        <div className={`control ${nameErr ? 'bad' : ''}`}><input id="name" maxLength={30} value={name}
          onChange={e => { setName(e.target.value); setNameErr(''); }} /><span className="aside num">{name.length}/30</span></div>
        <div className="hint bad">{nameErr}</div></div>
      <div className="field"><span className="label">카테고리</span>
        <div className="chips wrap">{CATS.map(c => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div></div>
      <div className="field"><label htmlFor="desc">설명</label>
        <div className="control area"><textarea id="desc" rows={7} maxLength={500} placeholder="이 장소를 어떻게 쓰면 좋은지 적어 주세요. 예: 콘센트 자리, 붐비는 시간"
          value={desc} onChange={e => setDesc(e.target.value)} /></div>
        <div className="count num">{desc.length} / 500</div></div>
      <button type="button" className="text-link danger-link" disabled={busy} onClick={remove}>핀 지우기</button>
    </div>
    <div className="cta"><button className="btn" disabled={busy} onClick={submit}>{busy ? '저장 중…' : '저장'}</button></div>
  </Screen>;
}
