import { Link, generatePath, useLocation } from 'react-router-dom';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { PATHS } from '../../routes/paths';

// 하단 공통 메뉴 (피그마: Bottom navigation, 03 화면 1:85)
// 달력·대타는 워크스페이스 안의 화면이라, 선택된 워크스페이스가 없으면 워크스페이스 선택으로 보내.
export default function BottomNav() {
  const { pathname } = useLocation();
  const { currentWorkspaceId } = useWorkspace();

  const inWorkspace = (path) =>
    currentWorkspaceId ? generatePath(path, { workspaceId: currentWorkspaceId }) : PATHS.workspaces;

  const items = [
    // 피그마 04(생성) 화면에서는 하단 메뉴가 모두 회색이라, 03 선택 화면에서만 활성 표시
    { label: '워크스페이스', to: PATHS.workspaces, active: pathname === PATHS.workspaces },
    { label: '달력', to: inWorkspace(PATHS.calendar), active: /\/w\/[^/]+\/(calendar|schedule)/.test(pathname) },
    { label: '대타', to: inWorkspace(PATHS.swaps), active: /\/w\/[^/]+\/swaps/.test(pathname) },
    { label: 'MY', to: PATHS.me, active: pathname.startsWith('/me') },
  ];

  return (
    <nav className="sticky bottom-0 flex h-16 shrink-0 items-center bg-white px-4">
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          aria-current={item.active ? 'page' : undefined}
          className={`flex h-full flex-1 items-center justify-center text-center text-xs leading-5 font-medium ${
            item.active ? 'text-darkblue' : 'text-muted'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
