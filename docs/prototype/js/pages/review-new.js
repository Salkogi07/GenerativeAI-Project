// 리뷰 쓰기: 작성 제한 검사, 협찬·광고 체크, 사진(형식·용량 검사, 재인코딩으로 EXIF 제거).
if (!needLogin()) throw new Error('login required');
const u = me(), pin = pinById(qs.get('pin'));
if (!pin) { go('home.html'); throw new Error('pin not found'); }
$('#back').dataset.back = `pin.html?id=${pin.id}`;
$('#name').textContent = pin.name;

// 작성 제한 (1계정 1핀 1리뷰, 가입 7일 이내 하루 3개)
let blocked = false;
function block(title, text, action) {
  blocked = true;
  $('#blocked').hidden = false;
  $('#bT').textContent = title;
  $('#bS').textContent = text;
  if (action) { $('#bA').hidden = false; $('#bA').textContent = action[0]; $('#bA').href = action[1]; }
  $('#form').classList.add('form-locked');
}
if (reviews().some(r => r.pin === pin.id && r.by === u.email)) {
  block('이 핀에는 이미 리뷰를 남겼어요', '한 장소에는 리뷰를 하나만 쓸 수 있어요.', ['내 리뷰 보기', `pin.html?id=${pin.id}`]);
} else if (isNew(u) && todayCount(u) >= 3) {
  const free = new Date(u.created + 7 * DAY);
  block('오늘은 리뷰를 더 쓸 수 없어요', `가입 7일 이내 계정은 하루 3개까지 쓸 수 있어요. 내일 0시부터 다시 쓸 수 있고, ${free.getMonth() + 1}월 ${free.getDate()}일부터는 제한이 풀려요.`);
}

const photos = [];
const body = $('#body');
function sync() {
  $('#count').textContent = `${body.value.length} / 1000`;
  $('#adPreview').hidden = !$('#ad').checked;
  $('#ownWrap').hidden = !photos.length;
  $('#photos').innerHTML = photoTiles(photos);
  $('#submit').disabled = blocked || !body.value.trim() || (photos.length > 0 && !$('#own').checked);
}
body.addEventListener('input', sync);
$('#ad').onchange = sync;
$('#own').onchange = sync;
$('#photos').onclick = e => {
  const rm = e.target.closest('[data-rm]');
  if (rm) { photos.splice(+rm.dataset.rm, 1); sync(); return; }
  if (e.target.closest('[data-add]')) $('#file').click();
};

$('#file').onchange = async () => {
  $('#photoErr').textContent = await addPhotos([...$('#file').files], photos);
  $('#file').value = '';
  document.body.dataset.dirty = '1';
  sync();
};

$('#submit').onclick = () => {
  const all = reviews();
  all.push({ id: 'r' + uid(), pin: pin.id, by: u.email, body: body.value.trim(), ad: $('#ad').checked, photos: [...photos], at: Date.now(), reports: [] });
  if (!save('reviews', all)) return;
  clean();
  // 등록 뒤 AI 광고성 판정은 서버에서 따로 실행되고, 결과는 작성자에게 보이지 않음
  go(`pin.html?id=${pin.id}&toast=${encodeURIComponent('리뷰를 등록했어요')}`);
};
sync();
