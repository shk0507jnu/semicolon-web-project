// 카드 안의 작은 안내 박스 (피그마: '14:00–18:00 · 최소 3명 중 2명 배치', '매주 수요일에 반복 적용됩니다.')
// tone
//  - danger: 연분홍 배경 + 빨간 글씨 (인원 부족 경고)
//  - info  : 연하늘 배경 + 진파랑 글씨 (안내)
const TONES = {
  danger: 'bg-danger-bg text-danger',
  info: 'bg-primary-soft text-darkblue',
};

export default function Callout({ tone = 'info', children }) {
  return (
    <p role={tone === 'danger' ? 'alert' : undefined} className={`w-full rounded-xl p-3 text-xs leading-[18px] ${TONES[tone]}`}>
      {children}
    </p>
  );
}
