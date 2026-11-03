// 제목이 있는 둥근 카드 (피그마: '내 워크스페이스 · 3', '초대받으셨나요?' 박스)
// tone="soft" 면 연하늘 배경
// onClick 이 있으면 카드 전체가 눌리는 버튼이 돼 (예: 05 '이번 달 예상 급여' → 16 급여 확인)
export default function Card({ title, tone = 'white', onClick, children, className = '' }) {
  const Tag = onClick ? 'button' : 'section';

  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`flex w-full flex-col gap-3 rounded-2xl border border-line p-4 text-left ${
        tone === 'soft' ? 'bg-primary-soft' : 'bg-white'
      } ${onClick ? 'transition hover:border-primary' : ''} ${className}`}
    >
      {title && <h2 className="text-base leading-6 font-bold text-ink-strong">{title}</h2>}
      {children}
    </Tag>
  );
}
