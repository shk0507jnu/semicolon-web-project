import { useId } from 'react';
import { LABEL_CLASS } from './fieldStyles';

// 라벨 + 숫자 증감 입력 (피그마: Input / Number stepper, 6:18 — 감소 버튼·값·증가 버튼이 분리된 48px 입력)
export default function NumberStepper({ label, value, onChange, min = 0, max = 99, unit = '', labelSize = 'sm' }) {
  const labelId = useId();
  const set = (next) => onChange(Math.min(max, Math.max(min, next)));

  return (
    <div className="flex w-full flex-col gap-2">
      <span id={labelId} className={LABEL_CLASS[labelSize]}>
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-line bg-canvas text-center"
      >
        <StepButton label="줄이기" disabled={value <= min} onClick={() => set(value - 1)}>
          −
        </StepButton>
        <output aria-live="polite" className="min-w-px flex-1 text-sm leading-5 text-ink">
          {value}
          {unit}
        </output>
        <StepButton label="늘리기" disabled={value >= max} onClick={() => set(value + 1)}>
          +
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-12 shrink-0 items-center justify-center text-xl leading-6 font-medium text-darkblue disabled:opacity-30"
      {...props}
    >
      {children}
    </button>
  );
}
