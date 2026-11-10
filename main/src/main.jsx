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

// HashRouter: GitHub Pages 같은 정적 호스팅에서도 새로고침이 돼요 (주소 예: #/pin?id=p1)
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
