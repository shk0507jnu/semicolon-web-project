import { Link } from 'react-router-dom';
import Logo from '../components/common/Logo';
import { PATHS } from '../routes/paths';

// 아직 구현하지 않은 화면 / 없는 주소(404) 자리표시용
// 상단바가 없는 화면이라 로고를 직접 보여주고, 누르면 로그인 화면으로 돌아가.
export default function PlaceholderPage({ no, name }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-2 px-4 text-center">
      <Link to={PATHS.login} aria-label="시프트링크 처음 화면으로" className="mb-4">
        <Logo size="lg" />
      </Link>
      <p className="text-sm text-muted">{no}</p>
      <h1 className="text-lg font-bold text-ink">{name}</h1>
      <p className="text-sm text-muted">아직 구현 전인 화면이야.</p>
    </div>
  );
}
