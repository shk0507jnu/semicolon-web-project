import { Outlet } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import BottomNav from './BottomNav';
import TopNav from './TopNav';
import LocalDatabaseBanner from './LocalDatabaseBanner';

// 로그인 후 화면들의 공통 틀: 상단바 + 내용 + 하단 메뉴
export default function AppLayout() {
  const { user } = useUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav userName={user.name} />
      <LocalDatabaseBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
