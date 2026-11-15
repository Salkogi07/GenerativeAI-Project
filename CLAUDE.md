# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Pin it!** is a mobile web prototype for finding and sharing location pins and wishlists, with reviews that show whether they are ads. The repo has planning documents (`docs/`) and a browser-only HTML prototype (`docs/prototype/`). The real React/Supabase app is in `main/` (see [Main app](#main-app-main)). The root `index.html` only redirects (meta refresh) to the prototype's `index.html`, and GitHub Pages serves it at https://salkogi07.github.io/GenerativeAI-Project/.

The source of truth is [docs/prd/Pin it! PRD v0.2.pdf](docs/prd/), which updates v0.1 (확정본) to match wireframes v0.1–v0.3; its section 7-5 lists decisions still open. Read it before you design or build anything. When the 기획서 (proposal) and the 실습 (lab) disagree, the PRD follows 실습 2·3.

## Stack

- **Front end:** React + Vite.
- **Map:** Leaflet + OpenStreetMap standard tiles (no key). The user tried Naver Maps and dropped it (NCP needs a payment method and a 대표 계정 for the free quota), so don't bring Naver or Kakao back without asking. OSM tiles need a Referer (serve over http(s), not `file://`) and the © OpenStreetMap contributors attribution. The prototype still uses Leaflet with no tiles.
- **Back end:** Supabase (Auth with email confirmation, Postgres + RLS, Storage, Edge Functions).
- **Places (user's decision, replaces the PRD's Kakao Local API):** public open data, cleaned and stored in the Supabase `places` table (`supabase/migrations/`), plus nationwide 브이월드 search results saved when someone pins one (`save_place` RPC, logged-in users only, source `vworld`). Anyone can read the table; there is no write policy.
  - **Nationwide search:** the browser calls the 브이월드 search API by JSONP (`geoSearch` in `src/lib/places.js`; `place` = POIs, `district` = 행정구역, tried L1 → L2 → L4). 브이월드 sends no CORS headers and blocks foreign IPs, so calling it from Supabase (Sydney) times out; don't move it server-side. The key is `VITE_VWORLD_KEY` and is visible in the page (user accepted this for the low-traffic beta).
  - Pipeline: put the raw JSON exports in `data/raw/`, run `python scripts/build_places.py` (check with `--selftest`), then paste `supabase/seed.sql` into the Supabase SQL editor. Outputs: `data/places.json`, `supabase/seed.sql`, and the geocode cache `data/geocode_cache.json`.
  - Current sources: 서울시 주요 공원현황 (has coordinates, but about 9 rows have lat/lng swapped, some are strings like `127.13°` or multi-line, a few are null; the script fixes or skips them), 관악구 카페 현황 (2022; filter by 위생업태 커피숍/까페) and 강서구 카페 현황 (2025.8). The cafe files have no coordinates, so the script geocodes road addresses with the 브이월드 geocoder (`VWORLD_KEY` env). Nominatim was tested and could not find Korean road addresses.
  - Each dataset's 공공누리 license must allow this use, and the app must show the source attribution.
- **AI ad-review detection:** Gemini API, called from an Edge Function. Results are written to `review_ai_checks`, which only admins can read.

## Main app (`main/`)

A React port of every prototype screen. It must look and behave like the prototype, so port changes in both places or ask which one wins.

```sh
cd main
npm install
npm run dev       # http://localhost:5173
npm run build     # the only automated check; there is no lint or test runner
npm run preview   # serves dist/ on :4173 for headless-Chrome checks
```

- **Env:** `main/.env.local` holds `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (the publishable key) and `VITE_VWORLD_KEY`. Anything prefixed `VITE_` is bundled into the browser, so never put the DB URL or the service_role/secret key there.
- **Root `.env.local`** (git-ignored) holds the secrets used only by local scripts: `SUPABASE_DB_URL` (Session pooler URL) and `VWORLD_KEY`. Never print them. The DB password in that URL contains a percent-encoded character, so pass `decodeURIComponent(password)` as a separate field to `pg` instead of using the URL string. There is no psql or Supabase CLI here; run SQL through the Supabase SQL editor or a throwaway `pg` script.
- **Routing:** `HashRouter` in `src/main.jsx` (`#/pin?id=p1`), so it works on static hosting. Prototype file names map to routes (`pin.html?id=` → `/pin?id=`). Prototype `#rv-…`/`#reviews-h` anchors became `&at=rv-…`/`&at=reviews-h`.
- **Styles:** the prototype CSS is copied verbatim into `src/styles/`. `src/styles/index.css` `@import`s them in order: `common.css`, then `pages/*.css`, then `app.css`. Keep that order, because page CSS must override common CSS (when the order broke, the home preview card rendered centered and clipped). Add new page CSS files to that list.
- **Data (beta, real):** `src/lib/store.js` loads everything from Supabase into memory at startup (`main.jsx` awaits `refresh()` before rendering) and after every auth change. Pages read with plain functions (`pins()`, `me()`, `nickOf(id)`) during render and call `useStore()` to re-render. Writes go through `run(supabase.from(...)...)`, which reloads everything on success and returns `{data, error}`. Users are identified by Supabase user id (`me().id`, `pin.author`, `review.by`, `list.owner`), never by email. `DB` (localStorage `pinit.*`) only keeps per-device prefs: recent searches and the chosen region (`region()` → `[name, lat, lng]`).
  - Schema and rules: `supabase/migrations/20261115000000_beta.sql` (profiles, pins, reviews, reports, lists, review_ai_checks, `photos` bucket). Limits are enforced server-side: column grants stop users from setting `hidden`/`admin_label`, triggers apply the 3-report auto-hide and the new-account 3-reviews-a-day limit (`daily_review_limit`), `unique(pin_id, author)` and `unique(place_id)`. `like_counts()` and `delete_me()` are security-definer RPCs.
  - Photos are shrunk to 1280px JPEG in the browser (strips EXIF), then uploaded to `photos/<user id>/` by `uploadPhotos`. A check constraint only allows URLs from this project's bucket.
  - Auth: email + password with email confirmation, PKCE flow (links come back as `?code=`, which doesn't clash with HashRouter). The default Supabase mailer sends only to org team members, about 2 mails an hour. Real beta signups need custom SMTP.
  - Applying SQL: root `.env.local` `SUPABASE_DB_URL` with a throwaway `pg` script, only after the user OKs that change.
- **Places:** `src/lib/places.js` queries Supabase (`searchPlaces`, `nearPlaces` within 300 m, `placeById`) and 브이월드 (`geoSearch`, `savePlace`). Place IDs are bigints; pins store them as `placeId`.
- **Shared UI** (`src/ui/kit.jsx`):
  - `Screen nav="홈|피드|마이페이지" guard title` renders `.phone > .scr`, the tab bar and the overlays. With `guard`, typing marks the page dirty; `BackBtn` and the tabs then ask before leaving. Call `clean()` before navigating after a save.
  - `ui.toast(msg, {label, to | fn})`, `await ui.dialog({...})` (resolves true/false, or the text when `input` is set) and `ui.sheet(close => <jsx/>)` replace the prototype's `toast`/`dialog`/`sheet`.
  - `?toast=` in a route shows a toast once and is then removed from the URL.
  - `useNeedLogin()` returns `needLogin(next)`, which sends you to `/login?next=…`.
- **Map:** `src/ui/map.js`. `const [ref, map] = useMap({center, zoom, interactive})` creates the map once. Add markers in an effect that depends on `map` and remove them in the cleanup. Call `map.invalidateSize()` after showing a map that was hidden.
- **Checking a change:** `npm run build`, then `npm run preview` and screenshot routes with headless Chrome: `chrome --headless --screenshot=out.png --window-size=500,900 "http://localhost:4173/#/home"`. For click-through checks, install `puppeteer-core` in the scratchpad (not in `main/`) and point it at the system Chrome.

## Product rules

Every screen and table must follow these rules:

- **Pins and places:** a pin may link to a row in `places` (pin kind 장소) or stand alone (위치 핀). One pin per place; the 30 m rule catches the rest. Pin names come from user input, so never prefill the name field from place data.
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

- **Bottom tabs (user's request):** 3 tabs, 홈·피드·마이페이지 (`TABS` in `js/ui.js`). 찜 리스트 was removed from the tab bar on request; lists open from the 마이페이지 stats tile (`lists.html` is a ← page under `data-nav="마이페이지"`). The stats tiles (찍은 핀·쓴 리뷰·찜 리스트) toggle an inline panel below them with the latest 3 items plus a 전체 보기 link to the full page (user's final choice); they don't navigate directly. The user earlier wanted 4 tabs and said to consider adding one back if it drops to 3, so ask before adding a 4th. Search has no tab; it opens from the home search pill.
  - Detail pages show the tab bar too (user's request): `pin.html`, `pin-new.html`, `region.html`, `search.html` use `data-nav="홈"`; `mine.html`, `lists.html`, `list.html` use `data-nav="마이페이지"`.
  - The tab bar hides while a text input or textarea has focus (`.scr:has(...:focus)` in `common.css`), so it never floats above the mobile keyboard. Tapping a tab while a `[data-guard]` form is dirty asks before leaving.
  - The account tab is called 마이페이지, not 내 정보.
- **Region picker:** UI only, a full page (`region.html`, opened from home top-right; `REGIONS` in `js/data.js`). It is a page with the search box at the top, not a bottom sheet, so the mobile keyboard never covers the input or results (user's request). Keep text inputs at 16px+ so iOS does not zoom. Demo data exists only for 성수동; other regions just move the map until real data/API is connected.
- **No start screen (user's request).** `index.html` signs in as `demo@pinit.kr` when there is no session and goes straight to the `home.html` map, so 핀 찍기 never shows a login screen. Logout and account deletion go to `login.html` instead (going to `index.html` would sign in again).

- **Data:** everything is demo data in the browser's localStorage, under keys prefixed `pinit.`. Seed data lives in `js/data.js`.
  - Demo accounts: `demo@pinit.kr` / `pinit1234` (a new account, so the review limit applies) and `admin@pinit.kr` / `pinit1234` (admin).
  - **Login is stubbed for now (user's request; real checks come later).** Pressing 로그인 always succeeds. It logs in as the account whose email was typed, or as `demo@pinit.kr` if that email doesn't exist. The password is not checked.
    - Restore the checks in `js/pages/login.js` when login is reworked: password match, the unverified-email notice (`#unverified`) and resend.
  - Place search results are the fixed `PLACES` list, which stands in for the Supabase `places` table.
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