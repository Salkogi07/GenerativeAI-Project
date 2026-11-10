// 핀 찍기: 지도에서 위치 지정, 이름 직접 입력(장소 데이터로 미리 채우지 않음), 근처 장소(Supabase) 연결, 중복·근접 핀 확인.
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { CATS, CENTER, addPhotos, dist, fmtDist, me, pins, save, uid } from '../lib/store.js';
import { nearPlaces, placeById } from '../lib/places.js';
import { BackBtn, Icon, PhotoPicker, Screen, clean, ui } from '../ui/kit.jsx';
import { L, addPins, markerIcon, useMap } from '../ui/map.js';

export default function PinNew() {
  const u = me(), [sp] = useSearchParams();
  if (!u) return <Navigate to={`/login?next=${encodeURIComponent('/pin-new?' + sp.toString())}`} replace />;
  return <PinNewForm u={u} sp={sp} />;
}

function PinNewForm({ u, sp }) {
  const nav = useNavigate();
  const placeId = sp.get('place');
  const start = sp.get('lat') ? [+sp.get('lat'), +sp.get('lng')] : CENTER;
  const [pos, setPos] = useState({ lat: start[0], lng: start[1] });
  const [name, setName] = useState(''), [nameErr, setNameErr] = useState('');
  const [cat, setCat] = useState(''), [link, setLink] = useState(placeId || '');
  const [near, setNear] = useState([]), [photos, setPhotos] = useState([]), [photoErr, setPhotoErr] = useState(''), [own, setOwn] = useState(false);
  const [ref, map] = useMap({ center: start, zoom: 17 });
  const mkRef = useRef(null), nameRef = useRef(null);

  // 검색에서 장소를 골라 들어오면 그 장소 위치에서 시작. 이미 핀이 있으면 기존 핀으로 (중복 핀 방지)
  useEffect(() => {
    if (!placeId) return;
    const existing = pins().find(p => String(p.placeId) === placeId);
    if (existing) return void nav(`/pin?id=${existing.id}&toast=${encodeURIComponent('이미 핀이 있는 장소예요')}`, { replace: true });
    placeById(placeId).then(p => { if (p) { setPos({ lat: p.lat, lng: p.lng }); map?.setView([p.lat, p.lng], 17); } });
  }, [placeId, map]);

  useEffect(() => {
    if (!map) return;
    const mk = L.marker([pos.lat, pos.lng], { icon: markerIcon(null, 'new sel'), draggable: true }).addTo(map);
    mkRef.current = mk;
    const others = addPins(map, pins(), p => ui.toast(`이미 있는 핀: ${p.name}`, { label: '보기', to: `/pin?id=${p.id}` }));
    const move = ll => setPos({ lat: ll.lat, lng: ll.lng });
    const onMap = e => move(e.latlng);
    map.on('click contextmenu', onMap);
    mk.on('dragend', () => move(mk.getLatLng()));
    return () => { map.off('click contextmenu', onMap); mk.remove(); others.forEach(m => m.remove()); };
  }, [map]);
  useEffect(() => { mkRef.current?.setLatLng([pos.lat, pos.lng]); }, [pos]);

  // 300m 안 장소. 고른 장소가 범위를 벗어나면 연결을 풀어요
  useEffect(() => {
    let live = true;
    nearPlaces(pos).then(ps => {
      if (!live) return;
      setNear(ps);
      setLink(l => (l && !ps.some(p => String(p.id) === String(l)) && String(l) !== placeId ? '' : l));
    });
    return () => { live = false; };
  }, [pos.lat, pos.lng]);

  const pickPlace = async p => {
    const id = p ? String(p.id) : '';
    const dup = id && pins().find(x => String(x.placeId) === id);
    if (dup) {
      if (await ui.dialog({ title: '이미 핀이 있는 장소예요', body: `"${dup.name}" 핀으로 이동할까요? 새 핀은 만들지 않아요.`, ok: '핀으로 이동' })) { clean(); nav(`/pin?id=${dup.id}`); }
      return;
    }
    setLink(id);
    if (p && !cat && CATS.includes(p.cat)) setCat(p.cat);
  };

  const submit = async () => {
    const nm = name.trim();
    if (!nm) { setNameErr('핀 이름을 적어 주세요.'); nameRef.current.focus(); return; }
    if (!cat) return ui.toast('카테고리를 골라 주세요');
    if (photos.length && !own) return ui.toast('직접 찍은 사진인지 확인해 주세요');
    const all = pins();
    if (!link) { // 반경 30m 안 핀이 있으면 기존 핀 제안
      const close = all.find(p => dist(pos, p) <= 30);
      if (close && await ui.dialog({ title: '근처에 비슷한 핀이 있어요', body: `30m 안에 "${close.name}" 핀이 있어요. 그 핀을 쓸까요?`, ok: '기존 핀 보기', cancel: '새로 만들기' })) {
        clean(); return nav(`/pin?id=${close.id}`);
      }
    }
    const p = { id: 'p' + uid(), name: nm, cat, kind: link ? '장소' : '위치', placeId: link ? Number(link) : undefined,
      lat: +pos.lat.toFixed(6), lng: +pos.lng.toFixed(6), desc: '', photos: [...photos], author: u.email, created: Date.now() };
    if (!save('pins', [...all, p])) return ui.toast('저장 공간이 부족해요. 사진 수를 줄여 주세요.');
    clean();
    nav(`/pin?id=${p.id}&toast=${encodeURIComponent('핀을 남겼어요. 모든 사람의 지도에 보여요')}`);
  };

  const linked = near.find(p => String(p.id) === String(link));
  return <Screen nav="홈" guard title="핀 찍기">
    <div className="top line"><BackBtn to="/home" /><span className="ttl">핀 찍기</span></div>
    <div className="body">
      <div className="map h250" ref={ref}>
        <div className="float guide"><Icon n="info" cls="sm" />지도를 누르거나 길게 눌러 위치를 정하세요. 핀은 끌어서 옮길 수 있어요.</div>
      </div>
      <div className="pad">
        <div className="field"><label htmlFor="name">핀 이름</label>
          <div className={`control ${nameErr ? 'bad' : ''}`}><input id="name" ref={nameRef} maxLength={30} placeholder="예: 노을 보는 벤치" value={name}
            onChange={e => { setName(e.target.value); setNameErr(''); }} /><span className="aside num">{name.length}/30</span></div>
          <div className="hint bad">{nameErr}</div></div>
        <div className="field"><span className="label">카테고리</span>
          <div className="chips wrap">{CATS.map(c => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div></div>
        <div className="field"><span className="label">사진 <span className="opt-note">· 선택, 최대 3장 · 장당 5MB · JPG·PNG·WebP</span></span>
          <PhotoPicker photos={photos} onRemove={i => setPhotos(photos.filter((_, j) => j !== i))}
            onAdd={async files => { const next = [...photos]; setPhotoErr(await addPhotos(files, next)); setPhotos(next); }} />
          <div className="hint bad">{photoErr}</div>
          {photos.length > 0 && <label className="check own-check"><input type="checkbox" checked={own} onChange={e => setOwn(e.target.checked)} /><span className="box"><Icon n="check" /></span><span className="fl">직접 찍은 사진이에요 <span className="req">필수</span></span></label>}
        </div>
        <div className="field last"><span className="label">근처 장소 연결 <span className="opt-note">· 선택</span></span>
          <button className={`check ${!link ? 'on' : ''}`} onClick={() => pickPlace(null)}><span className="radio" /><span className="fl">연결 안 함 <span className="near-meta">· 가게가 아닌 위치 핀</span></span></button>
          {link && !linked && String(link) === placeId && <button className="check on"><span className="radio" /><span className="fl">검색에서 고른 장소</span></button>}
          {near.map(p => <button key={p.id} className={`check ${String(link) === String(p.id) ? 'on' : ''}`} onClick={() => pickPlace(p)}>
            <span className="radio" /><span className="fl">{p.name} <span className="near-meta num">· {p.cat} · {fmtDist(p.d)}</span></span></button>)}
          {!near.length && <p className="near-empty">300m 안에 연결할 장소가 없어요.</p>}
        </div>
      </div>
    </div>
    <div className="cta"><button className="btn" onClick={submit}>핀 저장</button></div>
  </Screen>;
}
