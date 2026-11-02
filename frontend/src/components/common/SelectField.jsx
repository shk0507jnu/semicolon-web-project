import { useId } from 'react';
import { INPUT_BASE_CLASS, LABEL_CLASS } from './fieldStyles';

// 라벨 + 드롭다운 (피그마: Input / Select, 6:6 — 값과 ▾ 화살표를 양 끝에 정렬)
// options: [{ value, label }]
export default function SelectField({ label, id, options, labelSize = 'md', className = '', ...selectProps }) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <label htmlFor={selectId} className={LABEL_CLASS[labelSize]}>
        {label}
      </label>
      <div className="relative w-full">
        <select
          id={selectId}
          className={`h-12 cursor-pointer appearance-none pr-10 leading-5 ${INPUT_BASE_CLASS}`}
          {...selectProps}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex w-4 items-center justify-center text-sm leading-6 font-medium text-darkblue"
        >
          ▾
        </span>
      </div>
    </div>
  );
}
