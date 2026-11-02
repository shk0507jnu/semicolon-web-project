import { useId } from 'react';
import { LABEL_CLASS } from './fieldStyles';

// '2026-09-09' → '2026. 09. 09'
const formatDot = (iso) => (iso ? iso.replaceAll('-', '. ') : '');

// 라벨 + 날짜 선택 (피그마: 07 '날짜' — Input / Select 모양, '2026. 09. 09 ▾')
// 브라우저 기본 날짜 입력은 컴퓨터 언어에 따라 '09/09/2026'처럼 보여서,
// 보이는 글자는 피그마 형식으로 직접 그리고 실제 날짜 입력은 그 위에 투명하게 덮어뒀어. (칸 어디를 눌러도 달력이 열려)
export default function DateField({ label, value, onChange, labelSize = 'sm' }) {
  const id = useId();

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={id} className={LABEL_CLASS[labelSize]}>
        {label}
      </label>
      <div className="relative flex h-12 w-full items-center justify-between rounded-xl border border-line bg-canvas px-3 transition focus-within:border-darkblue focus-within:bg-white">
        <span className="text-sm leading-5 text-ink">{formatDot(value)}</span>
        <span aria-hidden="true" className="flex w-4 justify-center text-sm leading-6 font-medium text-darkblue">
          ▾
        </span>
        <input
          id={id}
          type="date"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          className="absolute inset-0 cursor-pointer opacity-0"
          required
        />
      </div>
    </div>
  );
}
