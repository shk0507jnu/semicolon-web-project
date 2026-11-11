import { calendarApiEnabled } from '../../api/calendar';
import { ApiCalendarDashboard } from './ApiCalendarPages';
import { useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import DayTimeline from '../../components/calendar/DayTimeline';
import MonthCalendar from '../../components/calendar/MonthCalendar';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import DashboardSections from '../../components/calendar/DashboardSections';
import PageHeading from '../../components/common/PageHeading';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { useUser } from '../../contexts/UserContext';
import { MOCK_MY_SHIFTS } from '../../mocks/data';
import { PATHS } from '../../routes/paths';
import { formatMonthDayWeekday, getToday, parseISODate } from '../../utils/date';

// '김민수' → '민수' (세 글자 이름이면 성을 빼고 불러줘)
const callName = (name) => (name.length === 3 ? name.slice(1) : name);

// 05 달력 대시보드 (피그마: 05 달력 대시보드, 1:52)
function MockCalendarDashboardPage() {
  const navigate = useNavigate();
  const { workspaceId, eyebrow } = useRouteWorkspace();

  // TODO: 백엔드 API 연결 후 아래 임시 데이터를 워크스페이스별 실제 데이터로 바꾸기
  const shifts = MOCK_MY_SHIFTS;
  const { user } = useUser();

  const today = getToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const todayShift = shifts[today];
  const selectedShift = shifts[selectedDate];

  // 달력은 오늘이 있는 달을 보여줘 (이전/다음 달 이동은 디자인이 없어서 아직 미구현)
  const todayDate = parseISODate(today);
  const year = todayDate.getFullYear();
  const monthIndex = todayDate.getMonth();

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading
        eyebrow={eyebrow}
        title="내 근무 달력"
        description={`${callName(user.name)}님, ${
          todayShift ? `오늘은 ${todayShift.label}가 있어요.` : '오늘은 근무가 없어요.'
        }`}
      />

      <Card title={`${year}년 ${monthIndex + 1}월`}>
        <MonthCalendar
          year={year}
          monthIndex={monthIndex}
          selectedDate={selectedDate}
          shiftDates={new Set(Object.keys(shifts))}
          onSelectDate={setSelectedDate}
        />
      </Card>

      <Card title={formatMonthDayWeekday(selectedDate)}>
        <DayTimeline shift={selectedShift} />
        <p className={`text-sm leading-[21px] ${selectedShift ? 'font-medium text-ink-strong' : 'text-muted'}`}>
          {selectedShift
            ? `${selectedShift.label} · ${selectedShift.start}–${selectedShift.end}`
            : '이 날은 근무가 없어요.'}
        </p>
        <Button
          variant="soft"
          onClick={() => navigate(generatePath(PATHS.dayDetail, { workspaceId, date: selectedDate }))}
        >
          근무 상세 보기
        </Button>
      </Card>

      <DashboardSections workspaceId={workspaceId} />
    </div>
  );
}

export default function CalendarDashboardPage() {
  return calendarApiEnabled ? <ApiCalendarDashboard /> : <MockCalendarDashboardPage />;
}
