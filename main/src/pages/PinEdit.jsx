// 핀 설명 수정: 핀을 만든 사람만 (실서비스는 RLS로 서버에서 거부).
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { me, pinById, pins, save } from '../lib/store.js';
import { BackBtn, Screen, clean } from '../ui/kit.jsx';

export default function PinEdit() {
  const [sp] = useSearchParams(), nav = useNavigate(), u = me(), pin = pinById(sp.get('id'));
  const [desc, setDesc] = useState(pin?.desc || '');
  if (!u) return <Navigate to={`/login?next=${encodeURIComponent('/pin-edit?' + sp.toString())}`} replace />;
  if (!pin) return <Navigate to="/home" replace />;
  if (pin.author !== u.email) return <Navigate to={`/pin?id=${pin.id}&toast=${encodeURIComponent('핀을 만든 사람만 설명을 고칠 수 있어요')}`} replace />;
  const submit = () => {
    save('pins', pins().map(p => (p.id === pin.id ? { ...p, desc: desc.trim() } : p)));
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
