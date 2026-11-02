import { timeToHours } from '../../utils/date';

const TICKS = ['00', '06', '12', '18', '24'];

// 하루 24시간 중 근무 시간을 막대로 표시 (피그마: 00–24시 시간 점유, 시간 눈금)
// - shift : 근무 하나 { start, end } (05 달력 대시보드)
// - ranges: 근무 여러 개 [{ start, end }] → 겹치는 막대로 그려져서 전체 점유 시간이 보여 (06 날짜별 근무 상세)
// 둘 다 없으면 빈 막대만 보여줘.
export default function DayTimeline({ shift, ranges }) {
  const bars = ranges ?? (shift ? [shift] : []);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[30px] overflow-hidden rounded-lg bg-track">
        {bars.map((r, i) => {
          const start = timeToHours(r.start);
          const end = timeToHours(r.end);
          return (
            <div
              key={i}
              className="absolute top-0 h-full rounded-lg bg-primary"
              style={{ left: `${(start / 24) * 100}%`, width: `${((end - start) / 24) * 100}%` }}
              aria-label={`${r.start}부터 ${r.end}까지 근무`}
            />
          );
        })}
      </div>
      <div className="flex h-[18px] justify-between text-[10px] leading-[15px] font-medium text-muted" aria-hidden="true">
        {TICKS.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}
