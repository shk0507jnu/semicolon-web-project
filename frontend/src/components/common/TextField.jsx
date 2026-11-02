import { useId } from 'react';
import { INPUT_BASE_CLASS, LABEL_CLASS } from './fieldStyles';

// 라벨 + 입력창 (피그마: Form field / Input / Default)
// trailing: 입력창 오른쪽 안에 넣을 요소 (예: 비밀번호 보기 버튼)
// labelSize: 'md'(기본, 로그인·회원가입) | 'sm'(카드 안 폼)
export default function TextField({ label, id, trailing, labelSize = 'md', className = '', ...inputProps }) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <label htmlFor={inputId} className={LABEL_CLASS[labelSize]}>
        {label}
      </label>
      <div className="relative w-full">
        <input
          id={inputId}
          className={`h-12 leading-5 ${INPUT_BASE_CLASS} ${trailing ? 'pr-12' : ''}`}
          {...inputProps}
        />
        {trailing && <div className="absolute inset-y-0 right-3 flex items-center">{trailing}</div>}
      </div>
    </div>
  );
}
