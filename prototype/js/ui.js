// Shared UI: icons, app chrome, toast, dialog, bottom sheet, policy docs, review card. Depends on core.js, data.js.
const ICONS = {
  back: '<path d="M15 18l-6-6 6-6"/>', close: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.2-6 8-6s6.8 2 8 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12.5 10 17l9-10"/>',
  locate: '<circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  lock: '<rect x="4.5" y="11" width="15" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  chev: '<path d="m9 18 6-6-6-6"/>', pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.5 4.5-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
};
const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const hydrateIcons = (root = document) => $$('i[data-i]', root).forEach(el => { el.outerHTML = icon(el.dataset.i, el.className); });

// ---------- toast / dialog / sheet ----------
function toast(msg, action) {
  $('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast' + ($('.tabbar') ? '' : $('.cta:not([hidden])') ? ' over-cta' : ' low');
  t.setAttribute('role', 'status');
  t.innerHTML = `<span>${esc(msg)}</span>`;
  if (action) {
    const b = document.createElement(action.href ? 'a' : 'button');
    b.textContent = action.label;
    if (action.href) b.href = action.href; else b.onclick = () => { t.remove(); action.fn(); };
    t.append(b);
  }
  $('.scr').append(t);
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.remove(), action ? 5000 : 2600);
}
window.toast = toast;

// Resolves true/false, or the trimmed input value / null when `input` is given.
function dialog({ title, body = '', ok = '확인', cancel = '취소', danger = false, input = null }) {
  return new Promise(res => {
    const w = document.createElement('div');
    w.innerHTML = `<div class="dim"></div><div class="dialog" role="dialog" aria-modal="true"><h3>${esc(title)}</h3>${body ? `<p>${esc(body)}</p>` : ''}
      ${input ? `<div class="control"><input maxlength="${input.max || 30}" value="${esc(input.value || '')}" placeholder="${esc(input.placeholder || '')}"></div><div class="hint bad" data-err></div>` : ''}
      <div class="acts">${cancel ? `<button class="btn sec" data-a="0">${esc(cancel)}</button>` : ''}<button class="btn ${danger ? 'danger' : ''}" data-a="1">${esc(ok)}</button></div></div>`;
    $('.scr').append(w);
    const inp = $('input', w);
    inp?.focus();
    const close = v => { w.remove(); res(v); };
    w.onclick = e => {
      if (e.target.classList.contains('dim')) return close(input ? null : false);
      const a = e.target.closest('[data-a]');
      if (!a) return;
      if (a.dataset.a === '0') return close(input ? null : false);
      if (input) {
        const err = input.validate?.(inp.value.trim());
        if (err) { $('[data-err]', w).textContent = err; return; }
        return close(inp.value.trim());
      }
      close(true);
    };
  });
}

function sheet(html, onOpen) {
  const w = document.createElement('div');
  w.innerHTML = `<div class="dim"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  $('.scr').append(w);
  const close = () => w.remove();
  w.addEventListener('click', e => { if (e.target.classList.contains('dim') || e.target.closest('[data-close]')) close(); });
  onOpen?.(w, close);
  return close;
}

const DOCS = {
  terms: ['서비스 이용약관', 'Pin it!은 장소 핀과 리스트를 만들고 공유하는 서비스예요. 다른 사람의 권리를 침해하거나 허위 정보를 올리면 게시물이 숨겨질 수 있어요.'],
  privacy: ['개인정보 수집·이용', '수집 항목: 이메일, 닉네임, 비밀번호(암호화 저장).\n이용 목적: 회원 식별, 리뷰·리스트 작성자 표시.\n보관 기간: 회원 탈퇴 시 바로 삭제해요.\n현재 위치는 저장하지 않고, 사진의 위치 정보는 올리기 전에 지워요.'],
  review: ['리뷰 작성 원칙', '돈·제품·할인 등 대가를 받고 쓴 리뷰는 반드시 "협찬·대가를 받았어요"를 체크해 주세요. 체크한 리뷰는 본문 위에 협찬·광고 표시가 붙어요.\n표시 없이 쓴 광고 리뷰는 신고나 운영자 검토로 숨겨질 수 있어요. 한 장소에는 리뷰를 하나만 쓸 수 있어요.'],
  location: ['위치 정보 이용', '"내 위치" 버튼을 누를 때만 현재 위치를 확인해 지도를 옮겨요. 위치는 저장하거나 다른 사람에게 보여 주지 않아요.'],
  age: ['만 14세 이상 확인', '만 14세 미만은 보호자 동의 없이 가입할 수 없어요.'],
};
const openDoc = key => { const [t, b] = DOCS[key]; sheet(`<h3>${esc(t)}</h3><p class="doc">${esc(b)}</p><button class="btn" data-close>확인</button>`); };

// ---------- review card ----------
function reviewHTML(r, viewer) {
  if (r.hidden) return `<div class="rv held">${icon('eyeoff', 'sm')}신고가 접수돼 검토 중인 리뷰예요.</div>`;
  const nick = nickOf(r.by, r.nick);
  const photos = (r.photos || []).map(p => p.startsWith('data:')
    ? `<div class="photo"><img src="${p}" alt="리뷰 사진"></div>` : `<div class="photo ${p}"></div>`).join('');
  return `<div class="rv" id="rv-${r.id}">
    <div class="who"><span class="avatar">${esc(nick[0].toUpperCase())}</span><span class="nm">${esc(nick)}</span>
      <span class="dt">${fmtDate(r.at)}${viewer?.email === r.by ? ' · 내 리뷰' : ''}</span>
      <button class="icon-btn more" data-more="${r.id}" aria-label="리뷰 메뉴">${icon('more')}</button></div>
    ${r.ad || r.adminLabel ? '<span class="ad-label">협찬·광고</span>' : ''}
    <p>${esc(r.body)}</p>${photos ? `<div class="photos">${photos}</div>` : ''}</div>`;
}

// ---------- chrome: tab bar, icons, ?toast= ----------
const TABS = [['홈', 'home.html', 'home'], ['리스트', 'lists.html', 'bookmark'], ['검색', 'search.html', 'search'], ['내 정보', 'me.html', 'user']];
(function chrome() {
  const scr = $('.scr');
  const on = scr.dataset.nav;
  if (on) scr.insertAdjacentHTML('beforeend', `<nav class="tabbar" aria-label="주요 메뉴">${TABS.map(([n, h, i]) =>
    `<a href="${h}" class="${n === on ? 'on' : ''}"${n === on ? ' aria-current="page"' : ''}>${icon(i)}${n}</a>`).join('')}</nav>`);
  hydrateIcons();
  if (qs.get('toast')) {
    setTimeout(() => toast(qs.get('toast')), 60);
    const u = new URL(location.href);
    u.searchParams.delete('toast');
    history.replaceState(null, '', u);
  }
})();

// Back buttons ([data-back="fallback.html"]) ask before leaving unsaved input ([data-guard]).
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-back]');
  if (!b) return;
  e.preventDefault();
  if (document.body.dataset.dirty && !(await dialog({ title: '작성을 그만할까요?', body: '입력한 내용은 저장되지 않아요.', ok: '그만하기', danger: true }))) return;
  history.length > 1 && document.referrer ? history.back() : go(b.dataset.back || 'home.html');
});
document.addEventListener('input', e => { if (e.target.closest('[data-guard]')) document.body.dataset.dirty = '1'; });
const clean = () => { delete document.body.dataset.dirty; };
