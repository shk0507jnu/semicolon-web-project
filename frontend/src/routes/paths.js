// 사이트맵 17개 화면의 주소를 한곳에서 관리해.
// 페이지에서 주소 문자열을 직접 쓰지 말고 PATHS.xxx 를 쓰면, 나중에 주소가 바뀌어도 여기만 고치면 돼.
// access: 'public' = 누구나, 'auth' = 로그인 후, 'admin' = 관리자

export const PATHS = {
  login: '/login',                                   // 01
  signup: '/signup',                                 // 02
  workspaces: '/workspaces',                         // 03
  workspaceNew: '/workspaces/new',                   // 04
  calendar: '/w/:workspaceId/calendar',              // 05
  dayDetail: '/w/:workspaceId/calendar/:date',       // 06
  scheduleManage: '/w/:workspaceId/schedule',        // 07
  minStaff: '/w/:workspaceId/schedule/min-staff',    // 08
  members: '/w/:workspaceId/members',                // 09
  invite: '/invite/:inviteCode',                     // 10
  swaps: '/w/:workspaceId/swaps',                    // 11
  swapNew: '/w/:workspaceId/swaps/new',              // 12
  notices: '/w/:workspaceId/notices',                // 13
  noticeDetail: '/w/:workspaceId/notices/:noticeId', // 14
  noticeNew: '/w/:workspaceId/notices/new',          // 15
  payroll: '/w/:workspaceId/payroll',                // 16
  me: '/me',                                         // 17
};

// 아직 구현하지 않은 화면 목록 (구현하면 App.jsx에 실제 페이지로 연결하고 여기서 빼면 돼)
export const PENDING_SCREENS = [
  { no: '05', name: '달력 대시보드', path: PATHS.calendar, access: 'auth' },
  { no: '06', name: '날짜별 근무 상세', path: PATHS.dayDetail, access: 'auth' },
  { no: '07', name: '근무 배치 관리', path: PATHS.scheduleManage, access: 'admin' },
  { no: '08', name: '최소 근무 인원 설정', path: PATHS.minStaff, access: 'admin' },
  { no: '09', name: '멤버 관리', path: PATHS.members, access: 'admin' },
  { no: '10', name: '초대 링크 참여', path: PATHS.invite, access: 'auth' },
  { no: '11', name: '대타 요청 목록', path: PATHS.swaps, access: 'auth' },
  { no: '12', name: '대타 요청 작성', path: PATHS.swapNew, access: 'auth' },
  { no: '13', name: '공지 목록', path: PATHS.notices, access: 'auth' },
  { no: '14', name: '공지 상세', path: PATHS.noticeDetail, access: 'auth' },
  { no: '15', name: '공지 작성', path: PATHS.noticeNew, access: 'admin' },
  { no: '16', name: '급여 확인', path: PATHS.payroll, access: 'auth' },
  { no: '17', name: '내 정보', path: PATHS.me, access: 'auth' },
];
