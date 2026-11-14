import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import { PATHS } from '../../routes/paths';

// 로그인 후 화면 상단바 (피그마: Top navigation, 03 화면 1:53)
// 왼쪽 로고는 확정된 로고 1안(심볼 28px + '시프트링크' 19px). 누르면 워크스페이스 선택으로 가.
export default function TopNav({ userName }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between bg-white p-4">
      <Link
        to={PATHS.workspaces}
        aria-label="시프트링크 홈 (워크스페이스 선택)"
        className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darkblue"
      >
        <Logo size="md" />
      </Link>
      <span className="text-xs leading-[18px] text-muted">{userName}</span>
    </header>
  );
}
