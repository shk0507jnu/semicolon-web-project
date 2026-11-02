// 페이지 상단 제목 묶음 (피그마: Page heading — 작은 파란 글씨 / 큰 제목 / 설명)
export default function PageHeading({ eyebrow, title, description }) {
  return (
    <header className="flex flex-col gap-1">
      {eyebrow && <p className="text-xs leading-[18px] text-darkblue">{eyebrow}</p>}
      <h1 className="text-2xl leading-9 font-bold text-ink-strong">{title}</h1>
      {description && <p className="text-xs leading-[18px] text-muted">{description}</p>}
    </header>
  );
}
