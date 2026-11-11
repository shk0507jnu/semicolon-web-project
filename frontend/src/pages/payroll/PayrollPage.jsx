import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeading from '../../components/common/PageHeading';
import PayrollTabs from '../../components/payroll/PayrollTabs';
import PayrollEmpty from '../../components/payroll/PayrollEmpty';
import { useUser } from '../../contexts/UserContext';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { usePayroll } from '../../hooks/usePayroll';
import { formatMonthDayWeekday, formatWon } from '../../utils/date';
import { isPayrollMonth, payrollMonthLabel } from '../../utils/payrollModel.mjs';

function WorkRecords({ payroll }) {
  const [allCompleted, setAllCompleted] = useState(false);
  const [showPlanned, setShowPlanned] = useState(false);
  const completed = allCompleted ? payroll.completed : payroll.completed.slice(0, 3);
  const records = [...completed, ...(showPlanned ? [...payroll.planned].reverse() : [])];
  return <Card>
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-bold text-ink-strong">근무별 내역</h2>
      <span className="text-xs text-muted">완료 {payroll.completed.length}건</span>
    </div>
    {records.length ? <div className="divide-y divide-line">
      {records.map(record => <div key={record.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-strong">{formatMonthDayWeekday(record.date)}</p>
          <p className="mt-1 text-xs leading-[18px] text-muted">{record.start}–{record.end} · {record.hours}시간</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium text-ink-strong">{formatWon(record.pay)}</p>
          <p className="mt-1 text-xs text-darkblue">{record.status === 'completed' ? '근무 완료' : '근무 예정'}</p>
        </div>
      </div>)}
    </div> : <p className="text-sm text-muted">아직 완료한 근무가 없어요.</p>}
    {payroll.completed.length > 3 && <Button variant="secondary" aria-expanded={allCompleted} onClick={() => setAllCompleted(v => !v)}>
      {allCompleted ? '최근 근무만 보기' : `이전 근무 ${payroll.completed.length - 3}건 더 보기`}
    </Button>}
    {payroll.planned.length > 0 && <Button variant="secondary" aria-expanded={showPlanned} onClick={() => setShowPlanned(v => !v)}>
      {showPlanned ? '예정 근무 접기' : `예정 근무 ${payroll.planned.length}건 보기`}
    </Button>}
  </Card>;
}

// Figma 16, 9:30. The history page selects a previous month through ?month=YYYY-MM.
export default function PayrollPage() {
  const { workspaceId, workspace } = useRouteWorkspace();
  const { user } = useUser();
  const [search] = useSearchParams();
  const source = usePayroll(workspaceId);
  const requested = search.get('month');
  const month = isPayrollMonth(requested) ? requested : source.currentMonth;
  const payroll = source.months.find(item => item.month === month);
  const paid = payroll?.status === 'paid';
  const money = amount => amount == null ? '—' : formatWon(amount);

  return <div className="flex flex-col gap-4 p-4">
    <PageHeading title={month === source.currentMonth ? '이번 달 급여' : `${payrollMonthLabel(month)} 급여`}
      description={`${workspace?.name || '워크스페이스'} · ${user.name}`} />
    <PayrollTabs workspaceId={workspaceId} active={month === source.currentMonth ? 'current' : 'history'} year={month.slice(0, 4)} />
    <Card tone="soft">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-darkblue">{payrollMonthLabel(month)}</p>
        <span className="rounded-md bg-white px-2 py-1 text-xs text-darkblue">{paid ? '지급 완료' : '예상 금액'}</span>
      </div>
      <div>
        <p className="text-[28px] leading-[42px] font-bold text-darkblue">{money(paid ? payroll.paidAmount : payroll?.totalPay)}</p>
        <p className="text-xs leading-[18px] text-muted">{paid ? `${payroll.paidAt.replaceAll('-', '.')} 지급` : '해당 월 전체 근무 기준'}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-line pt-3">
        <div><p className="text-xs text-muted">완료 근무</p><p className="mt-1 text-base font-bold text-ink-strong">{money(payroll?.completedPay)}</p></div>
        <div><p className="text-xs text-muted">예정 근무</p><p className="mt-1 text-base font-bold text-ink-strong">{money(payroll?.plannedPay)}</p></div>
      </div>
    </Card>
    <Card className="!grid grid-cols-3 !gap-0 !p-3 text-center">
      {[['완료 시간', payroll ? `${payroll.completedHours}시간` : '—'], ['예정 시간', payroll ? `${payroll.plannedHours}시간` : '—'], ['기본 시급', money(payroll?.hourlyWage)]].map(([label, value]) =>
        <div key={label} className="min-w-0"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-sm font-medium text-ink-strong">{value}</p></div>)}
    </Card>
    {payroll ? <WorkRecords key={`${workspaceId}/${month}`} payroll={payroll} /> : <PayrollEmpty workspaceId={workspaceId} available={source.available} />}
    {payroll && <p className="text-xs leading-[18px] text-muted">{paid
      ? <>상단 금액은 지급 완료된 금액입니다.<br />근무별 금액은 기본 시급 기준이며, 상세 정산은 관리자에게 확인해 주세요.</>
      : <>근무 시간 × 시급으로 계산한 예상 금액입니다.<br />수당·공제 반영 전이며, 확정 금액은 관리자에게 확인해 주세요.</>}</p>}
  </div>;
}
