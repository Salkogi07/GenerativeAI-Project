// 시연용 가상 데이터 · 성수동 — seed data, accessors and session. Depends on core.js.
const CENTER = [37.5436, 127.0518];
const CATS = ['카페', '맛집', '전시', '산책', '기타'];
// 지역 선택 목록 [이름, 위도, 경도]. 시연 데이터는 첫 번째(성수동)에만 있어요.
const REGIONS = [['성수동', ...CENTER], ['연남동', 37.5662, 126.9235], ['망원동', 37.5560, 126.9030], ['합정동', 37.5495, 126.9137],
  ['을지로', 37.5663, 126.9910], ['익선동', 37.5742, 126.9893], ['서촌', 37.5797, 126.9706], ['한남동', 37.5345, 127.0020]];
const T0 = Date.now();

const SEED = {
  users: [
    { email: 'demo@pinit.kr', pw: 'pinit1234', nick: 'jiyul', verified: true, created: T0 - 3 * DAY },
    { email: 'admin@pinit.kr', pw: 'pinit1234', nick: '운영팀', verified: true, created: T0 - 60 * DAY, admin: true },
    { email: 'minji@pinit.kr', pw: 'pinit1234', nick: 'minji', verified: true, created: T0 - 40 * DAY },
    { email: 'jaemin@pinit.kr', pw: 'pinit1234', nick: 'jaemin', verified: true, created: T0 - 30 * DAY },
  ],
  pins: [
    { id: 'p1', name: '카페 하루결', cat: '카페', kind: '장소', placeId: 'k1', lat: 37.5448, lng: 127.0560, desc: '2층 창가 자리가 조용해요. 주말 오후엔 웨이팅이 있어요.', photos: ['ph-3', 'ph-1'], author: 'jaemin@pinit.kr', created: T0 - 20 * DAY },
    { id: 'p2', name: '성수 브루랩', cat: '카페', kind: '장소', placeId: 'k2', lat: 37.5431, lng: 127.0531, desc: '콘센트 자리가 많아서 노트북 작업하기 좋아요.', photos: ['ph-2'], author: 'demo@pinit.kr', created: T0 - 2 * DAY },
    { id: 'p3', name: '노을 보는 벤치', cat: '산책', kind: '위치', lat: 37.5412, lng: 127.0433, desc: '해 질 무렵 서울숲 쪽으로 노을이 잘 보이는 벤치예요.', photos: ['ph-2'], author: 'demo@pinit.kr', created: T0 - 1 * DAY },
    { id: 'p4', name: '갤러리 모노', cat: '전시', kind: '장소', placeId: 'k4', lat: 37.5469, lng: 127.0592, desc: '무료 전시가 한 달마다 바뀌어요.', photos: ['ph-1'], author: 'minji@pinit.kr', created: T0 - 15 * DAY },
    { id: 'p5', name: '성수 국밥집', cat: '맛집', kind: '장소', placeId: 'k5', lat: 37.5421, lng: 127.0577, desc: '아침 7시부터 열어요. 국물이 진해요.', author: 'jaemin@pinit.kr', created: T0 - 12 * DAY },
    { id: 'p6', name: '뚝섬 강변 산책길', cat: '산책', kind: '위치', lat: 37.5396, lng: 127.0472, desc: '자전거 길 옆으로 걷기 좋은 구간이에요.', author: 'minji@pinit.kr', created: T0 - 9 * DAY },
  ],
  reviews: [
    { id: 'r1', pin: 'p1', by: 'minji@pinit.kr', body: '체험단으로 방문했어요. 시그니처 라떼가 진하고 디저트도 괜찮았어요.', ad: true, photos: ['ph-1', 'ph-3'], at: T0 - 1 * DAY, reports: [] },
    { id: 'r2', pin: 'p1', by: 'jaemin@pinit.kr', body: '평일 오전엔 한산해서 작업하기 좋아요. 2층 창가 추천해요.', photos: [], at: T0 - 2 * DAY, reports: [] },
    { id: 'r3', pin: 'p1', by: 'x1@pinit.kr', nick: 'cafe_lover', body: '최고의 카페!! 링크에서 할인 쿠폰 받으세요', photos: [], at: T0 - 4 * DAY, hidden: true,
      reports: [{ by: 'a@x', reason: '광고인데 표시가 없어요' }, { by: 'b@x', reason: '광고인데 표시가 없어요' }, { by: 'c@x', reason: '허위 정보예요' }] },
    { id: 'r4', pin: 'p2', by: 'x2@pinit.kr', nick: 'seongsu_daily', body: '사장님이 음료 쿠폰을 주셔서 다녀왔는데 분위기 최고!! 꼭 가보세요', photos: ['ph-2'], at: T0 - 1 * DAY, reports: [] },
    { id: 'r5', pin: 'p2', by: 'minji@pinit.kr', body: '드립 커피 산미가 적당해요. 좌석 간격이 넓어요.', photos: [], at: T0 - 3 * DAY, reports: [] },
    { id: 'r6', pin: 'p4', by: 'x3@pinit.kr', nick: 'user42', body: '여기 진짜 강추합니다 무조건 가세요', photos: [], at: T0 - 2 * DAY, reports: [] },
    { id: 'r7', pin: 'p5', by: 'minji@pinit.kr', body: '국물이 진하고 깍두기가 맛있어요. 아침 식사로 추천.', photos: ['ph-3'], at: T0 - 5 * DAY, reports: [] },
  ],
  lists: [
    { id: 'l1', name: '성수 카페 투어', owner: 'demo@pinit.kr', public: true, token: '3f8a1c2e-7b4d-4e9a-9c1f-2d6b8e0a5f71', pins: ['p1', 'p2', 'p3'], updated: T0 - 2 * DAY },
    { id: 'l2', name: '혼자 가고 싶은 곳', owner: 'demo@pinit.kr', public: false, token: 'a1d9e0b2-5c3f-4a7e-8b6d-9f2c1e4a7b30', pins: ['p4'], updated: T0 - 5 * DAY },
    { id: 'l3', name: '산책 벤치', owner: 'demo@pinit.kr', public: false, token: 'c7e2f9a4-1b8d-4c6e-a3f5-0d9b2e7c1a48', pins: ['p3', 'p6'], updated: T0 - 7 * DAY },
    { id: 'l4', name: '성수 산책 코스', owner: 'jaemin@pinit.kr', public: true, token: 'e5b3a7c9-2d1f-4b8e-9a6c-3f0d7e2b9c15', pins: ['p3', 'p6'], updated: T0 - 6 * DAY },
    { id: 'l5', name: '성수 전시 모음', owner: 'minji@pinit.kr', public: true, token: 'b9c4d2e8-6a3f-4d1b-8e7c-5a2f9d0b3e66', pins: ['p4'], updated: T0 - 10 * DAY },
  ],
};

// 카카오 로컬 검색 결과를 흉내 낸 고정 장소 (실서비스: Edge Function 실시간 호출, 장소 ID·URL만 저장)
const PLACES = [
  { id: 'k1', name: '카페 하루결', cat: '카페', lat: 37.5448, lng: 127.0560 },
  { id: 'k2', name: '성수 브루랩', cat: '카페', lat: 37.5431, lng: 127.0531 },
  { id: 'k4', name: '갤러리 모노', cat: '전시', lat: 37.5469, lng: 127.0592 },
  { id: 'k5', name: '성수 국밥집', cat: '맛집', lat: 37.5421, lng: 127.0577 },
  { id: 'k6', name: '카페 소담', cat: '카페', lat: 37.5455, lng: 127.0512 },
  { id: 'k7', name: '성수 베이커리 공방', cat: '맛집', lat: 37.5440, lng: 127.0603 },
  { id: 'k8', name: '전시공간 틈', cat: '전시', lat: 37.5476, lng: 127.0546 },
];

// AI 광고성 리뷰 판정 — 고정 예시 데이터. 운영자 화면에만 '예시 데이터' 표시와 함께 보여요.
const AI_EXAMPLES = [
  { review: 'r4', queue: 'ai', confidence: 0.87, reason: '대가 제공(음료 쿠폰) 언급이 있는데 협찬·광고 체크가 없어요.' },
  { review: 'r6', queue: 'ai', confidence: 0.61, reason: '구체적인 경험 없이 과장된 추천 표현만 반복돼요.' },
  { review: 'r7', queue: 'pending', reason: 'AI 판정 호출에 실패해 미판정으로 남았어요.' },
];

const load = k => { let v = DB.get(k, null); if (v === null) { v = JSON.parse(JSON.stringify(SEED[k])); DB.set(k, v); } return v; };
const save = (k, v) => DB.set(k, v);
const users = () => load('users');
const pins = () => load('pins');
const reviews = () => load('reviews');
const lists = () => load('lists');
const pinById = id => pins().find(p => p.id === id);
const userBy = email => users().find(u => u.email === email);
const nickOf = (email, fallback) => userBy(email)?.nick || fallback || '알 수 없음';
const me = () => { const s = DB.get('session', null); return s ? userBy(s) || null : null; };
const isNew = u => Date.now() - u.created < 7 * DAY;
const todayCount = u => reviews().filter(r => r.by === u.email && new Date(r.at).toDateString() === new Date().toDateString()).length;
const pinReviews = id => reviews().filter(r => r.pin === id).sort((a, b) => b.at - a.at);
const visibleCount = id => pinReviews(id).filter(r => !r.hidden).length;
const likeCount = id => lists().filter(l => l.pins.includes(id)).length;
// 장소 사진 = 핀 사진 + 그 핀에 보이는 리뷰 사진
const placePhotos = p => [...(p.photos || []), ...pinReviews(p.id).filter(r => !r.hidden).flatMap(r => r.photos || [])];
const pinKind = p => p.kind === '위치' ? '위치 핀' : p.cat;

// 비로그인 → 로그인 화면, 로그인 뒤 원래 화면으로 복귀 (PRD 4-4)
function needLogin(next = here()) {
  if (me()) return true;
  go('login.html?next=' + encodeURIComponent(next));
  return false;
}
