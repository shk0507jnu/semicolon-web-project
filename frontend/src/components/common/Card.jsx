// 제목이 있는 둥근 카드 (피그마: '내 워크스페이스 · 3', '초대받으셨나요?' 박스)
// tone="soft" 면 연하늘 배경
export default function Card({ title, tone = 'white', children, className = '' }) {
  return (
    <section
      className={`flex w-full flex-col gap-3 rounded-2xl border border-line p-4 ${
        tone === 'soft' ? 'bg-primary-soft' : 'bg-white'
      } ${className}`}
    >
      {title && <h2 className="text-base leading-6 font-bold text-ink-strong">{title}</h2>}
      {children}
    </section>
  );
}
