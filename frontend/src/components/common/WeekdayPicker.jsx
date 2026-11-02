// 요일 여러 개 선택 (피그마: 08 '요일 선택' 1:63 — 선택된 요일은 하늘색 배경)
export const WEEKDAY_ORDER = ['월', '화', '수', '목', '금', '토', '일'];

export default function WeekdayPicker({ value, onChange }) {
  const toggle = (day) => {
    const next = value.includes(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange(WEEKDAY_ORDER.filter((d) => next.includes(d))); // 항상 월~일 순서 유지
  };

  return (
    <div role="group" aria-label="요일 선택" className="flex h-10 justify-between">
      {WEEKDAY_ORDER.map((day) => {
        const selected = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(day)}
            className={`flex h-10 w-[41px] items-center justify-center rounded-lg text-sm leading-[21px] font-medium text-ink-strong transition ${
              selected ? 'bg-primary' : 'bg-canvas hover:bg-line'
            }`}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}
