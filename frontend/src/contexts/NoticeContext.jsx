import { createContext, useContext, useState } from 'react';
import { MOCK_NOTICES, MOCK_USER } from '../mocks/data';
import { nowDateTime } from '../utils/date';

// 공지를 앱 전체에서 공유해. (15에서 등록 → 13 목록·05 최근 공지에 바로 보이게, 14에서 확인 → 13에 '확인 완료')
// TODO: 백엔드 연결 후 목록 조회·등록·읽음 처리를 API 호출로 바꾸기. 지금은 새로고침하면 처음 상태로 돌아가.
const NoticeContext = createContext(null);

// 중요 공지 먼저, 그다음 최신순
export const sortForList = (notices) =>
  [...notices].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));

// 최신순 (05 최근 공지)
export const sortByRecent = (notices) => [...notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function NoticeProvider({ children }) {
  const [notices, setNotices] = useState(MOCK_NOTICES);

  const addNotice = ({ title, body, pinned }) => {
    const notice = {
      id: `n-${Date.now()}`,
      title,
      body,
      pinned,
      authorName: MOCK_USER.name,
      authorRole: '관리자', // 공지 작성은 관리자만 할 수 있어
      createdAt: nowDateTime(),
      read: true, // 내가 쓴 공지는 확인한 걸로
      headline: null,
      preview: body.split('\n')[0],
    };
    setNotices((prev) => [notice, ...prev]);
    return notice;
  };

  const markRead = (id) => setNotices((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return <NoticeContext.Provider value={{ notices, addNotice, markRead }}>{children}</NoticeContext.Provider>;
}

export function useNotices() {
  const ctx = useContext(NoticeContext);
  if (!ctx) throw new Error('useNotices는 NoticeProvider 안에서만 쓸 수 있어');
  return ctx;
}
