// 내 찜 리스트: 목록(공개·비공개), 새 리스트(기본 비공개).
const u = me();
function render() {
  if (!u) { $('#guest').hidden = false; $('#add').hidden = true; return; }
  const mine = lists().filter(l => l.owner === u.email).sort((a, b) => b.updated - a.updated);
  $('#empty').hidden = !!mine.length;
  $('#addWrap').hidden = !mine.length;
  $('#rows').innerHTML = mine.map(l => `<a class="row" href="list.html?id=${l.id}">
    <span class="thumb ${l.public ? 'tint' : ''}">${icon(l.public ? 'globe' : 'lock')}</span>
    <span class="fl"><span class="t ell">${esc(l.name)}</span><span class="s">핀 ${l.pins.length} · ${ago(l.updated)} 수정</span></span>
    <span class="tag ${l.public ? 'pub' : ''}">${l.public ? '공개' : '비공개'}</span></a>`).join('');
}
async function create() {
  if (!needLogin()) return;
  const name = await dialog({ title: '새 리스트', body: '처음에는 나만 볼 수 있는 비공개 리스트로 만들어져요.', ok: '만들기',
    input: { placeholder: '예: 성수 카페 투어', max: 20, validate: v => (v ? '' : '리스트 이름을 적어 주세요') } });
  if (!name) return;
  const all = lists(), l = { id: 'l' + uid(), name, owner: u.email, public: false, token: uuid(), pins: [], updated: Date.now() };
  all.push(l);
  save('lists', all);
  go(`list.html?id=${l.id}&toast=${encodeURIComponent('리스트를 만들었어요')}`);
}
['#add', '#add2', '#add3'].forEach(s => { $(s).onclick = create; });
render();
