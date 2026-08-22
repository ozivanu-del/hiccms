import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import RouteLoadingFallback from './components/RouteLoadingFallback';
import AppearanceLayout from './layouts/AppearanceLayout';
import AppErrorBoundary from './components/AppErrorBoundary';

const Login = lazy(() => import('./pages/Login'));
const Posts = lazy(() => import('./pages/Posts'));
const Pages = lazy(() => import('./pages/Pages'));
const Media = lazy(() => import('./pages/Media'));
const Settings = lazy(() => import('./pages/Settings'));
const Themes = lazy(() => import('./pages/Themes'));
const MenuManager = lazy(() => import('./pages/appearance/MenuManager'));
const HeaderBuilder = lazy(() => import('./pages/appearance/HeaderBuilder'));
const FooterBuilder = lazy(() => import('./pages/appearance/FooterBuilder'));
const Help = lazy(() => import('./pages/Help'));
const AccountSecurity = lazy(() => import('./pages/AccountSecurity'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Plugins = lazy(() => import('./pages/Plugins'));

function App() {
  return (
    <AppErrorBoundary>
    <Router>
      <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Navigate to="/posts" replace />} />
            <Route path="posts" element={<Posts />} />
            <Route path="pages" element={<Pages />} />
            <Route path="media" element={<Media />} />
            <Route path="settings" element={<Settings />} />
            <Route path="help" element={<Help />} />
            <Route path="account/security" element={<AccountSecurity />} />
            <Route path="plugins" element={<Plugins />} />
            <Route path="themes" element={<Navigate to="/appearance/themes" replace />} />
            <Route path="appearance" element={<AppearanceLayout />}>
              <Route index element={<Navigate to="themes" replace />} />
              <Route path="themes" element={<Themes />} />
              <Route path="menus" element={<MenuManager />} />
              <Route path="header" element={<HeaderBuilder />} />
              <Route path="footer" element={<FooterBuilder />} />
            </Route>
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </Router>
    </AppErrorBoundary>
  );
}

export default App;
