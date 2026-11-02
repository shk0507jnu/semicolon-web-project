import { Link } from 'react-router-dom';
import { PATHS } from '../../routes/paths';

// 로그인 후 화면 상단바 (피그마: Top navigation, 03 화면 1:53)
export default function TopNav({ userName }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between bg-white p-4">
      <Link to={PATHS.workspaces} className="text-base leading-6 font-bold text-darkblue">
        S / 시프트링크
      </Link>
      <span className="text-xs leading-[18px] text-muted">{userName}</span>
    </header>
  );
}
