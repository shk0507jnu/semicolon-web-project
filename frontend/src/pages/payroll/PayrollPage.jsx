import { generatePath, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ListRow from '../../components/common/ListRow';
import PageHeading from '../../components/common/PageHeading';
import { useUser } from '../../contexts/UserContext';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { PATHS } from '../../routes/paths';
import { formatMonthDayWeekday, formatWon, getToday, parseISODate } from '../../utils/date';
import { getPayrollSummary } from '../../utils/payroll';

// 16 급여 확인 (피그마: 16 급여 확인, 1:52)
// 05 달력의 '이번 달 예상 급여' 카드를 누르면 들어와.
export default function PayrollPage() {
  const navigate = useNavigate();
  const { workspaceId, eyebrow } = useRouteWorkspace();
  const { user } = useUser();
  const { hourlyWage, records, earlier, totalHours, totalPay } = getPayrollSummary();

  const today = parseISODate(getToday());
  const won = (n) => n.toLocaleString('ko-KR');

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading
        eyebrow={eyebrow}
        title="이번 달 급여"
        description={`${today.getFullYear()}년 ${today.getMonth() + 1}월 · ${user.name}`}
      />

      <Card title="예상 급여" tone="soft">
        <p className="text-[28px] leading-[42px] font-bold text-darkblue">{formatWon(totalPay)}</p>
        <p className="text-sm leading-[21px] text-muted">
          누적 {totalHours}시간 × 기본 시급 {won(hourlyWage)}원
        </p>
      </Card>

      <Card title="근무 내역">
        {records.map((r) => (
          <ListRow
            key={r.date}
            title={formatMonthDayWeekday(r.date)}
            summary={`${r.start}–${r.end} · ${r.hours}시간 · ${won(r.pay)}원`}
            // 누르면 그 날의 근무 상세(06)로
            onClick={() => navigate(generatePath(PATHS.dayDetail, { workspaceId, date: r.date }))}
          />
        ))}
        {earlier.count > 0 && (
          // TODO: 이전 근무를 펼쳐 보는 화면은 디자인이 없어서 보기 전용
          <ListRow
            title={`이전 근무 ${earlier.count}건`}
            summary={`합계 ${earlier.hours}시간 · ${won(earlier.pay)}원`}
          />
        )}
      </Card>

      <p className="text-xs leading-[18px] text-muted">
        시연용 예상 금액입니다. 수당·공제와 확정 근무 기록에 따라 실제 지급액은 달라질 수 있습니다.
      </p>

      {/* TODO: 월별 급여 내역 화면은 사이트맵·디자인에 없어서 아직 동작 안 함 (형한테 확인 필요) */}
      <Button variant="soft">월별 급여 내역 보기</Button>
    </div>
  );
}
