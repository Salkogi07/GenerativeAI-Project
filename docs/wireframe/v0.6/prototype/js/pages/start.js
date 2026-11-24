// 시작: 로그인 화면 없이 시연 계정으로 바로 지도 홈.
if (!me()) DB.set('session', 'demo@pinit.kr');
location.replace('home.html');
