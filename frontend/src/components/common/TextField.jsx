import { useId } from 'react';

// 라벨 + 입력창 (피그마: Form field)
// trailing: 입력창 오른쪽 안에 넣을 요소 (예: 비밀번호 보기 버튼)
export default function TextField({ label, id, trailing, className = '', ...inputProps }) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <label htmlFor={inputId} className="text-[13px] leading-5 font-medium text-ink">
        {label}
      </label>
      <div className="relative w-full">
        <input
          id={inputId}
          className={`h-12 w-full rounded-xl border border-line bg-canvas px-3 text-sm leading-5 text-ink outline-none transition placeholder:text-muted focus:border-darkblue focus:bg-white ${
            trailing ? 'pr-12' : ''
          }`}
          {...inputProps}
        />
        {trailing && <div className="absolute inset-y-0 right-3 flex items-center">{trailing}</div>}
      </div>
    </div>
  );
}
