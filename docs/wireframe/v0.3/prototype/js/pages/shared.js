// 공유 리스트 보기: 로그인 없이 읽기만. 비공개·삭제·토큰 변조는 모두 같은 안내 (다른 리스트 존재를 드러내지 않음).
const l = lists().find(x => x.token === qs.get('t'));
$('#login').hidden = !!me();
if (!l || !l.public) {
  $('#blocked').hidden = false;
} else {
  document.title = `${l.name} · Pin it!`;
  $('#page').hidden = $('#cta').hidden = false;
  const ps = l.pins.map(pinById).filter(Boolean);
  $('#name').textContent = l.name;
  $('#meta').textContent = `${nickOf(l.owner)} 님의 리스트 · 핀 ${ps.length}`;
  $('#rows').innerHTML = ps.map(p => `<a class="row" href="pin.html?id=${p.id}"><span class="thumb tint">${icon('pin')}</span>
    <span class="fl"><span class="t ell">${esc(p.name)}</span><span class="s">${esc(p.desc || pinKind(p))}</span></span><span class="chev">${icon('chev', 'sm')}</span></a>`).join('')
    || '<div class="empty inline"><div class="s">아직 담긴 핀이 없어요.</div></div>';
  const m = makeMap($('#map'));
  addPins(m, ps);
  fitTo(m, ps);
}
