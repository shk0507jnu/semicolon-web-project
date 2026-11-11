import { createContext, useContext, useState } from 'react';
import { useParams } from 'react-router-dom';
import { calendarApiEnabled } from '../api/calendar';
import { MOCK_NOTICES } from '../mocks/data';
import { nowDateTime } from '../utils/date';
import { useUser } from './UserContext';

// 공지를 앱 전체에서 공유해. (15에서 등록 → 13 목록·05 최근 공지에 바로 보이게, 14에서 확인 → 13에 '확인 완료')
// TODO: 백엔드 연결 후 목록 조회·등록·읽음 처리를 API 호출로 바꾸기. 지금은 새로고침하면 처음 상태로 돌아가.
const NoticeContext = createContext(null);

// 중요 공지 먼저, 그다음 최신순
export const sortForList = (notices) =>
  [...notices].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));

// 최신순 (05 최근 공지)
export const sortByRecent = (notices) => [...notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function NoticeProvider({ children }) {
  const { user } = useUser();
  const [notices, setNotices] = useState(calendarApiEnabled ? [] : MOCK_NOTICES.map(n => ({ ...n, workspaceId: 'cafe' })));

  const addNotice = ({ workspaceId, title, body, pinned }) => {
    if (calendarApiEnabled) throw new Error('공지 저장 기능을 준비하고 있어요.');
    const notice = {
      id: `n-${Date.now()}`,
      workspaceId,
      title,
      body,
      pinned,
      authorName: user.name,
      authorRole: '관리자', // 공지 작성은 관리자만 할 수 있어
      createdAt: nowDateTime(),
      read: true, // 내가 쓴 공지는 확인한 걸로
      headline: null,
      preview: body.split('\n')[0],
    };
    setNotices((prev) => [notice, ...prev]);
    return notice;
  };

  const markRead = (id, workspaceId) => setNotices((prev) => prev.map((n) => (n.id === id && n.workspaceId === workspaceId ? { ...n, read: true } : n)));

  return <NoticeContext.Provider value={{ notices, addNotice, markRead }}>{children}</NoticeContext.Provider>;
}

export function useNotices(workspaceId) {
  const ctx = useContext(NoticeContext);
  const params = useParams();
  if (!ctx) throw new Error('useNotices는 NoticeProvider 안에서만 쓸 수 있어');
  const id = workspaceId ?? params.workspaceId;
  return {
    notices: ctx.notices.filter(n => n.workspaceId === id),
    available: !calendarApiEnabled,
    addNotice: values => ctx.addNotice({ ...values, workspaceId: id }),
    markRead: noticeId => ctx.markRead(noticeId, id),
  };
}
