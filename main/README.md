# Pin it! 메인 앱

프로토타입(`docs/prototype/`)을 React + Vite로 옮기고, 데이터를 Supabase에 저장하는 실제 서비스용 앱이에요.
화면과 사용법은 [프로토타입](../docs/prototype/)과 같아요.

- **화면:** React 19, React Router(HashRouter)
- **서버:** Supabase (회원, DB, 사진 저장소)
- **지도:** Leaflet + OpenStreetMap
- **전국 검색:** 브이월드 검색 API

## 실행 방법

[Node.js](https://nodejs.org) 20 이상이 필요해요.

### 1. 환경 변수 넣기

`main/.env.example`을 복사해서 `main/.env.local`을 만들고 값을 넣어요.

```
VITE_SUPABASE_URL=https://<프로젝트 ID>.supabase.co
VITE_SUPABASE_KEY=sb_publishable_...
VITE_VWORLD_KEY=<브이월드 인증키>
```

| 변수 | 어디서 받나요 | 없으면 |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase 대시보드 **Project Settings → API**의 Project URL | 로그인, 핀·리뷰·리스트가 동작하지 않아요 |
| `VITE_SUPABASE_KEY` | 같은 화면의 publishable 키(`sb_publishable_...`) 또는 anon 키 | 위와 같아요 |
| `VITE_VWORLD_KEY` | [브이월드](https://www.vworld.kr) 오픈API 인증키 | 전국 장소·지역 검색이 동작하지 않아요 |

- 앱은 `VITE_`로 시작하는 변수만 읽어요. 다른 이름으로 넣으면 브라우저에 전달되지 않아요.
- publishable 키는 브라우저에 공개돼도 되는 키예요. **secret(service_role) 키와 DB 비밀번호는 절대 넣지 마세요.**
- 브이월드 키도 브라우저에서 불러서 페이지에 보여요. 브이월드가 해외 서버 접속을 막아서 Supabase 서버에서 부를 수 없어요.
- `.env.local`은 git에 올라가지 않아요. **컴퓨터를 바꾸면 이 파일을 다시 만들어야 해요.**
- 값을 바꾼 뒤에는 개발 서버를 껐다가 다시 켜야 반영돼요.

### 2. Supabase 준비 (처음 한 번)

1. Supabase **SQL Editor**에서 `supabase/migrations/`의 SQL을 날짜 순서대로 실행해요.
   1. `20261110000000_places.sql`: 장소 테이블
   2. `20261115000000_beta.sql`: 회원·핀·리뷰·신고·리스트·사진 저장소와 권한 규칙
   3. `20261115010000_place_import.sql`: 브이월드 장소 저장(`save_place`)
2. 장소 데이터가 필요하면 `supabase/seed.sql`도 실행해요. 아래 [장소 데이터](#장소-데이터-공공데이터)를 보세요.
3. 대시보드 **Authentication → URL Configuration**에서 Site URL을 `http://localhost:5173`으로, Redirect URLs에 `http://localhost:5173/**`를 넣어요. 인증 메일의 링크가 이 주소로 돌아와요.

### 3. 실행

```sh
cd main
npm install
npm run dev
```

<http://localhost:5173> 을 열어요.

배포용 파일은 `npm run build`로 `main/dist/`에 만들어져요.

## 문제가 생기면

- 키가 없거나 서버 요청이 실패하면 **모든 화면 맨 위에 빨간 띠**로 무엇이 안 되는지 보여 줘요.
- 자세한 원인은 `main/logs/app.log`에 쌓여요. 시간, 위치, 오류 내용 순서로 적혀요.
  - 로그 파일은 `npm run dev`로 실행할 때만 저장돼요. 빌드한 사이트에서는 브라우저 콘솔(F12)에만 남아요.
  - `logs/`는 git에 올라가지 않아요.

| 띠에 나온 문구 | 확인할 것 |
|---|---|
| 서버에 연결되지 않았어요 | `.env.local`의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` |
| 데이터를 불러오지 못했어요 | 키가 맞는지, SQL(migrations)을 실행했는지 |
| 전국 검색을 쓸 수 없어요 | `.env.local`의 `VITE_VWORLD_KEY` |
| 전국 검색 서버에 문제가 있어요 | 브이월드 키가 맞는지, 키에 등록한 주소가 맞는지 |

## 기능

| 기능 | 내용 |
|---|---|
| 회원 | 이메일·비밀번호 가입, 이메일 인증, 로그인, 비밀번호 재설정, 닉네임 수정, 로그아웃, 탈퇴 (Supabase Auth) |
| 지도 홈 | OpenStreetMap 지도 위의 핀, 카테고리 칩, 핀 미리보기 카드, 지역 선택 |
| 검색 | 우리 장소(이름), 전국 장소·지역(브이월드), 공개 리스트 |
| 핀 찍기 | 지도에서 위치 지정, 이름·카테고리·설명·사진(최대 3장), 근처 300m 장소 연결, 같은 장소·30m 안 중복 핀 안내 |
| 리뷰 | 협찬·광고 체크, 사진, 신고(3명이 신고하면 자동으로 가려짐), 1핀 1리뷰, 신규 계정 하루 3개 |
| 찜 리스트 | 여러 리스트에 담기, 공개·비공개, 공유 링크(로그인 없이 열람) |
| 피드 | 장소 사진·리뷰 모아 보기, 정렬, 검색 |
| 마이페이지 | 찍은 핀·쓴 리뷰·찜 리스트 펼쳐 보기, 위치 정보 이용 설정, 약관, 장소 데이터 출처 |
| 운영자 | 리뷰 검토 대기열(AI 의심·신고 누적·미판정), 광고 라벨·숨김·문제없음 처리와 되돌리기 |

- 1핀 1리뷰, 신고 3건 자동 숨김, 신규 계정 하루 리뷰 3개 같은 규칙은 화면뿐 아니라 서버(RLS·트리거)에서도 막아요.
- AI 광고 판정(Edge Function)은 아직 없어서 운영자 화면의 AI 대기열은 비어 있어요.
- Supabase 기본 메일은 프로젝트 팀원 주소로만, 시간당 약 2통만 보내요. 다른 사람도 가입하려면 대시보드에서 외부 SMTP를 설정해야 해요.

## 운영자 계정 만들기

메인 앱에는 미리 만들어 둔 운영자 계정이 없어요. 일반 계정을 운영자로 바꿔요.

1. 앱에서 회원가입하고 이메일 인증까지 마쳐요. 이미 쓰는 계정이 있으면 그 계정을 써도 돼요.
2. Supabase 대시보드 **SQL Editor**에서 아래 SQL을 실행해요. 이메일은 운영자로 만들 계정 주소로 바꿔요.

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
   where email = '내이메일@example.com';
   ```

3. 앱에서 **로그아웃했다가 다시 로그인**해요. 운영자 권한은 로그인할 때 받는 토큰에 들어가서, 로그인된 상태로는 바로 적용되지 않아요.
4. **마이페이지 → 리뷰 검토**가 보이면 성공이에요.

운영자를 해제하려면:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'role'
where email = '내이메일@example.com';
```

- 운영자 여부는 `app_metadata.role = 'admin'`으로 정해요. 사용자가 앱에서 바꿀 수 없는 값이에요.
- 운영자만 할 수 있는 일(리뷰 처리, AI 판정 보기)은 서버 권한 규칙(RLS)이 막아요. 화면에서 메뉴를 숨기는 것만으로 막지 않아요.

## 장소 데이터 (공공데이터)

장소는 아래 공공데이터를 정리해서 Supabase `places` 테이블에 넣은 거예요. 앱의 **마이페이지 → 장소 데이터 출처**에도 표시돼요.

| 데이터 | 장소 수 | 비고 |
|---|---|---|
| 서울특별시 주요 공원현황 (2026 하반기) | 152 | 좌표 포함. 위도·경도가 뒤바뀐 행 등은 스크립트가 고쳐요 |
| 서울특별시 관악구 카페및커피숍 현황 (2022) | 636 | 주소만 있어서 브이월드 지오코더로 좌표를 구했어요 |
| 서울특별시 강서구 카페(커피숍) 현황 (2025.8.5. 기준) | 809 | 위와 같음 |

전국 검색으로 찾은 장소는 누군가 그 장소에 핀을 남길 때 `places`에 저장돼요.

**데이터를 다시 만들거나 추가하려면**

1. 원본 JSON을 `data/raw/`에 넣어요.
2. 저장소 맨 위의 `.env.local`(git에 올라가지 않음)에 브이월드 인증키를 `VWORLD_KEY=...`로 넣어요. 카페처럼 좌표가 없는 데이터만 필요해요.
3. `python scripts/build_places.py`를 실행해요. 정리 규칙 검사는 `python scripts/build_places.py --selftest`예요.
4. 만들어진 `supabase/seed.sql`을 SQL Editor에서 실행해요. 같은 장소는 덮어써서 여러 번 실행해도 괜찮아요.

## 폴더 구조

```
main/
├─ index.html       앱 HTML
├─ vite.config.js   Vite 설정 · 오류 로그 저장(/__log → logs/app.log)
├─ .env.example     환경 변수 예시 (.env.local로 복사)
└─ src/
   ├─ main.jsx      시작점 · 화면 주소(라우트)
   ├─ supabase.js   Supabase 연결
   ├─ pages/        화면 (프로토타입 화면과 1:1)
   ├─ ui/           공통 UI(kit.jsx) · 지도(map.js)
   ├─ lib/          데이터(store.js) · 장소 조회·전국 검색(places.js) · 문제 알림·로그(log.js)
   └─ styles/       프로토타입 CSS 그대로 + main 전용
```
