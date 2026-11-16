import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import { ChevronRightIcon, UserIcon } from '../common/Icons';
import { PATHS } from '../../routes/paths';

// 모든 화면의 고정 상단바. 워크스페이스 내부에서만 현재 공간과 변경 링크를 표시한다.
// 왼쪽 로고는 확정된 로고 1안(심볼 28px + '시프트링크' 19px). 누르면 워크스페이스 선택으로 가.
export default function TopNav({ userName, workspace }) {
  return (
    <header className="top-nav">
      <div className="top-nav-main">
        <Link
          to={PATHS.workspaces}
          aria-label="시프트링크 홈 (워크스페이스 선택)"
          onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
          className="inline-flex min-h-11 items-center rounded-lg transition active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darkblue"
        >
          <Logo size="md" />
        </Link>
        {userName && <Link to={PATHS.me} aria-label="내 정보" title={`${userName} · 내 정보`} className="chat-action shrink-0 bg-primary-soft"><UserIcon size={22} /></Link>}
      </div>
      {workspace && (
        <div className="workspace-context-bar">
          <div className="min-w-0">
            <p className="text-[10px] leading-3 text-muted">워크스페이스</p>
            <p className="truncate text-sm leading-5 font-bold text-darkblue">{workspace.name}</p>
          </div>
          <Link to={PATHS.workspaces} aria-label="워크스페이스 변경" className="chat-action shrink-0 gap-1 px-2 text-xs font-medium">변경<ChevronRightIcon size={16} /></Link>
        </div>
      )}
    </header>
  );
}
