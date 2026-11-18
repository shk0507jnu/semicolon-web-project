import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { PATHS } from '../../routes/paths';

// 로그인한 사람만 들어올 수 있는 화면을 감싸는 문지기 (라우트 가드)
// 로그인 안 한 상태로 주소를 직접 쳐서 들어오면 로그인 화면으로 보내고,
// 로그인에 성공하면 원래 가려던 화면(예: 10 초대 링크)으로 돌려보내.
export default function RequireAuth() {
  const { isLoggedIn } = useUser();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to={PATHS.login} replace state={{ from: location }} />;
  return <Outlet />;
}
