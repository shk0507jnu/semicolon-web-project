import { useLocation } from 'react-router-dom';
import { calendarApiEnabled, demoUserId, desktopPreviewEnabled } from '../../api/calendar';

export default function LocalDatabaseBanner() {
  const { pathname } = useLocation();
  if (!calendarApiEnabled && !desktopPreviewEnabled) return null;
  const previewOnly = /\/(me|invite)(\/|$)/.test(pathname);
  const pendingData = /\/(notices|payroll)(\/|$)/.test(pathname);
  return <aside className="border-y border-line bg-primary-soft px-4 py-2 text-xs text-darkblue">
    {desktopPreviewEnabled && <div className="mb-2 flex gap-2" aria-label="미리보기 모드">
      {[[true, 'DB 연동'], [false, '디자인 예시']].map(([api, label]) => <button key={label} type="button"
        aria-pressed={calendarApiEnabled === api}
        className={`min-h-9 flex-1 rounded-lg border px-2 ${calendarApiEnabled === api ? 'border-darkblue bg-white font-bold' : 'border-transparent'}`}
        onClick={() => {
          localStorage.setItem('shiftlink.desktopDataSource', api ? 'api' : 'mock');
          localStorage.removeItem('shiftlink.currentWorkspaceId');
          window.location.href = '/w/cafe/calendar?date=2026-09-09';
        }}>{label}</button>)}
    </div>}
    {calendarApiEnabled ? <label className="flex items-center justify-between gap-2">로컬 DB 데모
      <select aria-label="로컬 데모 계정" value={demoUserId()} onChange={e=>{
        localStorage.setItem('shiftlink.demoUserId',e.target.value);
        localStorage.removeItem('shiftlink.currentWorkspaceId');
        window.location.href='/workspaces';
      }} className="rounded border border-line bg-white px-2 py-1">
        <option value="2">관리자</option><option value="1">홍길동 · 근무자</option>
      </select>
    </label> : <p>화면 확인용 예시 데이터입니다. 변경 사항은 저장되지 않아요.</p>}
    {calendarApiEnabled && previewOnly && <p className="mt-1">이 화면은 아직 DB와 연결되지 않은 예시 화면입니다.</p>}
    {calendarApiEnabled && pendingData && <p className="mt-1">급여·공지 데이터 연결 전입니다. 예시 데이터는 표시하지 않습니다.</p>}
  </aside>;
}
