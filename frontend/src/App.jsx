import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MobileLayout from './components/layout/MobileLayout';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import PlaceholderPage from './pages/PlaceholderPage';
import { PATHS, PENDING_SCREENS } from './routes/paths';

// TODO(0주차): 'auth' / 'admin' 화면에 로그인·권한 확인(라우트 가드) 붙이기
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MobileLayout />}>
          <Route path="/" element={<Navigate to={PATHS.login} replace />} />
          <Route path={PATHS.login} element={<LoginPage />} />
          <Route path={PATHS.signup} element={<SignupPage />} />

          {PENDING_SCREENS.map((screen) => (
            <Route
              key={screen.no}
              path={screen.path}
              element={<PlaceholderPage no={screen.no} name={screen.name} />}
            />
          ))}

          <Route path="*" element={<PlaceholderPage no="404" name="페이지를 찾을 수 없어" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
