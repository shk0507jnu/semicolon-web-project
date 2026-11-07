import { calendarApiEnabled } from '../../api/calendar';
import { ApiDayDetail } from './ApiCalendarPages';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import DayTimeline from '../../components/calendar/DayTimeline';
import Button from '../../components/common/Button';
import Callout from '../../components/common/Callout';
import Card from '../../components/common/Card';
import ListRow from '../../components/common/ListRow';
import PageHeading from '../../components/common/PageHeading';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { MOCK_MEMBERS } from '../../mocks/data';
import { PATHS } from '../../routes/paths';
import { formatMonthDayFullWeekday } from '../../utils/date';
import { getDayAssignments, getDaySlots, getSlotStatuses } from '../../utils/staffing';

// 06 날짜별 근무 상세 (피그마: 06 날짜별 근무 상세, 1:52)
function MockDayDetailPage() {
  const navigate = useNavigate();
  const { date } = useParams();
  const { workspaceId, eyebrow } = useRouteWorkspace();

  const assignments = getDayAssignments(date);
  const statuses = getSlotStatuses(assignments, getDaySlots(date));
  const firstShort = statuses.find((s) => s.shortage > 0);
  const memberName = (id) => MOCK_MEMBERS.find((m) => m.id === id)?.name ?? '알 수 없음';

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading
        eyebrow={eyebrow}
        title={formatMonthDayFullWeekday(date)}
        description="시간대별 근무와 배치 상태를 확인하세요."
      />

      <Card title="오늘의 배치 현황">
        {firstShort && (
          <Callout tone="danger">
            {firstShort.start}–{firstShort.end} · 최소 {firstShort.min}명 중 {firstShort.assigned}명 배치
          </Callout>
        )}
        <DayTimeline ranges={assignments} />
        <p className="text-sm leading-[21px] font-medium text-ink-strong">
          {firstShort
            ? `${firstShort.shortage}명 부족 · 추가 배치가 필요해요.`
            : assignments.length > 0
              ? '모든 시간대 인원이 충족됐어요.'
              : '배치된 근무가 없어요.'}
        </p>
      </Card>

      <Card title="배치된 근무자">
        {assignments.length > 0 ? (
          assignments.map((a) => (
            <ListRow key={a.memberId} title={memberName(a.memberId)} summary={`${a.start}–${a.end} · ${a.label}`} />
          ))
        ) : (
          <p className="text-sm leading-[21px] text-muted">아직 배치된 근무자가 없어요.</p>
        )}
      </Card>

      {/* TODO: 근무 배치 수정은 관리자만 보이게 (권한 확인 붙일 때) */}
      <Button variant="primary" onClick={() => navigate(`${generatePath(PATHS.scheduleManage, { workspaceId })}?date=${date}`)}>
        근무 배치 수정
      </Button>
      <Button variant="soft" onClick={() => navigate(`${generatePath(PATHS.swapNew, { workspaceId })}?date=${date}`)}>
        내 근무 대타 요청
      </Button>

      {statuses.length > 0 && (
        <Card title="시간대별 인원" tone="soft">
          <ul className="flex flex-col gap-2 text-xs leading-5 text-muted">
            {statuses.map((s) => (
              <li key={s.start} className="flex h-6 items-center justify-between">
                <span>
                  {s.start}–{s.end}
                </span>
                <span className="text-right">
                  {s.assigned} / {s.min}명 · {s.shortage > 0 ? `${s.shortage}명 부족` : '충족'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default function DayDetailPage() {
  return calendarApiEnabled ? <ApiDayDetail /> : <MockDayDetailPage />;
}
