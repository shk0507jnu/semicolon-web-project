import { useState } from 'react';
import { Link, generatePath, useLocation } from 'react-router-dom';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { PATHS } from '../../routes/paths';
import { CalendarIcon, SwapIcon, UserIcon, WorkspaceIcon } from '../common/Icons';

export default function BottomNav() {
  const { pathname } = useLocation();
  const { workspaces, currentWorkspaceId } = useWorkspace();
  const [tap, setTap] = useState({ key: '', sequence: 0 });
  const routeId = pathname.match(/^\/w\/([^/]+)\//)?.[1];
  const workspaceId = workspaces.find(ws => String(ws.id) === routeId)?.id
    ?? workspaces.find(ws => String(ws.id) === String(currentWorkspaceId))?.id;
  const inWorkspace = path => workspaceId
    ? generatePath(path, { workspaceId }) : PATHS.workspaces;
  const section = pathname.startsWith('/me') ? 'me'
    : /\/w\/[^/]+\/swaps(?:\/|$)/.test(pathname) ? 'swaps'
      : /\/w\/[^/]+\/(calendar|schedule|payroll|notices)(?:\/|$)/.test(pathname) ? 'calendar'
        : 'workspaces';

  const items = [
    { key: 'workspaces', label: '워크스페이스', to: PATHS.workspaces, Icon: WorkspaceIcon },
    { key: 'calendar', label: '달력', to: inWorkspace(PATHS.calendar), Icon: CalendarIcon },
    { key: 'swaps', label: '대타', to: inWorkspace(PATHS.swaps), Icon: SwapIcon },
    { key: 'me', label: '내 정보', to: PATHS.me, Icon: UserIcon },
  ];

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {items.map(({ key, label, to, Icon }) => (
        <Link
          key={key}
          to={to}
          aria-current={section === key ? 'page' : undefined}
          className="bottom-nav-item"
          onClick={() => setTap(prev => ({ key, sequence: prev.sequence + 1 }))}
        >
          <span className="bottom-nav-indicator">
            {tap.key === key && <span key={tap.sequence} className="nav-tap-feedback" aria-hidden="true" />}
            <Icon size={24} />
          </span>
          <span className="bottom-nav-label">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
