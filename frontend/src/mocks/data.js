// 백엔드 API가 나오기 전까지 화면에 보여줄 임시 데이터 (피그마 예시 그대로)
// API가 연결되면 이 파일 대신 서버에서 받아온 값을 쓰면 돼.

// 로그인한 사용자 (17 내 정보에서 수정 가능 → contexts/UserContext.jsx 에서 관리)
export const MOCK_USER = { name: '김민수', email: 'minsu@example.com', phone: '010-2481-3902' };

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

// 이번 달 급여 (05 예상 급여 카드, 16 급여 확인) — 계산은 utils/payroll.js
// 피그마 16 예시 그대로: 최근 근무 3건(9/2, 9/4, 9/5) + 이전 근무 5건(40시간) = 64시간 × 12,000원 = 768,000원
// TODO: 백엔드가 확정 근무 기록 기준으로 계산해서 주는 걸 가정. 지금은 05 달력의 근무 일정과 따로 놀아.
export const MOCK_PAYROLL = {
  hourlyWage: 12000,
  recentRecords: [
    { date: '2026-09-02', start: '14:00', end: '22:00' },
    { date: '2026-09-04', start: '14:00', end: '22:00' },
    { date: '2026-09-05', start: '14:00', end: '22:00' },
  ],
  earlier: { count: 5, hours: 40 },
};

// (공지 목록은 아래 3단계 MOCK_NOTICES 로 옮겼어)

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

// ───────── 2단계 (06~10) ─────────

// 워크스페이스 멤버 (09 멤버 관리, 07 근무자 선택)
export const MOCK_MEMBERS = [
  { id: 'm1', name: '김민수', role: '관리자', phone: '010-2481-3902', hourlyWage: 12000 },
  { id: 'm2', name: '박서연', role: '근무자', phone: '010-5724-1180', hourlyWage: 12000 },
  { id: 'm3', name: '이준호', role: '근무자', phone: '010-9061-4428', hourlyWage: 11500 },
  { id: 'm4', name: '최유진', role: '근무자', phone: '010-3318-7056', hourlyWage: 12500 },
];

// 날짜별 근무 배치 (06, 07) — 날짜: [{ memberId, start, end, label }]
// 여기 없는 날짜는 MOCK_MY_SHIFTS(내 근무)만 배치된 걸로 봐.
export const MOCK_DAY_ASSIGNMENTS = {
  '2026-09-09': [
    { memberId: 'm1', start: '14:00', end: '22:00', label: '오후 근무' },
    { memberId: 'm2', start: '14:00', end: '18:00', label: '오후 근무' },
  ],
};

// 날짜별 시간대 최소 인원 (06, 07) — 날짜: [{ start, end, min }]
// TODO: 원래는 08의 규칙(요일·시간·인원)으로 계산되는 값이야. 백엔드가 날짜별로 계산해서 주는 걸 가정하고 피그마 06 예시를 넣어뒀어.
export const MOCK_DAY_SLOTS = {
  '2026-09-09': [
    { start: '14:00', end: '18:00', min: 3 },
    { start: '18:00', end: '22:00', min: 1 },
  ],
};

// 최소 근무 인원 규칙 (08)
const WEEKDAYS_MON_FRI = ['월', '화', '수', '목', '금'];
export const MOCK_STAFFING_RULES = [
  { id: 'r1', days: WEEKDAYS_MON_FRI, start: '09:00', end: '14:00', min: 2 },
  { id: 'r2', days: ['수'], start: '14:00', end: '18:00', min: 3 },
  { id: 'r3', days: WEEKDAYS_MON_FRI, start: '18:00', end: '22:00', min: 1 },
];

// 초대 코드 (09 초대 링크, 10 초대 링크 참여)
export const MOCK_INVITES = {
  CAFE24: {
    workspace: { id: 'cafe', name: '카페 알바', role: '근무자', memberCount: 4, scheduleSummary: '오늘 14:00–22:00' },
    inviterName: '김민수',
    description: '서로의 근무를 확인하고 함께 일정을 맞추는 공간입니다.',
  },
};
// 워크스페이스별 초대 코드 (09에서 보여줄 링크)
export const MOCK_INVITE_CODES = { cafe: 'CAFE24' };

// ───────── 3단계 (11~15) ─────────

// 대타 요청 (11 목록, 12 작성)
// status: 'open'(모집 중) | 'applied'(내가 지원함) | 'approved'(승인 완료)
export const MOCK_SWAP_REQUESTS = [
  { id: 's1', date: '2026-09-12', start: '14:00', end: '22:00', label: '오후 근무', requesterName: '박서연', reason: '개인 일정', status: 'open' },
  { id: 's2', date: '2026-09-13', start: '09:00', end: '15:00', label: '오전 근무', requesterName: '최유진', reason: '학사 일정', status: 'open' },
  { id: 's3', date: '2026-09-08', start: '14:00', end: '18:00', label: '오후 근무', requesterName: '김민수', substituteName: '이준호', reason: '개인 일정', status: 'approved' },
];

// 공지 (05 최근 공지, 13 목록, 14 상세, 15 작성)
// - pinned: 중요 공지(목록 맨 위, 제목 앞에 [필독])
// - headline: 상세 화면 두 번째 카드 제목 (15에서 새로 쓴 공지는 없음)
// - preview: 05 '최근 공지'에 보여줄 한 줄 요약
// 피그마에 본문이 없는 공지(n1, n3)는 내용을 임시로 채워뒀어.
export const MOCK_NOTICES = [
  {
    id: 'n2',
    title: '9월 스케줄 확인 요청',
    pinned: true,
    authorName: '김민수',
    authorRole: '관리자',
    createdAt: '2026-09-09T10:30',
    read: false,
    headline: '9월 근무 일정을 확인해주세요',
    body: '안녕하세요, 카페 알바 팀 여러분.\n\n9월 근무 일정이 등록되었습니다. 달력에서 본인의 근무 날짜와 시간을 확인해주세요.\n\n변경이 필요한 경우 9월 11일까지 관리자에게 알려주세요. 대타가 필요한 근무는 대타 요청 메뉴에 등록할 수 있습니다.\n\n확인 후 아래 버튼을 눌러주세요.',
    preview: '확정 전 내 근무 시간을 확인해주세요.',
  },
  {
    id: 'n1',
    title: '내일 오전 근무 변경',
    pinned: false,
    authorName: '김민수',
    authorRole: '관리자',
    createdAt: '2026-09-09T11:00',
    read: false,
    headline: '9월 10일 오전 근무 시간이 바뀌어요',
    body: '내일(9월 10일) 오전 근무 시작 시간이 오전 9시로 조정되었습니다.\n\n해당 근무자는 시간을 다시 확인해주세요.',
    preview: '김민수 · 오전 9시로 조정',
  },
  {
    id: 'n3',
    title: '추석 연휴 운영 안내',
    pinned: false,
    authorName: '김민수',
    authorRole: '관리자',
    createdAt: '2026-09-07T09:00',
    read: true,
    headline: '추석 연휴 기간 운영 시간 안내',
    body: '추석 연휴 기간에는 운영 시간이 단축됩니다.\n\n자세한 근무 일정은 달력에서 확인해주세요.',
    preview: '추석 연휴 기간 운영 시간 안내',
  },
];
