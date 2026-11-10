// 핀 상세: 정보·설명, 리뷰 목록(협찬·광고 라벨, 신고 숨김), 리뷰 메뉴 → 신고 시트, 찜하기 시트.
const pin = pinById(qs.get('id'));
const u = me();
if (!pin) { $('#page').hidden = $('#cta').hidden = true; $('#gone').hidden = false; throw new Error('pin not found'); }
document.title = `${pin.name} · Pin it!`;

const m = makeMap($('#map'), { center: [pin.lat + 0.0004, pin.lng], zoom: 16, interactive: false });
if (m) L.marker([pin.lat, pin.lng], { icon: markerIcon(pin, 'sel') }).addTo(m);

// ---------- 정보 ----------
const place = PLACES.find(p => p.id === pin.placeId);
const isMine = u?.email === pin.author;
$('#tags').innerHTML = `<span class="tag">${pin.kind === '위치' ? '위치 핀' : '장소'}</span><span class="tag">${esc(pin.cat)}</span>`;
$('#name').textContent = pin.name;
$('#meta').innerHTML = `<span>${esc(nickOf(pin.author))} 님의 핀</span>`
  + (place ? `<span>·</span><a class="text-link" target="_blank" rel="noopener" href="https://map.kakao.com/?q=${encodeURIComponent(place.name)}">카카오맵에서 보기</a>` : '');
$('#desc').textContent = pin.desc || (isMine ? '아직 설명이 없어요. 이 장소를 어떻게 쓰면 좋은지 적어 보세요.' : '아직 설명이 없어요.');
$('#desc').classList.toggle('is-empty', !pin.desc);
$('#edit').hidden = !isMine;
$('#edit').href = `pin-edit.html?id=${pin.id}`;

// ---------- 리뷰 ----------
function renderReviews() {
  const rs = pinReviews(pin.id);
  $('#rvCount').textContent = rs.filter(r => !r.hidden).length;
  $('#reviews').innerHTML = rs.length ? rs.map(r => reviewHTML(r, u)).join('')
    : `<div class="empty inline"><span class="ic">${icon('edit')}</span><div class="t">첫 리뷰를 남겨 보세요</div><div class="s">다녀온 경험이 다른 사람의 선택을 도와요.</div></div>`;
  const mine = rs.find(r => r.by === u?.email);
  $('#write').textContent = mine ? '내 리뷰 보기' : '리뷰 쓰기';
  $('#write').onclick = () => {
    if (mine) return $('#rv-' + mine.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const href = `review-new.html?pin=${pin.id}`;
    if (needLogin(href)) go(href);
  };
}
function renderLike() {
  const inMine = !!u && lists().some(l => l.owner === u.email && l.pins.includes(pin.id));
  $('#like').innerHTML = `${icon('heart')}<span class="num">${likeCount(pin.id)}</span>`;
  $('#like').classList.toggle('liked', inMine);
  $('#like').setAttribute('aria-label', inMine ? '찜한 핀 · 담을 리스트 바꾸기' : '찜하기');
}
renderReviews();
renderLike();

$('#share').onclick = async () => {
  const url = `${location.href.split('?')[0]}?id=${pin.id}`; // file:// 에서는 location.origin 이 "null"
  try {
    if (navigator.share) await navigator.share({ title: pin.name, url });
    else { await navigator.clipboard.writeText(url); toast('핀 링크를 복사했어요'); }
  } catch { /* 사용자가 공유를 취소 */ }
};

// ---------- 리뷰 메뉴 → 삭제(내 리뷰) / 신고(남의 리뷰) ----------
const REASONS = ['광고인데 표시가 없어요', '허위 정보예요', '욕설·비방이 있어요', '기타'];
$('#reviews').addEventListener('click', e => {
  const b = e.target.closest('[data-more]');
  if (!b) return;
  const r = reviews().find(x => x.id === b.dataset.more);
  if (u?.email === r.by) {
    sheet(`<div class="menu-sheet"><button class="danger" data-act="del">${icon('trash')}내 리뷰 삭제</button><button data-close>${icon('close')}닫기</button></div>`, (w, close) => {
      $('[data-act=del]', w).onclick = async () => {
        close();
        if (!(await dialog({ title: '리뷰를 삭제할까요?', body: '삭제한 리뷰는 되돌릴 수 없어요.', ok: '삭제', danger: true }))) return;
        save('reviews', reviews().filter(x => x.id !== r.id));
        renderReviews();
        toast('리뷰를 삭제했어요');
      };
    });
    return;
  }
  sheet(`<div class="menu-sheet"><button data-act="report">${icon('flag')}신고하기</button><button data-close>${icon('close')}닫기</button></div>`, (w, close) => {
    $('[data-act=report]', w).onclick = () => { close(); if (needLogin()) openReport(r.id); };
  });
});

function openReport(rid) {
  let reason = '';
  sheet(`<h3>리뷰 신고</h3><p class="lead">신고 이유를 골라 주세요. 신고한 사람은 공개되지 않아요.</p>
    <div data-reasons>${REASONS.map(x => `<button class="check" data-r="${x}"><span class="radio"></span><span class="fl">${x}</span></button>`).join('')}</div>
    <div class="acts"><button class="btn sec fixed-w" data-close>취소</button><button class="btn" data-send disabled>신고하기</button></div>`, (w, close) => {
    $('[data-reasons]', w).onclick = e => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      reason = b.dataset.r;
      $$('[data-r]', w).forEach(x => x.classList.toggle('on', x === b));
      $('[data-send]', w).disabled = false;
    };
    $('[data-send]', w).onclick = () => {
      const all = reviews(), r = all.find(x => x.id === rid);
      close();
      if (r.reports.some(x => x.by === u.email)) return toast('이미 신고한 리뷰예요');
      r.reports.push({ by: u.email, reason, at: Date.now() });
      if (new Set(r.reports.map(x => x.by)).size >= 3) r.hidden = true; // 서로 다른 계정 3건 → 자동 숨김
      save('reviews', all);
      renderReviews();
      toast(r.hidden ? '신고가 쌓여 리뷰를 가렸어요. 운영자가 검토해요' : '신고했어요. 운영자가 확인할게요');
    };
  });
}

// ---------- 찜하기: 여러 리스트에 담기 + 새 리스트(기본 비공개) ----------
$('#like').onclick = () => {
  if (!needLogin()) return;
  const mine = lists().filter(l => l.owner === u.email);
  const sel = new Set(mine.filter(l => l.pins.includes(pin.id)).map(l => l.id));
  let pub = false;
  const rows = mine.map(l => `<button class="check" data-l="${l.id}"><span class="box">${icon('check')}</span><span class="fl ell">${esc(l.name)}</span>
    <span class="tag ${l.public ? 'pub' : ''}">${icon(l.public ? 'globe' : 'lock')}${l.public ? '공개' : '비공개'}</span></button>`).join('');
  sheet(`<h3>리스트에 담기</h3><p class="lead">여러 리스트에 한 번에 담을 수 있어요.</p>
    <div data-lists>${rows || '<p class="empty-note">아직 리스트가 없어요. 아래에서 만들어 보세요.</p>'}</div>
    <div class="new-box"><div class="label">새 리스트</div>
      <div class="control"><input data-new maxlength="20" placeholder="리스트 이름"></div>
      <div class="switch-line"><span><b>공개</b> <span class="sub" data-pub-hint>· 끄면 나만 볼 수 있어요</span></span><span class="switch" data-pub role="switch" aria-checked="false" tabindex="0"></span></div></div>
    <button class="btn submit" data-save></button>`, (w, close) => {
    const sync = () => {
      $$('[data-l]', w).forEach(b => b.classList.toggle('on', sel.has(b.dataset.l)));
      const n = sel.size + ($('[data-new]', w).value.trim() ? 1 : 0);
      $('[data-save]', w).textContent = n ? `${n}개 리스트에 저장` : '저장';
    };
    $('[data-lists]', w).onclick = e => {
      const b = e.target.closest('[data-l]');
      if (!b) return;
      sel.has(b.dataset.l) ? sel.delete(b.dataset.l) : sel.add(b.dataset.l);
      sync();
    };
    $('[data-new]', w).oninput = sync;
    $('[data-pub]', w).onclick = () => {
      pub = !pub;
      $('[data-pub]', w).classList.toggle('on', pub);
      $('[data-pub]', w).setAttribute('aria-checked', pub);
      $('[data-pub-hint]', w).textContent = pub ? '· 링크와 검색으로 누구나 볼 수 있어요' : '· 끄면 나만 볼 수 있어요';
    };
    $('[data-save]', w).onclick = () => {
      const all = lists(), now = Date.now(), name = $('[data-new]', w).value.trim();
      all.forEach(l => {
        if (l.owner !== u.email) return;
        const has = l.pins.includes(pin.id), want = sel.has(l.id);
        if (has !== want) { l.pins = want ? [...l.pins, pin.id] : l.pins.filter(x => x !== pin.id); l.updated = now; }
      });
      if (name) all.push({ id: 'l' + uid(), name, owner: u.email, public: pub, token: uuid(), pins: [pin.id], updated: now });
      save('lists', all);
      close();
      renderLike();
      const n = sel.size + (name ? 1 : 0);
      toast(n ? `${n}개 리스트에 저장했어요` : '리스트에서 뺐어요', { label: '리스트 보기', href: 'lists.html' });
    };
    sync();
  });
};
