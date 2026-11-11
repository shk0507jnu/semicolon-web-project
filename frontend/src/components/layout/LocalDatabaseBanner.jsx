import { useLocation } from 'react-router-dom';
import { calendarApiEnabled, demoUserId } from '../../api/calendar';

export default function LocalDatabaseBanner() {
  const { pathname } = useLocation();
  if (!calendarApiEnabled) return null;
  const previewOnly = /\/(me|invite)(\/|$)/.test(pathname);
  const pendingData = /\/(notices|payroll)(\/|$)/.test(pathname);
  return <aside className="border-y border-line bg-primary-soft px-4 py-2 text-xs text-darkblue">
    <label className="flex items-center justify-between gap-2">로컬 DB 데모
      <select aria-label="로컬 데모 계정" value={demoUserId()} onChange={e=>{
        localStorage.setItem('shiftlink.demoUserId',e.target.value);
        localStorage.removeItem('shiftlink.currentWorkspaceId');
        window.location.href='/workspaces';
      }} className="rounded border border-line bg-white px-2 py-1">
        <option value="2">관리자</option><option value="1">홍길동 · 근무자</option>
      </select>
    </label>
    {previewOnly && <p className="mt-1">이 화면은 아직 DB와 연결되지 않은 예시 화면입니다.</p>}
    {pendingData && <p className="mt-1">급여·공지 데이터 연결 전입니다. 예시 데이터는 표시하지 않습니다.</p>}
  </aside>;
}
