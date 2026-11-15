// 핀 설명 수정: 핀을 만든 사람만 (서버는 RLS로 거부).
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { me, pinById, run } from '../lib/store.js';
import { supabase } from '../supabase.js';
import { BackBtn, Screen, clean, ui } from '../ui/kit.jsx';

export default function PinEdit() {
  const [sp] = useSearchParams(), nav = useNavigate(), u = me(), pin = pinById(sp.get('id'));
  const [desc, setDesc] = useState(pin?.desc || '');
  if (!u) return <Navigate to={`/login?next=${encodeURIComponent('/pin-edit?' + sp.toString())}`} replace />;
  if (!pin) return <Navigate to="/home" replace />;
  if (pin.author !== u.id) return <Navigate to={`/pin?id=${pin.id}&toast=${encodeURIComponent('핀을 만든 사람만 설명을 고칠 수 있어요')}`} replace />;
  const submit = async () => {
    const { error } = await run(supabase.from('pins').update({ description: desc.trim() }).eq('id', pin.id));
    if (error) return ui.toast('저장하지 못했어요. 다시 시도해 주세요');
    clean();
    nav(`/pin?id=${pin.id}&toast=${encodeURIComponent('설명을 저장했어요')}`);
  };
  return <Screen guard title="설명 수정">
    <div className="top line"><BackBtn to={`/pin?id=${pin.id}`} /><span className="ttl">설명 수정</span></div>
    <div className="body pad">
      <div className="context-label">핀</div>
      <div className="context-name">{pin.name}</div>
      <div className="field"><label htmlFor="desc">설명</label>
        <div className="control area"><textarea id="desc" rows={7} maxLength={500} placeholder="이 장소를 어떻게 쓰면 좋은지 적어 주세요. 예: 콘센트 자리, 붐비는 시간"
          value={desc} onChange={e => setDesc(e.target.value)} /></div>
        <div className="count num">{desc.length} / 500</div></div>
    </div>
    <div className="cta"><button className="btn" onClick={submit}>저장</button></div>
  </Screen>;
}
