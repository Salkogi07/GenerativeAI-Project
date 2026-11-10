# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Pin it!** is a mobile web prototype for finding and sharing location pins and wishlists, with reviews that show whether they are ads. The repo has planning documents (`docs/`) and a browser-only HTML prototype (`docs/prototype/`). The real React/Supabase app is not built yet; `main/` (empty `assets/`, `css/`, `js/`, `pages/` with `.gitkeep`) is reserved for that main development. The root `index.html` only redirects (meta refresh) to the prototype's `index.html`, and GitHub Pages serves it at https://salkogi07.github.io/GenerativeAI-Project/.

The source of truth is [docs/prd/Pin it! PRD v0.2.pdf](docs/prd/), which updates v0.1 (확정본) to match wireframes v0.1–v0.3; its section 7-5 lists decisions still open. Read it before you design or build anything. When the 기획서 (proposal) and the 실습 (lab) disagree, the PRD follows 실습 2·3.

## Planned stack (from the PRD, not built yet)

- **Front end:** React + Vite, with Leaflet + OpenStreetMap for the map.
- **Back end:** Supabase (Auth with email confirmation, Postgres + RLS, Storage, Edge Functions).
- **Place search:** Kakao Local API, called only through an Edge Function. Nominatim is the fallback.
- **AI ad-review detection:** Gemini API, called from an Edge Function. Results are written to `review_ai_checks`, which only admins can read.

Product rules that every screen and table must follow:

- **Kakao data:** store only `kakao_place_id` and the place URL. Never store Kakao's name, address, coordinates or category. Pin names and coordinates come from user input only, so never prefill the name field from a search result.
- **Ad label:** the 협찬·광고 label sits above the review body, in larger text and a different color. It shows only for the author's own checkbox or an admin's decision. Users never see AI verdicts.
- **Lists:** private by default. Share links use a random `share_token` (UUID v4), not the list ID. A private or deleted list shows the same "볼 수 없는 리스트예요" message.
- **Admin role:** `app_metadata.role = 'admin'`, enforced by RLS. Hiding a menu in the UI is not a security control.
- **Limits:**
  - Hide a review automatically after 3 reports from different accounts.
  - One review per pin per account.
  - Accounts younger than 7 days can post 3 reviews a day.
  - Up to 3 photos, 5 MB each.
  - Suggest merging when another pin is within 30 m.

## Prototype (`docs/prototype/`)

A clickable HTML/CSS/JS prototype that looks like the real service. Open `docs/prototype/pages/index.html` in a browser; there is no build step.

- **Bottom tabs (user's request):** exactly 4, 홈·피드·찜 리스트·마이페이지 (`TABS` in `js/ui.js`). Search has no tab; it opens from the home search pill and is `data-nav="홈"`. If a tab is ever dropped to 3, consider adding one back. Pin detail (`pin.html`) and pin creation (`pin-new.html`) also show the tab bar under their `.cta` (user's request), with `data-nav="홈"`; tapping a tab while a `[data-guard]` form is dirty asks before leaving. The account tab is called 마이페이지, not 내 정보.
- **Region picker:** UI only, a full page (`region.html`, opened from home top-right; `REGIONS` in `js/data.js`). It is a page with the search box at the top, not a bottom sheet, so the mobile keyboard never covers the input or results (user's request). Keep text inputs at 16px+ so iOS does not zoom. Demo data exists only for 성수동; other regions just move the map until real data/API is connected.
- **No start screen (user's request).** `index.html` signs in as `demo@pinit.kr` when there is no session and goes straight to the `home.html` map, so 핀 찍기 never shows a login screen. Logout and account deletion go to `login.html` instead (going to `index.html` would sign in again).

- **Data:** everything is demo data in the browser's localStorage, under keys prefixed `pinit.`. Seed data lives in `js/data.js`.
  - Demo accounts: `demo@pinit.kr` / `pinit1234` (a new account, so the review limit applies) and `admin@pinit.kr` / `pinit1234` (admin).
  - **Login is stubbed for now (user's request; real checks come later).** Pressing 로그인 always succeeds. It logs in as the account whose email was typed, or as `demo@pinit.kr` if that email doesn't exist. The password is not checked.
    - Restore the checks in `js/pages/login.js` when login is reworked: password match, the unverified-email notice (`#unverified`) and resend.
  - Place search results are the fixed `PLACES` list, which stands in for Kakao.
  - AI verdicts are the fixed `AI_EXAMPLES`. They appear only on `admin.html`, and must always carry the "예시 데이터" badge.
- **Map:** Leaflet 1.9.4 from cdnjs, with **no tile layer for now**. The user asked not to load real maps yet, so the map shows a grid background (`.leaflet-container` in `common.css`) with pins only.
  - **When tiles are added:** add `L.tileLayer` in `makeMap` (`js/map.js`).
  - OSM standard tiles work only over `http://` (for example `cd docs/prototype && python -m http.server`, then open http://localhost:8000/pages/). Opened as `file://` they return an "Access blocked" tile because there is no Referer.
  - CARTO returns an "API key required" tile. OpenTopoMap works without a Referer.
- **Leaflet link color:** Leaflet sets `.leaflet-container a{color:#0078A8}`, which overrides the color of any `<a>` placed over a map. Style those links with `.map .<class>`, as `common.css` does for `.fab-main` and `.preview`.
- **User-facing only:** pages contain no screen IDs, design notes or wireframe markers.

### File organization rule (keep it)

| What | Where |
|---|---|
| Page markup | `docs/prototype/pages/<page>.html`. Every HTML file lives here; pages link to each other by bare file name and load assets via `../css/`, `../js/`. |
| Shared styles | `css/common.css` |
| One page's styles | `css/pages/<page>.css` |
| Shared scripts | `js/core.js` (DOM, storage, dates) → `js/data.js` (seed data, session, `needLogin`) → `js/ui.js` (icons, tab bar, toast, dialog, sheet, review card) → `js/map.js` (Leaflet helpers). Load them in this order. |
| One page's behavior | `js/pages/<page>.js`. Login, signup and verify also share `js/pages/auth.js`. |

- **HTML holds markup only.** No inline `<script>` blocks, no `<style>` blocks, no `style=""` attributes.
- **HTML built by JS uses classes only.** Never put `style=` in template strings.
  - The one exception is a data-driven value. Set it with `el.style.<prop>` after rendering, as `admin.js` does for the confidence bar width.
- **Check after edits** (prints any violations and missing local files):
  ```sh
  cd docs/prototype/pages && python -I -c "import re,glob,os;b=[(f,'inline') for f in glob.glob('*.html') if re.search(r'<script(?![^>]*\bsrc=)[^>]*>|<style|\sstyle=',open(f,encoding='utf-8').read())]+[(f,'style=') for f in glob.glob('../js/**/*.js',recursive=True) if re.search(r'\sstyle=',open(f,encoding='utf-8').read())]+[(f,h) for f in glob.glob('*.html') for h in re.findall(r'(?:href|src)=\"([^\"#?]+)',open(f,encoding='utf-8').read()) if not h.startswith('http') and not os.path.exists(h)];print(b)"
  ```
- **JS error check:** run headless Chrome with `--enable-logging=stderr --v=0` and grep for `CONSOLE`.
  - Pages that need a login: open a scratch `file://` page first that sets `localStorage['pinit.session']` and then redirects. All `file://` pages share one localStorage.
  - Chrome's minimum window width is about 500px, so narrower screenshots are cropped.
- **No device frame:** the prototype shows only the service page. There is no phone bezel, status bar or gesture bar (the user asked for this). It is full screen on phones, and on screens wider than 480px it renders as a centered 480px column (`.phone` in `common.css`). Don't add device chrome back.

## Wireframes (`docs/wireframe/`)

The target device is the Galaxy S26, with a viewport of **360×780 dp**. Mobile only.

Wireframes are versioned by folder. v0.2 is the current one.

### v0.2 HTML wireframe (`docs/wireframe/v0.2/html/`)

This is the current one. Start at `index.html`, which lists every screen.

- **It is a wireframe, not a prototype.** Pages are static HTML connected only by `href` links. Do not add app logic, fake login, data stores or form validation.
- **One file per screen or state** in `pages/`. File names follow the PRD IA screen IDs: `s04-home.html`, `s05-search-empty.html`, and so on. Bottom sheets (`s07a-report.html`, `s11-wishlist.html`) are separate pages that redraw S-07 underneath and link back to it.
- **`assets/wire.js`** only injects the shared chrome: status bar, gesture bar, and the bottom tab bar when `.scr` has `data-nav="홈|리스트|검색|내 정보"`. The tab bar's link targets live in that file.
- **Tab bar placement:** tab-root screens show the tab bar and the "Pin it!" brand (`.brand`) in the top bar. Detail and form screens hide the tab bar and use ← plus a title. Primary actions go in a fixed `.cta` bar at the bottom.
- **`assets/style.css`:**
  - Everything is grayscale. The only color in the UI is `--ad` (the 협찬·광고 label).
  - On wide screens the page renders inside a phone frame; at 640px and narrower it renders full screen.
- **When you add a page,** also add it to `index.html`.
- **Link check after edits:**
  ```sh
  cd docs/wireframe/v0.2/html && python -I -c "import re,glob,os;print([(f,h) for f in ['index.html']+glob.glob('pages/*.html') for h in re.findall(r'(?:href|src)=\"([^\"#]+)\"',open(f,encoding='utf-8').read()) if not h.startswith('http') and not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(f),h)))])"
  ```

### v0.2 PDF wireframe (`docs/wireframe/v0.2/html/PinIt_Wireframe_v0.2.pdf`)

- It is **behind the HTML wireframe.** It is missing the start screen, terms consent, the expanded signup (nickname and password confirmation), the expanded 내 정보 screen, and the brand header.
- Its source (`pdf-source/wireframe.html`) was deleted, so it can't be regenerated.
- To inspect pages, use PyMuPDF (`pip install pymupdf`). `pdftoppm` is not installed.

### v0.1 wireframe (`docs/wireframe/v0.1/pin it! wireframe 0.1.html`)

- An older single-file wireframe with inline CSS/JS: a side menu of screens next to a Galaxy S25 frame (393×852). Keep it for history; don't edit it.

## Environment notes

- Windows. Python is 3.13; run it with `PYTHONIOENCODING=utf-8` when printing Korean text, because the console code page is cp949.
- Chrome is at `C:/Program Files/Google/Chrome/Application/chrome.exe`.
- The prototype's body font is `NanumBarunGothic` (나눔바른고딕, the user's choice, `@font-face` in `common.css`), with Pretendard as fallback; both load from the jsDelivr CDN. Without a network connection they fall back to Malgun Gothic.
  - Only the 400 weight exists on that CDN, so bold text is browser-synthesized. Don't add `font-synthesis:none` or bold disappears.