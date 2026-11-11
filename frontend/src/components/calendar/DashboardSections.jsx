import { generatePath, useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import Card from '../common/Card';
import ListRow from '../common/ListRow';
import { sortByRecent, useNotices } from '../../contexts/NoticeContext';
import { usePayroll } from '../../hooks/usePayroll';
import { formatWon } from '../../utils/date';
import { PATHS } from '../../routes/paths';

// Shared by DB and preview calendars so integration cannot collapse these sections.
export default function DashboardSections({ workspaceId }) {
  const navigate = useNavigate();
  const payroll = usePayroll(workspaceId);
  const current = payroll.months.find(m => m.month === payroll.currentMonth);
  const { notices, available: noticesAvailable } = useNotices(workspaceId);
  const recent = sortByRecent(notices).slice(0, 2);
  const go = path => navigate(generatePath(path, { workspaceId }));

  return <>
    <Card title="이번 달 예상 급여">
      <p className="text-[28px] leading-[42px] font-bold text-darkblue">
        {current ? formatWon(current.totalPay) : payroll.available ? '0원' : '집계 준비 중'}
      </p>
      <p className="text-sm leading-[21px] text-muted">
        {current ? `완료 ${current.completedHours}시간 · 예정 ${current.plannedHours}시간 · 시급 ${formatWon(current.hourlyWage)}`
          : payroll.available ? '이번 달 등록된 급여 내역이 없어요.' : '급여 정보가 연결되면 예상 금액을 확인할 수 있어요.'}
      </p>
      <Button variant="soft" onClick={() => go(PATHS.payroll)}>이번 달 급여 자세히 보기</Button>
      <button type="button" className="min-h-11 text-sm font-medium text-darkblue underline underline-offset-4" onClick={() => go(PATHS.payrollHistory)}>월별 급여 내역 보기</button>
    </Card>
    <Card title="최근 공지">
      {recent.length ? recent.map(notice => <ListRow key={notice.id} title={notice.title} summary={notice.preview}
        onClick={() => navigate(generatePath(PATHS.noticeDetail, { workspaceId, noticeId: notice.id }))} />)
        : <p className="text-sm leading-[21px] text-muted">{noticesAvailable ? '아직 등록된 공지가 없어요.' : '공지 기능을 준비하고 있어요.'}</p>}
      <Button variant="soft" onClick={() => go(PATHS.notices)}>공지 전체 보기</Button>
    </Card>
  </>;
}
