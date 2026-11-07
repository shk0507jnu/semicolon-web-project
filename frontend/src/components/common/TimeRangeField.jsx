import { useId } from 'react';
import { LABEL_CLASS } from './fieldStyles';

// 라벨 + 시작~끝 시간 입력 (피그마: '근무 시간', '적용 시간' — 입력창 안에 '14:00 → 18:00')
// value: { start: '14:00', end: '18:00' }, onChange(next)
//
// 브라우저 기본 시간 입력(type="time")은 컴퓨터 언어에 따라 '오후 02:00'처럼 보여서,
// 피그마처럼 항상 '14:00' 으로 보이게 30분 단위 선택 목록으로 만들었어.
const STEP_MINUTES = 30;
const TIME_OPTIONS = Array.from({ length: (24 * 60) / STEP_MINUTES + 1 }, (_, i) => {
  const total = i * STEP_MINUTES;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}); // '00:00' ~ '24:00'

const SELECT_CLASS = 'cursor-pointer appearance-none bg-transparent text-sm leading-5 text-ink outline-none';

export default function TimeRangeField({ label, value, onChange, labelSize = 'sm', allowOvernight = false }) {
  const id = useId();
  const options = [...new Set([...TIME_OPTIONS, value.start, value.end].filter(Boolean))].sort();

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={`${id}-start`} className={LABEL_CLASS[labelSize]}>
        {label}
      </label>
      <div className="flex h-12 w-full items-center gap-2 rounded-xl border border-line bg-canvas px-3 transition focus-within:border-darkblue focus-within:bg-white">
        <select
          id={`${id}-start`}
          aria-label={`${label} 시작`}
          value={value.start}
          onChange={(e) => {
            const start = e.target.value;
            // 시작이 끝과 같거나 늦어지면 끝 시간을 시작 바로 다음 칸으로 밀어줘
            const end = allowOvernight || value.end > start ? value.end : options[options.indexOf(start) + 1];
            onChange({ start, end });
          }}
          className={SELECT_CLASS}
        >
          {options.filter(t => t !== '24:00').map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="text-sm text-muted">
          →
        </span>
        <select
          aria-label={`${label} 끝`}
          value={value.end}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
          className={SELECT_CLASS}
        >
          {/* 끝 시간은 시작 시간보다 뒤만 고를 수 있어 */}
          {options.filter((t) => allowOvernight || t > value.start).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
