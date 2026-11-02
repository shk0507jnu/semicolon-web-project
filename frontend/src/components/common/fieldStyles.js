// 입력 요소(TextField, SelectField, TextAreaField)가 같이 쓰는 스타일
// labelSize
//  - md: 로그인·회원가입 라벨 (13px, 진한 글씨)
//  - sm: 워크스페이스 생성 등 카드 안 폼 라벨 (12px, 회색 글씨)
export const LABEL_CLASS = {
  md: 'text-[13px] leading-5 font-medium text-ink',
  sm: 'text-xs leading-[18px] text-muted',
};

export const INPUT_BASE_CLASS =
  'w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-darkblue focus:bg-white';
