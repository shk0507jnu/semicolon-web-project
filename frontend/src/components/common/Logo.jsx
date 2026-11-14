// 시프트링크 로고 (확정 1안: 근무 막대)
// 진파랑 타일 위에 하늘색·흰색 근무 막대 두 개가 엇갈려 있는 모양 = '교대(shift)가 이어진다(link)'
// - LogoMark: 심볼만 (파비콘 public/favicon.svg 와 같은 그림)
// - Logo    : 심볼 + '시프트링크' 워드마크
//   size="lg" → 로그인·회원가입 상단 (심볼 36px + 글자 22px)
//   size="md" → 로그인 후 상단바 (심볼 28px + 글자 19px, 간격 8px)

export function LogoMark({ size = 28, className = '' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="16" fill="#17658F" />
      <rect x="10" y="19" width="30" height="12" rx="6" fill="#51B7F9" />
      <rect x="24" y="33" width="30" height="12" rx="6" fill="#FFFFFF" />
    </svg>
  );
}

const SIZES = {
  md: { mark: 28, text: 'text-[19px] leading-7', gap: 'gap-2' },
  lg: { mark: 36, text: 'text-[22px] leading-8', gap: 'gap-2.5' },
};

export default function Logo({ size = 'lg', className = '' }) {
  const s = SIZES[size] ?? SIZES.lg;
  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <LogoMark size={s.mark} />
      <span className={`${s.text} font-black tracking-[-0.03em] whitespace-nowrap text-darkblue`}>시프트링크</span>
    </span>
  );
}
