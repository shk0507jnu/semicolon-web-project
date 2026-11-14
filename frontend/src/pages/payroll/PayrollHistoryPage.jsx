import { generatePath, Link, useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import PageHeading from '../../components/common/PageHeading';
import PayrollTabs from '../../components/payroll/PayrollTabs';
import PayrollEmpty from '../../components/payroll/PayrollEmpty';
import { FIGMA_ASSETS } from '../../assets';
import { useUser } from '../../contexts/UserContext';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { usePayroll } from '../../hooks/usePayroll';
import { formatWon } from '../../utils/date';
import { payrollMonthLabel, payrollPeriodLabel, payrollYearSummary } from '../../utils/payrollModel.mjs';
import { PATHS } from '../../routes/paths';

// Figma 18, 1:47. Year/month selection is URL-backed for refresh and browser Back.
export default function PayrollHistoryPage() {
  const { workspaceId, workspace } = useRouteWorkspace();
  const { user } = useUser();
  const source = usePayroll(workspaceId);
  const [search, setSearch] = useSearchParams();
  const currentYear = Number(source.currentMonth.slice(0, 4));
  const requested = Number(search.get('year'));
  const year = Number.isInteger(requested) && requested >= 2000 && requested <= currentYear ? requested : currentYear;
  const years = [...new Set([currentYear, currentYear - 1, currentYear - 2, year, ...source.months.map(m => Number(m.month.slice(0, 4)))])].sort((a, b) => b - a);
  const { items, paidCount, paidTotal } = payrollYearSummary(source.months, year);

  return <div className="flex flex-col gap-4 p-4">
    <PageHeading title="월별 급여 내역" description={`${workspace?.name || '워크스페이스'} · ${user.name}`} />
    <PayrollTabs workspaceId={workspaceId} active="history" year={year} />
    {/* 피그마 18 '기록 없음'(1:129)에는 연도 선택이 없어서, 어느 해에도 내역이 없으면 숨겨 */}
    {source.months.length > 0 && <div className="flex items-center justify-between gap-3">
      <label className="relative flex h-11 items-center gap-2">
        <span className="sr-only">급여 조회 연도</span>
        <select aria-label="급여 조회 연도" value={year} onChange={e => setSearch({ year: e.target.value })}
          className="h-11 appearance-none rounded-lg bg-transparent pr-7 text-base font-bold text-ink-strong focus-visible:outline-2 focus-visible:outline-darkblue">
          {years.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <img src={FIGMA_ASSETS.payrollChevronSmall} alt="" className="pointer-events-none absolute right-0 rotate-90" />
      </label>
      <span className="rounded-md bg-white px-2 py-1 text-xs text-muted">{items.length ? `${year === currentYear ? '최근 ' : ''}${items.length}개월` : '내역 없음'}</span>
    </div>}
    {items.length > 0 ? <>
      <Card tone="soft" className="!gap-2">
        <p className="text-xs text-darkblue">조회 기간 지급 완료</p>
        <p className="text-[28px] leading-[42px] font-bold text-darkblue">{formatWon(paidTotal)}</p>
        <p className="text-xs leading-[18px] text-muted">{payrollPeriodLabel(items)} · 지급 완료 {paidCount}개월</p>
      </Card>
      <Card className="!gap-0">
        {items.map(month => <Link key={month.month} to={`${generatePath(PATHS.payroll, { workspaceId })}?month=${month.month}`}
          className="flex flex-col gap-2 border-b border-line py-4 text-left first:pt-0 last:border-0 last:pb-0 focus-visible:outline-2 focus-visible:outline-darkblue"
          aria-label={`${payrollMonthLabel(month.month)} 급여 상세 보기`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-ink-strong">{payrollMonthLabel(month.month)}</h2>
            <span className={`shrink-0 rounded-md px-2 py-1 text-xs ${month.status === 'paid' ? 'bg-success-bg text-success' : 'bg-primary-soft text-darkblue'}`}>{month.status === 'paid' ? '지급 완료' : '집계 중'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-bold text-ink-strong">{formatWon(month.status === 'paid' ? month.paidAmount : month.totalPay)}</p>
              <p className="mt-1 text-xs leading-[18px] text-muted">{month.status === 'paid'
                ? `총 ${month.totalHours}시간 · ${month.paidAt.slice(5).replace('-', '.')} 지급`
                : `완료 ${month.completedHours}시간 · 예정 ${month.plannedHours}시간`}</p>
            </div>
            <img src={FIGMA_ASSETS.payrollChevron} alt="" className="shrink-0" />
          </div>
        </Link>)}
      </Card>
      <p className="text-xs leading-[18px] text-muted">집계 중인 월은 예정 근무를 포함한 예상 금액입니다.<br />월을 선택하면 해당 월의 근무·급여 내역을 볼 수 있어요.</p>
    </> : <PayrollEmpty workspaceId={workspaceId} available={source.available} history />}
  </div>;
}
