// 체크박스 + 라벨 (피그마: Remember option)
// 피그마에는 체크 안 된 상태만 있어서, 체크된 상태는 진파랑 배경 + 흰 체크로 임시 처리했어. (형한테 확인 필요)
export default function Checkbox({ label, checked, onChange, ...props }) {
  return (
    <label className="flex h-11 cursor-pointer items-center gap-2">
      <span className="relative flex size-4 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer size-4 cursor-pointer appearance-none rounded-[4px] border border-muted bg-white checked:border-darkblue checked:bg-darkblue"
          {...props}
        />
        <svg
          viewBox="0 0 16 16"
          className="pointer-events-none absolute inset-0 hidden size-4 text-white peer-checked:block"
          aria-hidden="true"
        >
          <path d="M4 8.5l2.5 2.5L12 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-xs leading-5 text-muted">{label}</span>
    </label>
  );
}
