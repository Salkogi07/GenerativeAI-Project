// Shared wireframe chrome only: status bar, bottom tab bar (data-nav), gesture bar. No app logic.
const TABS = [
  ['홈', 's04-home.html', '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
  ['리스트', 's10-lists.html', '<path d="M6 3h12v18l-6-4-6 4z"/>'],
  ['검색', 's05-search-input.html', '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'],
  ['내 정보', 's03-me.html', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'],
];
const scr = document.querySelector('.scr');
scr.insertAdjacentHTML('afterbegin', '<div class="sb"><span>9:41</span><span>LTE ▮▮▮ 100%</span></div>');
if (scr.dataset.nav) scr.insertAdjacentHTML('beforeend', '<nav class="nav">' + TABS.map(([name, href, icon]) =>
  `<a href="${href}" class="${name === scr.dataset.nav ? 'on' : ''}"><svg viewBox="0 0 24 24">${icon}</svg>${name}</a>`).join('') + '</nav>');
scr.insertAdjacentHTML('beforeend', '<div class="gn"></div>');
