// 제목 + 요약 + 오른쪽 화살표가 있는 목록 한 줄 (피그마: List / Summary row, 1:47)
// 워크스페이스 목록, 근무자 목록, 공지 목록 등에서 재사용해.
// onClick 이 있으면 눌리는 버튼, 없으면 그냥 보여주기만 하는 줄이 돼. (화살표는 피그마대로 항상 표시)
export default function ListRow({ title, summary, onClick, ...props }) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      {...props}
      className={`flex h-[74px] w-full items-center gap-3 rounded-xl border border-line bg-white px-3 text-left ${
        onClick ? 'transition hover:bg-canvas' : ''
      }`}
    >
      {/* 피그마에서 글자 영역 폭이 235px로 고정이라 화살표가 오른쪽 끝이 아니라 글자 영역 바로 옆에 와 */}
      <span className="flex w-[235px] min-w-0 shrink flex-col gap-1">
        <span className="truncate text-sm leading-[21px] font-medium text-ink-strong">{title}</span>
        <span className="truncate text-xs leading-[18px] whitespace-pre text-muted">{summary}</span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-base leading-6 font-bold text-muted">
        ›
      </span>
    </Tag>
  );
}
