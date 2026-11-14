import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { calendarApiEnabled } from '../api/calendar';
import { MOCK_CHAT } from '../mocks/chat';

// 19 플로팅 채팅 상태를 앱 전체에서 공유해. (화면을 옮겨 다녀도 대화·작성 중 글이 유지되게)
//  - open: 채팅 패널이 열렸는지 (워크스페이스 화면 어디서든 같은 버튼)
//  - 워크스페이스별: messages, draft(작성 중 글 — 채팅을 닫아도 유지), noticeMode('공지로 보내기' 체크), unread
//  - addedShifts: 채팅 공지에서 '일정에 추가'한 근무 → 05 달력에 바로 보이게
// API 모드(VITE_DATA_SOURCE=api)에서는 예시 대화를 섞지 않아. 채팅 API가 생기면 여기만 바꾸면 돼.
const ChatContext = createContext(null);

const initialRooms = () =>
  calendarApiEnabled
    ? {}
    : Object.fromEntries(Object.entries(MOCK_CHAT).map(([id, room]) => [id, { ...room, draft: '', noticeMode: false }]));

const emptyRoom = { messages: [], unread: 0, draft: '', noticeMode: false };

export function ChatProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState(initialRooms);
  const [addedShifts, setAddedShifts] = useState({});

  const updateRoom = useCallback((workspaceId, patch) => {
    setRooms(prev => {
      const room = prev[workspaceId] ?? emptyRoom;
      return { ...prev, [workspaceId]: { ...room, ...(typeof patch === 'function' ? patch(room) : patch) } };
    });
  }, []);

  const value = useMemo(() => ({
    open,
    setOpen,
    rooms,
    updateRoom,
    addedShifts,
    // 같은 날짜·시간·사람이 이미 있으면 다시 넣지 않고 false 를 돌려줘 (중복 등록 방지)
    addShift: (workspaceId, shift) => {
      const existing = addedShifts[workspaceId]?.[shift.date];
      if (existing && existing.start === shift.start && existing.end === shift.end && existing.memberName === shift.memberName) return false;
      setAddedShifts(prev => ({ ...prev, [workspaceId]: { ...prev[workspaceId], [shift.date]: shift } }));
      return true;
    },
  }), [open, rooms, updateRoom, addedShifts]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat은 ChatProvider 안에서만 쓸 수 있어');
  return ctx;
}

// 05 달력에서 쓰는 '채팅으로 추가한 내 근무' (날짜: { label, start, end, fromChat })
export function useChatShifts(workspaceId, memberName) {
  const ctx = useContext(ChatContext);
  const all = ctx?.addedShifts[workspaceId] ?? {};
  return Object.fromEntries(Object.entries(all).filter(([, s]) => s.memberName === memberName));
}
