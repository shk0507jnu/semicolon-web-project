// 백엔드 API가 나오기 전까지 화면에 보여줄 임시 데이터 (피그마 예시 그대로)
// API가 연결되면 이 파일 대신 서버에서 받아온 값을 쓰면 돼.

export const MOCK_USER = { name: '김민수' };

// 피그마 예시가 2026년 9월 9일 기준이라, 확인하기 쉽게 '오늘'을 그날로 고정해뒀어.
// TODO: 실제 서비스에서는 null 로 바꾸면 진짜 오늘 날짜를 써 (utils 의 getToday 참고)
export const MOCK_TODAY = '2026-09-09';

// 내 근무 일정 (05 달력 대시보드) — 날짜: { label, start, end }
// 피그마 달력에서 점이 찍힌 날 그대로
const AFTERNOON = { label: '오후 근무', start: '14:00', end: '22:00' };
export const MOCK_MY_SHIFTS = Object.fromEntries(
  [1, 2, 4, 5, 7, 8, 9, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28, 29].map((d) => [
    `2026-09-${String(d).padStart(2, '0')}`,
    AFTERNOON,
  ]),
);

// 이번 달 예상 급여 (05 달력 대시보드)
export const MOCK_PAYROLL_SUMMARY = { totalHours: 64, hourlyWage: 12000 };

// 공지 목록 (05 최근 공지, 13 공지 목록에서도 쓸 예정)
export const MOCK_NOTICES = [
  { id: 'n1', title: '내일 오전 근무 변경', summary: '김민수 · 오전 9시로 조정' },
  { id: 'n2', title: '9월 스케줄 확인 요청', summary: '확정 전 내 근무 시간을 확인해주세요.' },
];

// 워크스페이스 유형 (04 생성 화면 드롭다운)
// TODO: 피그마에는 '아르바이트'만 보여서 나머지는 임시로 넣었어. 형한테 목록 확인 필요
export const WORKSPACE_TYPES = [
  { value: 'part-time', label: '아르바이트' },
  { value: 'project', label: '프로젝트' },
  { value: 'club', label: '동아리' },
  { value: 'etc', label: '기타' },
];

export const MOCK_WORKSPACES = [
  { id: 'cafe', name: '카페 알바', role: '관리자', memberCount: 4, scheduleSummary: '오늘 14:00–22:00' },
  { id: 'capstone', name: '캡스톤 프로젝트', role: '근무자', memberCount: 6, scheduleSummary: '주 3회 협업' },
  { id: 'store', name: '주말 편의점', role: '근무자', memberCount: 5, scheduleSummary: '토·일 09:00–15:00' },
];
