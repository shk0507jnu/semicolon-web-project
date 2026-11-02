import { useId } from 'react';
import { INPUT_BASE_CLASS, LABEL_CLASS } from './fieldStyles';

// 라벨 + 여러 줄 입력칸 (피그마: 04 워크스페이스 생성 '설명', 1:73 — 높이 120px)
export default function TextAreaField({ label, id, labelSize = 'md', className = '', ...textareaProps }) {
  const autoId = useId();
  const textareaId = id ?? autoId;

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <label htmlFor={textareaId} className={LABEL_CLASS[labelSize]}>
        {label}
      </label>
      <textarea
        id={textareaId}
        className={`h-[120px] resize-none py-0 leading-[21px] ${INPUT_BASE_CLASS}`}
        {...textareaProps}
      />
    </div>
  );
}
