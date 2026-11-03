# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Pin it!** is a mobile web prototype for finding and sharing location pins and wishlists, with reviews that show whether they are ads. Right now the repo has planning documents only, and no app code. The root `index.html` is an empty placeholder.

The source of truth is [docs/prd/Pin it! PRD v1.0 (확정본).pdf](docs/prd/). Read it before you design or build anything. When the 기획서 (proposal) and the 실습 (lab) disagree, the PRD follows 실습 2·3.

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

## Wireframes (`docs/wireframe/`)

The target device is the Galaxy S26, with a viewport of **360×780 dp**. Mobile only.

### HTML wireframe (`docs/wireframe/html/`)

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
  cd docs/wireframe/html && python -I -c "import re,glob,os;print([(f,h) for f in ['index.html']+glob.glob('pages/*.html') for h in re.findall(r'(?:href|src)=\"([^\"#]+)\"',open(f,encoding='utf-8').read()) if not h.startswith('http') and not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(f),h)))])"
  ```

### PDF wireframe (`docs/wireframe/PinIt_Wireframe_v1.1.pdf`)

- It is generated from `pdf-source/wireframe.html`. That one file renders every screen plus its annotations with JS.
- It is **behind the HTML wireframe.** It is missing the start screen, terms consent, the expanded signup (nickname and password confirmation), the expanded 내 정보 screen, and the brand header.
- Regenerate with headless Chrome (the command is in [docs/README.md](docs/README.md)).
- To inspect pages, use PyMuPDF (`pip install pymupdf`). `pdftoppm` is not installed.

## Environment notes

- Windows. Python is 3.13; run it with `PYTHONIOENCODING=utf-8` when printing Korean text, because the console code page is cp949.
- Chrome is at `C:/Program Files/Google/Chrome/Application/chrome.exe`.
- Pages load Pretendard from the jsDelivr CDN. Without a network connection they fall back to Malgun Gothic.
