import { FIGMA_ASSETS } from '../../assets';
import { WEEKDAY_LABELS, getMonthWeeks, parseISODate } from '../../utils/date';
import { calendarWeeks } from '../../utils/calendarModel.mjs';

// 한 달 달력 (피그마: Calendar / Day 1:71, Weekdays 1:63)
// - shiftDates: 근무가 있는 날짜 Set → 날짜 아래 파란 점
// - selectedDate: 선택된 날짜 → 연하늘 배경 + 하늘색 테두리
export default function MonthCalendar({ year, monthIndex, selectedDate, shiftDates, onSelectDate, apiMonth }) {
  const weeks = apiMonth
    ? calendarWeeks(apiMonth.days, apiMonth.first_weekday).map(week => week.map(day => day?.date ?? null))
    : getMonthWeeks(year, monthIndex);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-6 justify-between text-center text-xs leading-[18px] text-muted">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="w-[43px]">
            {w}
          </span>
        ))}
      </div>

      {weeks.map((week, i) => (
        <div key={i} className="flex h-10 justify-between">
          {week.map((iso, j) =>
            iso ? (
              <DayCell
                key={iso}
                iso={iso}
                selected={iso === selectedDate}
                hasShift={shiftDates.has(iso)}
                onClick={() => onSelectDate(iso)}
              />
            ) : (
              <span key={`empty-${j}`} className="h-10 w-[43px]" />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function DayCell({ iso, selected, hasShift, onClick }) {
  const day = parseISODate(iso).getDate();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${day}일${hasShift ? ', 일정 있음' : ''}`}
      className={`flex h-10 w-[43px] flex-col items-center justify-center gap-[2px] rounded-xl border transition ${
        selected ? 'border-primary bg-primary-soft' : 'border-transparent bg-white hover:bg-canvas'
      }`}
    >
      <span className="text-xs leading-[18px] text-ink-strong">{day}</span>
      {hasShift && <img src={FIGMA_ASSETS.shiftDot} alt="" className="size-1 shrink-0" />}
    </button>
  );
}
