# Pin it!

광고인지 보이는 리뷰로 장소를 고르고, 가게가 아닌 곳도 핀으로 남겨 리스트로 공유하는 모바일 웹 서비스예요.
이 저장소에는 기획 문서, 브라우저에서 바로 써 볼 수 있는 프로토타입(`docs/prototype/`), 그리고 실제 서비스로 만들고 있는 메인 앱(`main/`, React + Supabase)이 있어요.

## 1. 바로 써 보기

| 무엇 | 주소 | 데이터 |
|---|---|---|
| **메인 앱 (베타)** | 👉 <https://generative-ai-project-three.vercel.app/> | 실제 서버(Supabase)에 저장돼요. 내가 남긴 핀과 리뷰가 모두에게 보여요 |
| 프로토타입 | <https://salkogi07.github.io/GenerativeAI-Project/docs/prototype/pages/> | 내 브라우저에만 저장되는 시연용이에요 |

GitHub Pages 주소(<https://salkogi07.github.io/GenerativeAI-Project/>)로 들어오면 메인 앱으로 이동해요. 두 링크 모두 휴대폰 브라우저에서 바로 열려요. 휴대폰에서는 앱처럼 전체 화면으로 보이고, PC에서는 가운데에 휴대폰 폭으로 보여요. PC에서 휴대폰 크기로 보려면 Chrome에서 F12를 누르고 기기 툴바(Ctrl+Shift+M)를 켜세요.

### 메인 앱

- 링크를 열면 바로 지도 홈이 나와요. 지도 둘러보기, 핀·리뷰 보기, 검색은 로그인 없이 할 수 있어요.
- 핀 찍기, 리뷰, 찜, 신고는 회원가입(이메일 인증) 뒤에 할 수 있어요.
- 지금은 Supabase 기본 메일을 써서 **인증 메일이 프로젝트 팀원 주소로만, 시간당 2통 정도** 가요. 팀 밖의 사람이 가입하려면 외부 메일(SMTP)을 설정해야 해요.
- `main` 브랜치에 푸시하면 Vercel이 자동으로 다시 배포해요. 배포 설정은 [main/README.md](main/README.md#배포-vercel)에 있어요.

### 프로토타입

- 링크를 열면 바로 지도 홈이 나와요. 로그인이나 회원가입 없이 핀을 찍어 볼 수 있어요.
- 화면과 사용법은 메인 앱과 같지만, 메인 앱에 나중에 추가된 기능(브이월드 지도, 카테고리 아이콘 등)은 없을 수 있어요.

### 프로토타입 시연 계정

처음 열면 일반 사용자 계정으로 자동 로그인돼요. 운영자로 바꾸려면 **마이페이지 → 로그아웃** 뒤 로그인 화면에서 이메일만 입력하고 **로그인**을 누르면 돼요. 지금은 비밀번호를 확인하지 않아요.

| 계정 | 이메일 | 할 수 있는 것 |
|---|---|---|
| 일반 사용자 | `demo@pinit.kr` (빈칸으로 둬도 이 계정) | 핀 찍기, 찜, 리뷰, 신고, 리스트 공유 |
| 운영자 | `admin@pinit.kr` | 일반 기능 + 리뷰 검토 화면 |

## 2. docs 바로 가기

기획 문서는 모두 `docs/`에 있어요. 전체 목록은 [docs/README.md](docs/README.md)에 있어요.

### 와이어프레임

화면 설계를 버전별로 정리했어요. 자세한 화면 목록과 버전별 차이는 [docs/wireframe/README.md](docs/wireframe/README.md)에 있어요.

- **v0.3:** 실제로 동작하는 프로토타입을 회색조로 바꾼 와이어프레임이에요(16개 화면). 핀 찍기, 리뷰, 찜, 공유를 직접 눌러 볼 수 있어요. → [열기](docs/wireframe/v0.3/prototype/pages/index.html)
- **v0.2:** 화면마다 HTML 파일을 하나씩 만들고, 미인증·결과 없음·작성 제한 같은 상태도 따로 그렸어요(24개). 시작 화면과 약관 동의를 추가해 회원가입이 3단계가 됐어요. 화면별 주석이 달린 PDF도 있어요. → [열기](docs/wireframe/v0.2/html/index.html)
- **v0.1:** 첫 와이어프레임이에요. HTML 파일 하나에 15개 화면(로그인부터 운영자 리뷰 검토까지)을 담았어요. 하단 탭은 홈·검색·리스트·내 정보예요. → [열기](<docs/wireframe/v0.1/pin it! wireframe 0.1.html>)

### 기획 문서 (PRD)

서비스 목표, 기능 범위, 화면, 데이터, 테스트 기준을 정한 문서예요. 버전별 요약과 차이는 [docs/prd/README.md](docs/prd/README.md)에 있어요.

- **v0.4 (최신, 11-23):** v0.3에 메인 앱 Vercel 배포를 반영했어요. 배포 주소, 자동 배포, 배포 환경에서 하는 기능 테스트, 비밀값 분리가 들어갔어요. → [열기](<docs/prd/Pin it! PRD v0.4.pdf>)
- **v0.3 (11-19, 배포 전):** v0.2를 실제로 만든 메인 앱에 맞춰 고쳤어요. 장소 데이터(공공데이터·브이월드), 브이월드 지도, 하단 탭 3개, 운영자 카테고리 관리, 핀 협찬 표시, 기능별 구현 현황이 들어갔어요. → [열기](<docs/prd/Pin it! PRD v0.3.pdf>)
- **v0.2 (11-10):** v0.1을 와이어프레임 v0.1~v0.3에 맞춰 고쳤어요. 시작 화면과 약관 동의·닉네임을 넣어 회원가입이 3단계가 됐고, 화면이 16개로 늘었어요. 회원 탈퇴, 리스트 관리, 핀 미리보기 카드 같은 기능과 테스트 6건이 추가됐어요. → [열기](<docs/prd/Pin it! PRD v0.2.pdf>)
- **v0.1 (확정본, 11-03):** 팀 결정 16건(Supabase, 카카오 장소 검색, Gemini AI 탐지, 리스트 기본 비공개, 신고 3건 숨김 등)을 확정한 문서예요. 14개 화면과 기능 테스트 20건을 정했어요. → [열기](<docs/prd/Pin it! PRD v0.1 (확정본).pdf>)

### 프로토타입

와이어프레임을 바탕으로 실제 서비스처럼 동작하게 만든 모바일 웹이에요. 데이터는 브라우저에만 저장되는 시연용이에요. 위의 [바로 써 보기](#1-바로-써-보기) 링크가 이 프로토타입을 열어요. → [docs/prototype/](docs/prototype/)

### 변경 이력

버전별 변경 일자와 내용은 [docs/CHANGELOG.md](docs/CHANGELOG.md)에 있어요. 최신 버전이 맨 위에 있어요.

## 3. 시작하는 방법

### 프로토타입

- **파일로 열기:** `docs/prototype/pages/index.html`을 브라우저로 열면 돼요.
- **로컬 서버로 열기:** 저장소 맨 위에서 아래 명령을 실행하고 <http://localhost:8000/docs/prototype/pages/> 를 열어요.

  ```sh
  python -m http.server 8000
  ```

### 메인 앱

내 컴퓨터에서 실행하는 방법, 배포, 기능, 운영자 계정 만드는 법, 장소 데이터는 [main/README.md](main/README.md)에 있어요.

## 4. 파일 구조

```
index.html          메인 앱(Vercel)으로 이동
main/               메인 앱 (React + Vite + Supabase) · README.md(실행 방법)
├─ src/pages/       화면 (프로토타입 화면과 1:1)
├─ src/ui/          공통 UI · 지도
├─ src/lib/         데이터 저장소(Supabase) · 장소 조회·전국 검색
└─ src/styles/      프로토타입 CSS 그대로 + main 전용
supabase/           places 테이블 SQL(migrations) · 장소 데이터(seed.sql)
scripts/            build_places.py (공공데이터 → 장소 데이터)
data/               raw/ 원본 공공데이터 · places.json · 좌표 캐시
docs/
├─ CHANGELOG.md     변경 이력 (최신 버전이 위)
├─ prd/             README.md(버전별 정리) · DECISIONS.md(PRD 이후 결정) · PRD v0.4 (최신) ~ v0.1 · source/(PDF 원본)
├─ prototype/
│  ├─ pages/        화면 HTML (index.html → 지도 홈)
│  ├─ css/          common.css(공통) · pages/(화면별)
│  └─ js/           core·data·ui·map.js(공통) · pages/(화면별)
└─ wireframe/       README.md(버전별 정리)
   ├─ v0.1/         첫 와이어프레임 (HTML 1개)
   ├─ v0.2/html/    화면별 HTML 와이어프레임 · PDF
   └─ v0.3/         회색조 프로토타입
```

기획 문서 안내는 [docs/README.md](docs/README.md)에 있어요.
