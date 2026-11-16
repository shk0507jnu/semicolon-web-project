import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { PATHS } from '../../routes/paths';
import FloatingChat from '../chat/FloatingChat';
import TopNav from './TopNav';

// 피그마 프레임이 393px(모바일) 기준이라, PC에서는 가운데 393px 폭으로 보여줘.
export default function MobileLayout() {
  const { pathname } = useLocation();
  const { user } = useUser();
  const publicPage = [PATHS.login, PATHS.signup, '/'].includes(pathname);
  const hasBottomNav = !publicPage && /^(\/workspaces(?:\/|$)|\/w\/|\/me(?:\/|$)|\/invite\/)/.test(pathname);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mobile-shell mx-auto min-h-dvh w-full max-w-[393px] bg-canvas" data-bottom-nav={hasBottomNav}>
        <TopNav userName={publicPage ? null : user.name} />
        <Outlet />
        <FloatingChat publicPage={publicPage} />
      </div>
    </div>
  );
}
