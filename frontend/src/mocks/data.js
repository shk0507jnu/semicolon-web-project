// 백엔드 API가 나오기 전까지 화면에 보여줄 임시 데이터 (피그마 예시 그대로)
// API가 연결되면 이 파일 대신 서버에서 받아온 값을 쓰면 돼.

export const MOCK_USER = { name: '김민수' };

export const MOCK_WORKSPACES = [
  { id: 'cafe', name: '카페 알바', role: '관리자', memberCount: 4, scheduleSummary: '오늘 14:00–22:00' },
  { id: 'capstone', name: '캡스톤 프로젝트', role: '근무자', memberCount: 6, scheduleSummary: '주 3회 협업' },
  { id: 'store', name: '주말 편의점', role: '근무자', memberCount: 5, scheduleSummary: '토·일 09:00–15:00' },
];
