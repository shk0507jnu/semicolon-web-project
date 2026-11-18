// 제목 + 요약 + 오른쪽 화살표가 있는 목록 한 줄 (피그마: List / Summary row, 1:47)
// 워크스페이스 목록, 근무자 목록, 공지 목록 등에서 재사용해.
// onClick 이 있는 행만 화살표를 표시해 실제로 이동 가능한 항목을 구분해.
// selected: 선택된 줄 표시 (연하늘 배경 + 하늘색 테두리, 달력 선택 날짜와 같은 모양 — 피그마에 선택 상태가 없어서 임시)
export default function ListRow({ title, summary, onClick, selected, ...props }) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      {...(selected !== undefined ? { 'aria-pressed': selected } : {})}
      {...props}
      className={`flex min-h-[74px] w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left ${
        selected ? 'border-primary bg-primary-soft' : 'border-line bg-white'
      } ${onClick && !selected ? 'transition hover:bg-canvas' : ''}`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm leading-[21px] font-medium text-ink-strong">{title}</span>
        {summary && <span className="text-xs leading-[18px] whitespace-pre-line text-muted">{summary}</span>}
      </span>
      {onClick && <span aria-hidden="true" className="shrink-0 text-base leading-6 font-bold text-muted">
        ›
      </span>}
    </Tag>
  );
}
