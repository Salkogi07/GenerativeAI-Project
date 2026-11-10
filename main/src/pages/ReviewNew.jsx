// 리뷰 쓰기: 작성 제한 검사, 협찬·광고 체크, 사진(형식·용량 검사, 재인코딩으로 EXIF 제거).
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { DAY, addPhotos, isNew, me, pinById, reviews, save, todayCount, uid } from '../lib/store.js';
import { BackBtn, Icon, PhotoPicker, Screen, clean, ui } from '../ui/kit.jsx';

export default function ReviewNew() {
  const [sp] = useSearchParams(), nav = useNavigate(), u = me(), pin = pinById(sp.get('pin'));
  const [body, setBody] = useState(''), [ad, setAd] = useState(false), [own, setOwn] = useState(false);
  const [photos, setPhotos] = useState([]), [photoErr, setPhotoErr] = useState('');
  if (!u) return <Navigate to={`/login?next=${encodeURIComponent('/review-new?' + sp.toString())}`} replace />;
  if (!pin) return <Navigate to="/home" replace />;

  // 작성 제한 (1계정 1핀 1리뷰, 가입 7일 이내 하루 3개)
  let block = null;
  if (reviews().some(r => r.pin === pin.id && r.by === u.email)) {
    block = ['이 핀에는 이미 리뷰를 남겼어요', '한 장소에는 리뷰를 하나만 쓸 수 있어요.', ['내 리뷰 보기', `/pin?id=${pin.id}`]];
  } else if (isNew(u) && todayCount(u) >= 3) {
    const free = new Date(u.created + 7 * DAY);
    block = ['오늘은 리뷰를 더 쓸 수 없어요', `가입 7일 이내 계정은 하루 3개까지 쓸 수 있어요. 내일 0시부터 다시 쓸 수 있고, ${free.getMonth() + 1}월 ${free.getDate()}일부터는 제한이 풀려요.`];
  }
  const ok = !block && body.trim() && (!photos.length || own);
  const submit = () => {
    const all = [...reviews(), { id: 'r' + uid(), pin: pin.id, by: u.email, body: body.trim(), ad, photos: [...photos], at: Date.now(), reports: [] }];
    if (!save('reviews', all)) return ui.toast('저장 공간이 부족해요. 사진 수를 줄여 주세요.');
    clean();
    // 등록 뒤 AI 광고성 판정은 서버에서 따로 실행되고, 결과는 작성자에게 보이지 않음
    nav(`/pin?id=${pin.id}&toast=${encodeURIComponent('리뷰를 등록했어요')}`);
  };

  return <Screen guard title="리뷰 쓰기">
    <div className="top line"><BackBtn to={`/pin?id=${pin.id}`} /><span className="ttl">리뷰 쓰기</span></div>
    <div className="body pad">
      <div className="context-label">리뷰할 곳</div>
      <div className="context-name">{pin.name}</div>
      {block && <div className="notice warn gap-b"><b>{block[0]}</b><div className="s">{block[1]}</div>{block[2] && <Link className="btn sm line" to={block[2][1]}>{block[2][0]}</Link>}</div>}
      <div className={block ? 'form-locked' : ''}>
        <div className="field"><label htmlFor="body">리뷰</label>
          <div className="control area"><textarea id="body" rows={6} maxLength={1000} placeholder="직접 다녀온 경험을 적어 주세요. 좋았던 점, 아쉬운 점, 붐비는 시간 등"
            value={body} onChange={e => setBody(e.target.value)} /></div>
          <div className="count num">{body.length} / 1000</div></div>
        <label className="check boxed ad-check">
          <input type="checkbox" checked={ad} onChange={e => setAd(e.target.checked)} /><span className="box"><Icon n="check" /></span>
          <span className="fl"><b>협찬·대가를 받았어요</b><span className="note">돈·제품·할인을 받았다면 꼭 체크해 주세요. 리뷰 맨 위에 표시가 붙어요.</span>
            {ad && <span className="ad-preview"><span className="ad-label">협찬·광고</span></span>}</span>
        </label>
        <div className="field"><span className="label">사진 <span className="opt-note">· 선택, 최대 3장 · 장당 5MB · JPG·PNG·WebP</span></span>
          <PhotoPicker photos={photos} onRemove={i => setPhotos(photos.filter((_, j) => j !== i))}
            onAdd={async files => { const next = [...photos]; setPhotoErr(await addPhotos(files, next)); setPhotos(next); }} />
          <div className="hint bad">{photoErr}</div>
          {photos.length > 0 && <label className="check own-check"><input type="checkbox" checked={own} onChange={e => setOwn(e.target.checked)} /><span className="box"><Icon n="check" /></span><span className="fl">직접 찍은 사진이에요 <span className="req">필수</span></span></label>}
        </div>
      </div>
    </div>
    <div className="cta"><button className="btn" disabled={!ok} onClick={submit}>등록</button></div>
  </Screen>;
}
