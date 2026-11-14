import { calendarApiEnabled } from '../../api/calendar';
import { ApiCalendarDashboard } from './ApiCalendarPages';
import { generatePath, useNavigate, useSearchParams } from 'react-router-dom';
import DayTimeline from '../../components/calendar/DayTimeline';
import MonthCalendar from '../../components/calendar/MonthCalendar';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import DashboardSections from '../../components/calendar/DashboardSections';
import PageHeading from '../../components/common/PageHeading';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { useChatShifts } from '../../contexts/ChatContext';
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
  // 19 채팅 공지에서 '일정에 추가'한 내 근무도 합쳐서 보여줘
  const { user } = useUser();
  const chatShifts = useChatShifts(workspaceId, user.name);
  const shifts = { ...MOCK_MY_SHIFTS, ...chatShifts };

  const today = getToday();
  // 선택 날짜는 주소(?date=YYYY-MM-DD)에 둬서, 채팅의 '달력에서 보기'로 바로 그 날짜를 열 수 있어 (API 달력과 같은 방식)
  const [search, setSearch] = useSearchParams();
  const requested = search.get('date');
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(requested || '') ? requested : today;
  const setSelectedDate = (date) => setSearch({ date }, { replace: true });
  const todayShift = shifts[today];
  const selectedShift = shifts[selectedDate];

  // 달력은 선택한 날짜가 있는 달을 보여줘 (기본은 오늘. 이전/다음 달 버튼은 디자인이 없어서 아직 미구현)
  const shownDate = parseISODate(selectedDate);
  const year = shownDate.getFullYear();
  const monthIndex = shownDate.getMonth();

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

      <Card>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base leading-6 font-bold text-ink-strong">{formatMonthDayWeekday(selectedDate)}</h2>
          {/* 피그마 19 '06 채팅 OFF · 달력 반영': 채팅으로 등록한 날에는 '등록 완료' 배지 */}
          {selectedShift?.fromChat && (
            <span className="rounded-md bg-primary-soft px-4 py-[3px] text-xs leading-[18px] text-darkblue">등록 완료</span>
          )}
        </div>
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
