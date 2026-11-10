// 핀 설명 수정: 핀을 만든 사람만 (실서비스는 RLS로 서버에서 거부).
if (!needLogin()) throw new Error('login required');
const pin = pinById(qs.get('id'));
if (!pin) { go('home.html'); throw new Error('pin not found'); }
if (pin.author !== me().email) go(`pin.html?id=${pin.id}&toast=${encodeURIComponent('핀을 만든 사람만 설명을 고칠 수 있어요')}`);

$('#back').dataset.back = `pin.html?id=${pin.id}`;
$('#name').textContent = pin.name;
const d = $('#desc');
d.value = pin.desc || '';
const count = () => { $('#count').textContent = `${d.value.length} / 500`; };
d.addEventListener('input', count);
count();

$('#save').onclick = () => {
  const all = pins();
  all.find(p => p.id === pin.id).desc = d.value.trim();
  save('pins', all);
  clean();
  go(`pin.html?id=${pin.id}&toast=${encodeURIComponent('설명을 저장했어요')}`);
};
