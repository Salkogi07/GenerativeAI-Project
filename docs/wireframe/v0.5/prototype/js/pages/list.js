// 찜 리스트 상세: 공개·비공개 전환, 공유 링크(무작위 토큰), 핀 빼기(되돌리기), 이름 변경·삭제.
if (!needLogin()) throw new Error('login required');
const u = me();
const id = qs.get('id');
let l = lists().find(x => x.id === id);
if (!l) { go('lists.html'); throw new Error('list not found'); }
if (l.owner !== u.email) go('shared.html?t=' + l.token);

const update = fn => { const all = lists(), x = all.find(y => y.id === id); fn(x); x.updated = Date.now(); save('lists', all); l = x; };
const shareUrl = () => new URL('shared.html?t=' + l.token, location.href).href;
const m = makeMap($('#map'));
let layer = [];

function render() {
  document.title = `${l.name} · Pin it!`;
  $('#ttl').textContent = l.name;
  $('#pub').classList.toggle('on', l.public);
  $('#pubRow').setAttribute('aria-checked', l.public);
  $('#pubT').textContent = l.public ? '공개 리스트' : '비공개 리스트';
  $('#pubS').textContent = l.public ? '링크가 있는 누구나, 리스트 검색에서 볼 수 있어요.' : '나만 볼 수 있어요. 링크로도 열리지 않아요.';
  $('#copy').disabled = !l.public;
  $('#copyHint').hidden = l.public;
  const ps = l.pins.map(pinById).filter(Boolean);
  $('#empty').hidden = !!ps.length;
  $('#map').hidden = !ps.length;
  $('#rows').innerHTML = ps.map(p => `<div class="row pin-row"><a class="row-main" href="pin.html?id=${p.id}"><span class="thumb tint">${icon('pin')}</span>
      <span class="fl"><span class="t ell">${esc(p.name)}</span><span class="s ell">${esc(p.desc || pinKind(p))}</span></span></a>
    <button class="icon-btn muted" data-rm="${p.id}" aria-label="${esc(p.name)} 리스트에서 빼기">${icon('close', 'sm')}</button></div>`).join('');
  layer.forEach(x => x.remove());
  layer = addPins(m, ps);
  if (ps.length) setTimeout(() => { m?.invalidateSize(); fitTo(m, ps); }, 0);
}

$('#pubRow').onclick = async () => {
  if (l.public && !(await dialog({ title: '비공개로 바꿀까요?', body: '링크로 보던 사람도 더 이상 볼 수 없고, 리스트 검색에서도 빠져요.', ok: '비공개로 바꾸기' }))) return;
  update(x => { x.public = !x.public; });
  render();
  toast(l.public ? '공개 리스트가 됐어요' : '비공개 리스트가 됐어요');
};
$('#copy').onclick = async () => {
  try { await navigator.clipboard.writeText(shareUrl()); toast('링크를 복사했어요', { label: '열어 보기', href: shareUrl() }); }
  catch { await dialog({ title: '공유 링크', body: shareUrl(), cancel: '' }); }
};
$('#rows').onclick = e => {
  const b = e.target.closest('[data-rm]');
  if (!b) return;
  const pid = b.dataset.rm, idx = l.pins.indexOf(pid);
  update(x => { x.pins = x.pins.filter(y => y !== pid); });
  render();
  toast('리스트에서 뺐어요', { label: '되돌리기', fn: () => { update(x => { x.pins.splice(idx, 0, pid); }); render(); } });
};
$('#menu').onclick = () => sheet(`<div class="menu-sheet"><button data-act="rename">${icon('edit')}이름 바꾸기</button>
  <button class="danger" data-act="del">${icon('trash')}리스트 삭제</button><button data-close>${icon('close')}닫기</button></div>`, (w, close) => {
  $('[data-act=rename]', w).onclick = async () => {
    close();
    const name = await dialog({ title: '리스트 이름 바꾸기', ok: '저장', input: { value: l.name, max: 20, validate: v => (v ? '' : '리스트 이름을 적어 주세요') } });
    if (name) { update(x => { x.name = name; }); render(); toast('이름을 바꿨어요'); }
  };
  $('[data-act=del]', w).onclick = async () => {
    close();
    if (!(await dialog({ title: '리스트를 삭제할까요?', body: '담긴 핀은 지워지지 않지만, 공유 링크는 더 이상 열리지 않아요.', ok: '삭제', danger: true }))) return;
    save('lists', lists().filter(x => x.id !== id));
    go('lists.html?toast=' + encodeURIComponent('리스트를 삭제했어요'));
  };
});
render();
