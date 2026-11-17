// 핀 찍기: 지도에서 위치 지정, 이름 직접 입력(장소 데이터로 미리 채우지 않음), 중복·근접 핀 확인.
// 장소 연결은 검색에서 장소를 골라 들어올 때만 (?place=)
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { addPhotos, cats, dist, me, pins, region, run, uploadPhotos } from '../lib/store.js';
import { supabase } from '../supabase.js';
import { placeById } from '../lib/places.js';
import { BackBtn, Icon, MapGrip, PhotoPicker, Screen, clean, markDirty, ui } from '../ui/kit.jsx';
import { L, addPins, markerIcon, useMap } from '../ui/map.js';

export default function PinNew() {
  const u = me(), [sp] = useSearchParams();
  if (!u) return <Navigate to={`/login?next=${encodeURIComponent('/pin-new?' + sp.toString())}`} replace />;
  return <PinNewForm u={u} sp={sp} />;
}

// 다른 핀을 보러 갔다가 뒤로 돌아오면 작성 중이던 내용을 되살려요 (같은 주소일 때만, 한 번)
const DRAFT = 'pinit.pinDraft';
function takeDraft(search) {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT));
    sessionStorage.removeItem(DRAFT);
    return d?.search === search ? d : null;
  } catch { return null; }
}

function PinNewForm({ u, sp }) {
  const nav = useNavigate();
  const placeId = sp.get('place'), link = placeId || '';
  const [draft] = useState(() => takeDraft(sp.toString()));
  const start = draft ? [draft.pos.lat, draft.pos.lng] : sp.get('lat') ? [+sp.get('lat'), +sp.get('lng')] : region().slice(1);
  const [pos, setPos] = useState({ lat: start[0], lng: start[1] });
  const [name, setName] = useState(draft?.name || ''), [nameErr, setNameErr] = useState('');
  const [desc, setDesc] = useState(draft?.desc || ''), [cat, setCat] = useState(draft?.cat || ''), [ad, setAd] = useState(!!draft?.ad);
  const [photos, setPhotos] = useState(draft?.photos || []), [photoErr, setPhotoErr] = useState(''), [own, setOwn] = useState(!!draft?.own), [busy, setBusy] = useState(false);
  const [ref, map] = useMap({ center: start, zoom: 17 });
  const mkRef = useRef(null), nameRef = useRef(null), cur = useRef(null);
  cur.current = { search: sp.toString(), pos, name, desc, cat, ad, photos, own };
  useEffect(() => { if (draft) markDirty(); }, []);
  // 작성 내용을 잠시 맡기고 다른 핀으로
  const visit = id => {
    try { sessionStorage.setItem(DRAFT, JSON.stringify(cur.current)); } catch { /* 사진이 너무 크면 못 맡겨요 */ }
    clean(); nav(`/pin?id=${id}`);
  };

  // 검색에서 장소를 골라 들어오면 그 장소 위치에서 시작. 이미 핀이 있으면 기존 핀으로 (중복 핀 방지)
  useEffect(() => {
    if (!placeId) return;
    const existing = pins().find(p => String(p.placeId) === placeId);
    if (existing) return void nav(`/pin?id=${existing.id}&toast=${encodeURIComponent('이미 핀이 있는 장소예요')}`, { replace: true });
    if (draft) return;
    placeById(placeId).then(p => { if (p) { setPos({ lat: p.lat, lng: p.lng }); map?.setView([p.lat, p.lng], 17); } });
  }, [placeId, map]);

  useEffect(() => {
    if (!map) return;
    const mk = L.marker([pos.lat, pos.lng], { icon: markerIcon(null, 'new sel'), draggable: true }).addTo(map);
    mkRef.current = mk;
    const others = addPins(map, pins(), p => ui.toast(`이미 있는 핀: ${p.name}`, { label: '보기', fn: () => visit(p.id) }));
    const move = ll => setPos({ lat: ll.lat, lng: ll.lng });
    const onMap = e => move(e.latlng);
    map.on('click contextmenu', onMap);
    mk.on('dragend', () => move(mk.getLatLng()));
    return () => { map.off('click contextmenu', onMap); mk.remove(); others.forEach(m => m.remove()); };
  }, [map]);
  useEffect(() => { mkRef.current?.setLatLng([pos.lat, pos.lng]); }, [pos]);

  const submit = async () => {
    const nm = name.trim();
    if (!nm) { setNameErr('핀 이름을 적어 주세요.'); nameRef.current.focus(); return; }
    if (!cat) return ui.toast('카테고리를 골라 주세요');
    if (photos.length && !own) return ui.toast('직접 찍은 사진인지 확인해 주세요');
    const all = pins();
    if (!link) { // 반경 30m 안 핀이 있으면 기존 핀 제안
      const close = all.find(p => dist(pos, p) <= 30);
      if (close && await ui.dialog({ title: '근처에 비슷한 핀이 있어요', body: `30m 안에 "${close.name}" 핀이 있어요. 그 핀을 쓸까요?`, ok: '기존 핀 보기', cancel: '새로 만들기' })) {
        return visit(close.id);
      }
    }
    setBusy(true);
    const urls = await uploadPhotos(photos);
    const { data, error } = urls ? await run(supabase.from('pins').insert({ name: nm, cat, place_id: link ? Number(link) : null,
      lat: +pos.lat.toFixed(6), lng: +pos.lng.toFixed(6), description: desc.trim(), ad, photos: urls }).select('id').single()) : { error: { code: 'photo' } };
    setBusy(false);
    if (error) return ui.toast(error.code === 'photo' ? '사진을 올리지 못했어요. 다시 시도해 주세요'
      : error.code === '23505' ? '방금 다른 사람이 이 장소에 핀을 남겼어요. 검색에서 다시 찾아 주세요' : '핀을 저장하지 못했어요. 다시 시도해 주세요');
    clean();
    nav(`/pin?id=${data.id}&toast=${encodeURIComponent('핀을 남겼어요. 모든 사람의 지도에 보여요')}`, { replace: true });
  };

  return <Screen nav="홈" guard title="핀 찍기">
    <div className="top line"><BackBtn to="/home" /><span className="ttl">핀 찍기</span></div>
    <div className="body">
      <div className="map h250" ref={ref}>
        <div className="float guide"><Icon n="info" cls="sm" />지도를 누르거나 길게 눌러 위치를 정하세요. 핀은 끌어서 옮길 수 있어요.</div>
      </div>
      <MapGrip mapRef={ref} map={map} />
      <div className="pad">
        <div className="field"><label htmlFor="name">핀 이름</label>
          <div className={`control ${nameErr ? 'bad' : ''}`}><input id="name" ref={nameRef} maxLength={30} placeholder="예: 노을 보는 벤치" value={name}
            onChange={e => { setName(e.target.value); setNameErr(''); }} /><span className="aside num">{name.length}/30</span></div>
          <div className="hint bad">{nameErr}</div></div>
        <div className="field"><span className="label">카테고리</span>
          <div className="chips wrap">{cats().map(({ name: c, icon }) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{icon} {c}</button>)}</div></div>
        <div className="field"><label htmlFor="desc">설명 <span className="opt-note">· 선택</span></label>
          <div className="control area"><textarea id="desc" rows={4} maxLength={500} placeholder="이 장소를 어떻게 쓰면 좋은지 적어 주세요. 예: 콘센트 자리, 붐비는 시간"
            value={desc} onChange={e => setDesc(e.target.value)} /></div>
          <div className="count num">{desc.length} / 500</div></div>
        <label className="check boxed ad-check">
          <input type="checkbox" checked={ad} onChange={e => setAd(e.target.checked)} /><span className="box"><Icon n="check" /></span>
          <span className="fl"><b>협찬·대가를 받았어요</b><span className="note">돈·제품·할인을 받고 남기는 핀이라면 꼭 체크해 주세요. 핀 설명 위에 표시가 붙어요.</span>
            {ad && <span className="ad-preview"><span className="ad-label">협찬·광고</span></span>}</span></label>
        <div className="field last"><span className="label">사진 <span className="opt-note">· 선택, 최대 3장 · 장당 5MB · JPG·PNG·WebP</span></span>
          <PhotoPicker photos={photos} onRemove={i => setPhotos(photos.filter((_, j) => j !== i))}
            onAdd={async files => { const next = [...photos]; setPhotoErr(await addPhotos(files, next)); setPhotos(next); }} />
          <div className="hint bad">{photoErr}</div>
          {photos.length > 0 && <label className="check own-check"><input type="checkbox" checked={own} onChange={e => setOwn(e.target.checked)} /><span className="box"><Icon n="check" /></span><span className="fl">직접 찍은 사진이에요 <span className="req">필수</span></span></label>}
        </div>
      </div>
    </div>
    <div className="cta"><button className="btn" disabled={busy} onClick={submit}>{busy ? '저장 중…' : '핀 저장'}</button></div>
  </Screen>;
}
