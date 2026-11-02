// 공통 버튼
// variant
//  - primary: 하늘색 메인 버튼 (예: 이메일로 로그인)
//  - outline: 흰 배경 + 진파랑 테두리 (예: 회원가입)
//  - social : 흰 배경 + 회색 테두리, 아이콘과 함께 쓰는 간편 로그인 버튼
//  - soft   : 연하늘 배경 + 회색 테두리 보조 버튼 (예: 워크스페이스 관리)
const VARIANTS = {
  primary: 'h-12 bg-primary text-ink hover:brightness-95',
  soft: 'h-12 border border-line bg-primary-soft text-ink-strong hover:brightness-[0.97]',
  outline: 'h-12 border border-darkblue bg-white text-darkblue hover:bg-primary-soft',
  social: 'h-11 gap-3 border border-line bg-white text-darkblue hover:bg-canvas',
};

export default function Button({
  variant = 'primary',
  type = 'button',
  icon,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`flex w-full items-center justify-center rounded-xl px-4 text-sm leading-5 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {icon && <img src={icon} alt="" className="size-[18px] shrink-0" />}
      {children}
    </button>
  );
}
