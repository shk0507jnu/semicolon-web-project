import { Outlet } from 'react-router-dom';
import { MOCK_USER } from '../../mocks/data';
import BottomNav from './BottomNav';
import TopNav from './TopNav';

// 로그인 후 화면들의 공통 틀: 상단바 + 내용 + 하단 메뉴
// TODO: 로그인 API 연결 후 MOCK_USER 대신 실제 로그인한 사용자 이름 쓰기
export default function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav userName={MOCK_USER.name} />
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
