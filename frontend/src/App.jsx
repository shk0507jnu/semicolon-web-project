import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import MobileLayout from './components/layout/MobileLayout';
import { NoticeProvider } from './contexts/NoticeContext';
import { SwapProvider } from './contexts/SwapContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import CalendarDashboardPage from './pages/calendar/CalendarDashboardPage';
import DayDetailPage from './pages/calendar/DayDetailPage';
import InvitePage from './pages/invite/InvitePage';
import MembersPage from './pages/members/MembersPage';
import NoticeCreatePage from './pages/notice/NoticeCreatePage';
import NoticeDetailPage from './pages/notice/NoticeDetailPage';
import NoticeListPage from './pages/notice/NoticeListPage';
import PlaceholderPage from './pages/PlaceholderPage';
import MinStaffPage from './pages/schedule/MinStaffPage';
import ScheduleManagePage from './pages/schedule/ScheduleManagePage';
import SwapCreatePage from './pages/swap/SwapCreatePage';
import SwapListPage from './pages/swap/SwapListPage';
import WorkspaceCreatePage from './pages/workspace/WorkspaceCreatePage';
import WorkspaceSelectPage from './pages/workspace/WorkspaceSelectPage';
import { PATHS, PENDING_SCREENS } from './routes/paths';

// 앱 전체에서 공유하는 상태 (워크스페이스, 대타 요청, 공지)
function AppProviders({ children }) {
  return (
    <WorkspaceProvider>
      <SwapProvider>
        <NoticeProvider>{children}</NoticeProvider>
      </SwapProvider>
    </WorkspaceProvider>
  );
}

// TODO(0주차): 'auth' / 'admin' 화면에 로그인·권한 확인(라우트 가드) 붙이기
export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          <Route element={<MobileLayout />}>
            {/* 로그인 전 화면: 상단바·하단 메뉴 없음 */}
            <Route path="/" element={<Navigate to={PATHS.login} replace />} />
            <Route path={PATHS.login} element={<LoginPage />} />
            <Route path={PATHS.signup} element={<SignupPage />} />

            {/* 로그인 후 화면: 상단바 + 하단 메뉴 */}
            <Route element={<AppLayout />}>
              {/* 1단계 */}
              <Route path={PATHS.workspaces} element={<WorkspaceSelectPage />} />
              <Route path={PATHS.workspaceNew} element={<WorkspaceCreatePage />} />
              <Route path={PATHS.calendar} element={<CalendarDashboardPage />} />

              {/* 2단계 — 07·08·09는 관리자 화면 (TODO: 권한 확인 붙이기) */}
              <Route path={PATHS.dayDetail} element={<DayDetailPage />} />
              <Route path={PATHS.scheduleManage} element={<ScheduleManagePage />} />
              <Route path={PATHS.minStaff} element={<MinStaffPage />} />
              <Route path={PATHS.members} element={<MembersPage />} />
              <Route path={PATHS.invite} element={<InvitePage />} />

              {/* 3단계 — 15는 관리자 화면 (TODO: 권한 확인 붙이기) */}
              <Route path={PATHS.swaps} element={<SwapListPage />} />
              <Route path={PATHS.swapNew} element={<SwapCreatePage />} />
              <Route path={PATHS.notices} element={<NoticeListPage />} />
              <Route path={PATHS.noticeDetail} element={<NoticeDetailPage />} />
              <Route path={PATHS.noticeNew} element={<NoticeCreatePage />} />

              {PENDING_SCREENS.map((screen) => (
                <Route
                  key={screen.no}
                  path={screen.path}
                  element={<PlaceholderPage no={screen.no} name={screen.name} />}
                />
              ))}
            </Route>

            <Route path="*" element={<PlaceholderPage no="404" name="페이지를 찾을 수 없어" />} />
          </Route>
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
