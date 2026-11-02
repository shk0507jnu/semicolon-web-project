// 백엔드 API가 나오기 전까지 화면에 보여줄 임시 데이터 (피그마 예시 그대로)
// API가 연결되면 이 파일 대신 서버에서 받아온 값을 쓰면 돼.

export const MOCK_USER = { name: '김민수' };

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
