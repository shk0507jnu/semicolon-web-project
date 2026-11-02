// 두세 개 중 하나를 고르는 탭 버튼 (피그마: 11 '대타 요청 필터' 5:16 — 회색 바탕 위에 선택된 것만 흰색)
// options: [{ value, label }]
export default function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex h-12 w-full gap-1 rounded-xl bg-track p-1">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={`flex h-10 min-w-px flex-1 items-center justify-center rounded-lg text-sm leading-[21px] font-medium transition ${
              selected ? 'bg-white text-darkblue' : 'text-muted hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
