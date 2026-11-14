import { Outlet, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import FloatingChat from '../chat/FloatingChat';
import BottomNav from './BottomNav';
import TopNav from './TopNav';
import LocalDatabaseBanner from './LocalDatabaseBanner';

// 로그인 후 화면들의 공통 틀: 상단바 + 내용 + 하단 메뉴
// 워크스페이스 안 화면(/w/:workspaceId/...)에서는 오른쪽 아래 19 플로팅 채팅 버튼이 떠 있어.
// 버튼(56px + 여백 16px)이 마지막 내용을 가리지 않게 그만큼 아래 여백을 더 줘. (피그마 18: pb 88px)
export default function AppLayout() {
  const { user } = useUser();
  const { pathname } = useLocation();
  const inWorkspace = /^\/w\/[^/]+\//.test(pathname);
  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav userName={user.name} />
      <LocalDatabaseBanner />
      <main className={`flex-1 ${inWorkspace ? 'pb-[72px]' : ''}`}>
        <Outlet />
      </main>
      <BottomNav />
      {inWorkspace && <FloatingChat />}
    </div>
  );
}
