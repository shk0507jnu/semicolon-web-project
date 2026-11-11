import { generatePath, Link } from 'react-router-dom';
import { PATHS } from '../../routes/paths';

export default function PayrollTabs({ workspaceId, active, year }) {
  return <nav aria-label="급여 메뉴" className="flex h-11 gap-1 rounded-xl bg-track p-1">
    {[['current', '이번 달 급여', PATHS.payroll], ['history', '월별 내역', PATHS.payrollHistory]].map(([id, label, path]) =>
      <Link key={id} to={`${generatePath(path, { workspaceId })}${id === 'history' && year ? `?year=${year}` : ''}`} aria-current={active === id ? 'page' : undefined}
        className={`flex min-w-0 flex-1 items-center justify-center rounded-lg text-sm font-medium focus-visible:outline-2 focus-visible:outline-darkblue ${active === id ? 'bg-white text-darkblue' : 'text-muted hover:text-darkblue'}`}>{label}</Link>)}
  </nav>;
}
