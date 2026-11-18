import { Link } from 'react-router-dom';
import { PATHS } from '../routes/paths';

// 아직 구현하지 않은 화면 / 없는 주소(404) 자리표시용
// 공통 상단바와 같은 폭 안에서 오류 안내와 복귀 동작을 제공한다.
export default function PlaceholderPage({ no, name }) {
  return (
    <div className="page-scroll flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <p className="text-4xl font-bold text-darkblue">{no}</p>
      <h1 className="text-lg font-bold text-ink">{no === '404' ? '페이지를 찾을 수 없어요' : name}</h1>
      <p className="text-sm text-muted">{no === '404' ? '주소를 확인하거나 홈에서 다시 시작해주세요.' : '화면을 준비하고 있어요.'}</p>
      <Link to={PATHS.workspaces} className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-darkblue">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
