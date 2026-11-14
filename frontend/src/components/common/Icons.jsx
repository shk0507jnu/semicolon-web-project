// 18·19 화면에서 쓰는 선 아이콘 (피그마: Icon / wallet, chat, close, send, check, bell, calendar)
// 색은 글자색(currentColor)을 따라가서, className 에 text-white / text-darkblue 처럼 주면 돼.
// 크기는 size(px). 모두 장식용이라 스크린리더에는 숨겨 (버튼에는 aria-label 을 따로 달아줘).
function Svg({ size, className, children, strokeWidth = 1.8 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const WalletIcon = ({ size = 32, className = '' }) => (
  <Svg size={size} className={className} strokeWidth={1.6}>
    <path d="M4 7.5V6a2 2 0 0 1 2-2h11" />
    <rect x="4" y="7.5" width="16" height="12.5" rx="2" />
    <path d="M20 11.5h-4a2 2 0 0 0 0 4h4" />
  </Svg>
);

export const ChatIcon = ({ size = 24, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2.5 21.5Z" />
  </Svg>
);

export const CloseIcon = ({ size = 24, className = '' }) => (
  <Svg size={size} className={className} strokeWidth={2}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const SendIcon = ({ size = 18, className = '' }) => (
  <Svg size={size} className={className} strokeWidth={2}>
    <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
  </Svg>
);

export const CheckIcon = ({ size = 14, className = '' }) => (
  <Svg size={size} className={className} strokeWidth={2.4}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const BellIcon = ({ size = 14, className = '' }) => (
  <Svg size={size} className={className}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Svg>
);

export const CalendarIcon = ({ size = 18, className = '' }) => (
  <Svg size={size} className={className}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </Svg>
);
