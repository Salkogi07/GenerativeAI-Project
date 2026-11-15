import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles/index.css';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Pin from './pages/Pin.jsx';
import PinNew from './pages/PinNew.jsx';
import PinEdit from './pages/PinEdit.jsx';
import ReviewNew from './pages/ReviewNew.jsx';
import Feed from './pages/Feed.jsx';
import Me from './pages/Me.jsx';
import Region from './pages/Region.jsx';
import Admin from './pages/Admin.jsx';
import { List, Lists, Mine, Shared } from './pages/Lists.jsx';
import { Login, Signup, Terms, Verify } from './pages/Auth.jsx';
import { refresh } from './lib/store.js';
import { supabase } from './supabase.js';
import { ui } from './ui/kit.jsx';

// 로그인 상태가 바뀌면(로그인·로그아웃·인증 메일 링크) 다시 불러와요
async function init() {
  if (supabase) {
    supabase.auth.onAuthStateChange(ev => {
      setTimeout(() => refresh().catch(() => {}), 0); // 콜백 안에서 바로 Supabase를 부르면 멈출 수 있어요
      if (ev === 'PASSWORD_RECOVERY') setTimeout(newPassword, 300);
    });
    await supabase.auth.getSession(); // 인증 메일 링크(?code=)를 처리할 때까지 기다려요
    const q = new URLSearchParams(location.search);
    if (q.has('code') || q.has('error')) {
      history.replaceState(null, '', location.pathname + location.hash);
      setTimeout(() => ui.toast(q.has('error') ? '인증 링크가 만료됐어요. 로그인해서 다시 받아 주세요' : '이메일 인증이 끝났어요'), 300);
    }
  }
  await refresh().catch(() => setTimeout(() => ui.toast('데이터를 불러오지 못했어요. 새로고침해 주세요'), 300));
}

// 비밀번호 재설정 메일 링크로 들어오면 새 비밀번호를 받아요
async function newPassword() {
  const pw = await ui.dialog({ title: '새 비밀번호', body: '8자 이상, 영문과 숫자를 섞어 주세요.', ok: '바꾸기',
    input: { type: 'password', max: 72, validate: v => (v.length >= 8 && /[a-z]/i.test(v) && /\d/.test(v) ? '' : '8자 이상, 영문·숫자를 포함해 주세요') } });
  if (!pw) return;
  const { error } = await supabase.auth.updateUser({ password: pw });
  ui.toast(error ? '비밀번호를 바꾸지 못했어요. 다시 시도해 주세요' : '비밀번호를 바꿨어요');
}

// HashRouter: GitHub Pages 같은 정적 호스팅에서도 새로고침이 돼요 (주소 예: #/pin?id=…)
await init();
createRoot(document.getElementById('root')).render(
  <HashRouter>
    <Routes>
      <Route path="/home" element={<Home />} />
      <Route path="/search" element={<Search />} />
      <Route path="/region" element={<Region />} />
      <Route path="/pin" element={<Pin />} />
      <Route path="/pin-new" element={<PinNew />} />
      <Route path="/pin-edit" element={<PinEdit />} />
      <Route path="/review-new" element={<ReviewNew />} />
      <Route path="/feed" element={<Feed />} />
      <Route path="/me" element={<Me />} />
      <Route path="/mine" element={<Mine />} />
      <Route path="/lists" element={<Lists />} />
      <Route path="/list" element={<List />} />
      <Route path="/shared" element={<Shared />} />
      <Route path="/login" element={<Login />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  </HashRouter>,
);
