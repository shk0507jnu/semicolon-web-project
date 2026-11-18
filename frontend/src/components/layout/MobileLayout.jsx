import { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { PATHS } from '../../routes/paths';
import { workspaceNavigation } from '../../utils/workspaceNavigation.mjs';
import FloatingChat from '../chat/FloatingChat';
import TopNav from './TopNav';
import BottomNav from './BottomNav';

// 피그마 프레임이 393px(모바일) 기준이라, PC에서는 가운데 393px 폭으로 보여줘.
export default function MobileLayout() {
  const { pathname } = useLocation();
  const shellRef = useRef(null);
  const { user, isLoggedIn } = useUser();
  const { workspaces } = useWorkspace();
  const { workspace } = workspaceNavigation(pathname, workspaces);
  // 로그인 전 화면(또는 로그아웃 상태)에서는 이름·채팅방 같은 개인 정보를 보여주지 않아
  const publicPage = !isLoggedIn || [PATHS.login, PATHS.signup, '/'].includes(pathname);
  const hasBottomNav = Boolean(workspace);
  // Mobile keyboards can shrink the visual viewport without changing 100dvh.
  // Keep the header, scrolling page and chat inside the actually visible area.
  useLayoutEffect(() => {
    let frame;
    const viewport = window.visualViewport;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const shell = shellRef.current;
        if (!shell || (viewport && viewport.scale !== 1)) return;
        const height = viewport?.height ?? window.innerHeight;
        const active = document.activeElement;
        const editing = active?.matches('textarea, select, input:not([type="checkbox"]):not([type="radio"]):not([type="button"])');
        const keyboard = Boolean(editing && window.innerHeight - height > 120);
        shell.style.setProperty('--viewport-height', `${height}px`);
        shell.style.setProperty('--viewport-top', `${viewport?.offsetTop ?? 0}px`);
        shell.dataset.compact = String(height <= 520);
        shell.dataset.tight = String(height <= 360);
        shell.dataset.keyboard = String(keyboard);
        if (keyboard && active.closest('.page-scroll')) active.scrollIntoView({ block: 'nearest' });
      });
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);
  useLayoutEffect(() => {
    shellRef.current?.querySelector('.page-scroll')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return (
    <div className="min-h-dvh bg-canvas">
      <div ref={shellRef} className="mobile-shell mx-auto w-full max-w-[393px] bg-canvas" data-bottom-nav={hasBottomNav}>
        <TopNav userName={publicPage ? null : user.name} workspace={workspace}
          onHome={() => shellRef.current?.querySelector('.page-scroll')?.scrollTo({ top: 0, behavior: 'instant' })} />
        <Outlet />
        <BottomNav />
        <FloatingChat publicPage={publicPage} />
      </div>
    </div>
  );
}
