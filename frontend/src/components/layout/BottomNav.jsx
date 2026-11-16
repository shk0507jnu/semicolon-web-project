import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { workspaceNavigation } from '../../utils/workspaceNavigation.mjs';
import { BellIcon, CalendarIcon, SwapIcon, WalletIcon } from '../common/Icons';

const icons = { calendar: CalendarIcon, swaps: SwapIcon, payroll: WalletIcon, notices: BellIcon };

export default function BottomNav() {
  const { pathname } = useLocation();
  const { workspaces } = useWorkspace();
  const [tap, setTap] = useState({ key: '', sequence: 0 });
  const { workspace, items } = workspaceNavigation(pathname, workspaces);
  if (!workspace) return null;

  return (
    <nav className="bottom-nav" aria-label={`${workspace.name} 메뉴`}>
      {items.map(({ key, label, to, active }) => {
        const Icon = icons[key];
        return (
          <Link
            key={key}
            to={to}
            aria-current={active ? 'page' : undefined}
            className="bottom-nav-item"
            onClick={() => setTap(prev => ({ key, sequence: prev.sequence + 1 }))}
          >
            <span className="bottom-nav-indicator">
              {tap.key === key && <span key={tap.sequence} className="nav-tap-feedback" aria-hidden="true" />}
              <Icon size={24} />
            </span>
            <span className="bottom-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
