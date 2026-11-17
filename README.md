# Pin it!

광고인지 보이는 리뷰로 장소를 고르고, 가게가 아닌 곳도 핀으로 남겨 리스트로 공유하는 모바일 웹 서비스예요.
이 저장소에는 기획 문서, 브라우저에서 바로 써 볼 수 있는 프로토타입(`docs/prototype/`), 그리고 실제 서비스로 만들고 있는 메인 앱(`main/`, React + Supabase)이 있어요.

## 1. 바로 써 보기

### 👉 <https://salkogi07.github.io/GenerativeAI-Project/>

이 링크는 **프로토타입**을 열어요. 메인 앱은 아직 배포하지 않았고, [main/README.md](main/README.md)를 따라 내 컴퓨터에서 실행할 수 있어요. 화면과 사용법은 둘이 같아요.

- 링크를 열면 바로 지도 홈이 나와요. 로그인이나 회원가입 없이 핀을 찍어 볼 수 있어요.
- 휴대폰으로 열면 앱처럼 전체 화면으로 보여요. PC에서는 가운데에 휴대폰 폭으로 보여요.
- PC에서 휴대폰 크기로 보려면 Chrome에서 F12를 누르고 기기 툴바(Ctrl+Shift+M)를 켜세요.

### 시연 계정

처음 열면 일반 사용자 계정으로 자동 로그인돼요. 운영자로 바꾸려면 **마이페이지 → 로그아웃** 뒤 로그인 화면에서 이메일만 입력하고 **로그인**을 누르면 돼요. 지금은 비밀번호를 확인하지 않아요.

| 계정 | 이메일 | 할 수 있는 것 |
|---|---|---|
| 일반 사용자 | `demo@pinit.kr` (빈칸으로 둬도 이 계정) | 핀 찍기, 찜, 리뷰, 신고, 리스트 공유 |
| 운영자 | `admin@pinit.kr` | 일반 기능 + 리뷰 검토 화면 |

## 2. docs 바로 가기

기획 문서는 모두 `docs/`에 있어요. 전체 목록은 [docs/README.md](docs/README.md)에 있어요.

### 와이어프레임

화면 설계를 버전별로 정리했어요. 자세한 화면 목록과 버전별 차이는 [docs/wireframe/README.md](docs/wireframe/README.md)에 있어요.

- **v0.1:** 첫 와이어프레임이에요. HTML 파일 하나에 15개 화면(로그인부터 운영자 리뷰 검토까지)을 담았어요. 하단 탭은 홈·검색·리스트·내 정보예요. → [열기](<docs/wireframe/v0.1/pin it! wireframe 0.1.html>)
- **v0.2:** 화면마다 HTML 파일을 하나씩 만들고, 미인증·결과 없음·작성 제한 같은 상태도 따로 그렸어요(24개). 시작 화면과 약관 동의를 추가해 회원가입이 3단계가 됐어요. 화면별 주석이 달린 PDF도 있어요. → [열기](docs/wireframe/v0.2/html/index.html)
- **v0.3:** 실제로 동작하는 프로토타입을 회색조로 바꾼 와이어프레임이에요(16개 화면). 핀 찍기, 리뷰, 찜, 공유를 직접 눌러 볼 수 있어요. → [열기](docs/wireframe/v0.3/prototype/pages/index.html)

### 기획 문서 (PRD)

- **v0.1 (확정본):** 처음 확정한 기획 문서예요. 와이어프레임 v0.2가 이 문서를 기준으로 만들어졌어요.
- **v0.2 (최신):** 와이어프레임 v0.1~v0.3을 반영해 화면, 계정, 리스트 관리, 데이터, 테스트를 고치고, 아직 정하지 못한 사항을 7-5에 모았어요.
- 파일: [docs/prd/](docs/prd/)

### 프로토타입

와이어프레임을 바탕으로 실제 서비스처럼 동작하게 만든 모바일 웹이에요. 데이터는 브라우저에만 저장되는 시연용이에요. 위의 [바로 써 보기](#1-바로-써-보기) 링크가 이 프로토타입을 열어요. → [docs/prototype/](docs/prototype/)

### 변경 이력

버전별 변경 일자와 내용은 [docs/CHANGELOG.md](docs/CHANGELOG.md)에 있어요. 최신 버전이 맨 위에 있어요.

## 3. 시작하는 방법

### 프로토타입

- **파일로 열기:** 저장소 맨 위의 `index.html`을 브라우저로 열면 돼요.
- **로컬 서버로 열기:** 저장소 맨 위에서 아래 명령을 실행하고 <http://localhost:8000> 을 열어요.

  ```sh
  python -m http.server 8000
  ```

### 메인 앱

실행 방법, 기능, 운영자 계정 만드는 법, 장소 데이터는 [main/README.md](main/README.md)에 있어요.

## 4. 파일 구조

```
index.html          프로토타입 지도 홈으로 이동
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
├─ prd/             PRD v0.2 (최신) · v0.1 (확정본)
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
