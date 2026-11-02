import { timeToHours } from '../../utils/date';

const TICKS = ['00', '06', '12', '18', '24'];

// 하루 24시간 중 근무 시간을 막대로 표시 (피그마: 00–24시 시간 점유 1:186, 시간 눈금 1:188)
// shift 가 없으면 빈 막대만 보여줘.
export default function DayTimeline({ shift }) {
  const left = shift ? (timeToHours(shift.start) / 24) * 100 : 0;
  const width = shift ? ((timeToHours(shift.end) - timeToHours(shift.start)) / 24) * 100 : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[30px] overflow-hidden rounded-lg bg-track">
        {shift && (
          <div
            className="absolute top-0 h-full rounded-lg bg-primary"
            style={{ left: `${left}%`, width: `${width}%` }}
            aria-label={`${shift.start}부터 ${shift.end}까지 근무`}
          />
        )}
      </div>
      <div className="flex h-[18px] justify-between text-[10px] leading-[15px] font-medium text-muted" aria-hidden="true">
        {TICKS.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}
