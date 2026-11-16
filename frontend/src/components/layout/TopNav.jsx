import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import { PATHS } from '../../routes/paths';

// 로그인 후 화면 상단바 (피그마: Top navigation, 03 화면 1:53)
// 왼쪽 로고는 확정된 로고 1안(심볼 28px + '시프트링크' 19px). 누르면 워크스페이스 선택으로 가.
export default function TopNav({ userName }) {
  return (
    <header className="top-nav">
      <Link
        to={PATHS.workspaces}
        aria-label="시프트링크 홈 (워크스페이스 선택)"
        onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}
        className="inline-flex min-h-11 items-center rounded-lg transition active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darkblue"
      >
        <Logo size="md" />
      </Link>
      {userName && <span className="max-w-24 truncate text-xs leading-[18px] text-muted">{userName}</span>}
    </header>
  );
}
