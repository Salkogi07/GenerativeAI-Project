// 시작 화면: 로그인 상태면 바로 지도 홈으로.
if (me()) go('home.html');
const m = makeMap($('#map'), { interactive: false, zoom: 15 });
addPins(m, pins(), () => {});
