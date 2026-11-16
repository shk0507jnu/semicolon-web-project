import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import LocalDatabaseBanner from './LocalDatabaseBanner';

// 상단 로고와 채팅은 MobileLayout에서 모든 페이지에 제공한다.
export default function AppLayout() {
  return (
    <div className="app-content flex flex-col">
      <LocalDatabaseBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
