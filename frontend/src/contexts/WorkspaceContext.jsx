import { createContext, useContext, useState } from 'react';
import { MOCK_WORKSPACES } from '../mocks/data';

// 워크스페이스 관련 상태를 앱 전체에서 공유해.
//  - workspaces: 내가 참여 중인 워크스페이스 목록
//  - currentWorkspaceId / currentWorkspace: 지금 선택된 워크스페이스
//    (하단 메뉴의 '달력', '대타'처럼 워크스페이스가 필요한 화면이 이 값을 보고 이동해)
// 선택한 워크스페이스는 새로고침해도 유지되게 브라우저(localStorage)에 저장해둬.
//
// TODO: 백엔드 API가 나오면 workspaces 는 서버에서 받아오고, addWorkspace 는 생성 API 호출로 바꾸기.
//       지금은 임시 데이터라 새로 만든 워크스페이스는 새로고침하면 사라져.
const STORAGE_KEY = 'shiftlink.currentWorkspaceId';
const WorkspaceContext = createContext(null);

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState(MOCK_WORKSPACES);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(readStored);

  const selectWorkspace = (id) => {
    setCurrentWorkspaceId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // 저장이 안 되는 환경이면 이번 방문 동안만 기억해
    }
  };

  // 새 워크스페이스 추가 후 만든 워크스페이스 객체를 돌려줘
  const addWorkspace = ({ name, type, description }) => {
    const workspace = {
      id: `ws-${Date.now()}`,
      name,
      type,
      description,
      role: '관리자', // 만든 사람은 관리자가 돼
      memberCount: 1,
      scheduleSummary: '등록된 근무 없음',
    };
    setWorkspaces((prev) => [...prev, workspace]);
    return workspace;
  };

  const currentWorkspace = workspaces.find((ws) => ws.id === currentWorkspaceId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, currentWorkspaceId, currentWorkspace, selectWorkspace, addWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace는 WorkspaceProvider 안에서만 쓸 수 있어');
  return ctx;
}
