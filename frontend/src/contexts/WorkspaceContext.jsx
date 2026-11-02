import { createContext, useContext, useState } from 'react';

// 지금 선택된 워크스페이스를 앱 전체에서 공유해.
// 하단 메뉴의 '달력', '대타'처럼 워크스페이스가 필요한 화면이 이 값을 보고 이동해.
// 새로고침해도 유지되게 브라우저(localStorage)에 저장해둬.
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
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(readStored);

  const selectWorkspace = (id) => {
    setCurrentWorkspaceId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // 저장이 안 되는 환경이면 이번 방문 동안만 기억해
    }
  };

  return (
    <WorkspaceContext.Provider value={{ currentWorkspaceId, selectWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace는 WorkspaceProvider 안에서만 쓸 수 있어');
  return ctx;
}
