import { calendarApiEnabled, calendarRequest } from '../api/calendar';
import { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_WORKSPACES } from '../mocks/data';

// 워크스페이스 관련 상태를 앱 전체에서 공유해.
//  - workspaces: 내가 참여 중인 워크스페이스 목록
//  - currentWorkspaceId / currentWorkspace: 지금 선택된 워크스페이스
//    (하단 메뉴의 '달력', '대타'처럼 워크스페이스가 필요한 화면이 이 값을 보고 이동해)
// 선택한 워크스페이스는 새로고침해도 유지되게 브라우저(localStorage)에 저장해둬.
//
// API 모드에서는 목록과 생성 결과를 DB에 저장하고, 예시 모드에서는 로컬 상태를 사용한다.
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
  const [workspaces, setWorkspaces] = useState(calendarApiEnabled ? [] : MOCK_WORKSPACES);
  const [loading, setLoading] = useState(calendarApiEnabled);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!calendarApiEnabled) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    calendarRequest('/workspaces', {signal:controller.signal})
      .then(result => { if (!controller.signal.aborted) setWorkspaces(result.items); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
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
  const addWorkspace = async ({ name, type, description }) => {
    if (calendarApiEnabled) {
      const workspace = await calendarRequest('/workspaces',{method:'POST',body:{name,type,description}});
      setWorkspaces(prev => [...prev, workspace]);
      return workspace;
    }
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

  // 초대받은 워크스페이스에 참여 (이미 참여 중이면 그대로 둬)
  const joinWorkspace = (workspace) => {
    setWorkspaces((prev) => (prev.some((ws) => ws.id === workspace.id) ? prev : [...prev, workspace]));
    selectWorkspace(workspace.id);
  };

  const currentWorkspace = workspaces.find((ws) => ws.id === currentWorkspaceId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{ loading, error, reload:()=>setRevision(v=>v+1), workspaces, currentWorkspaceId, currentWorkspace, selectWorkspace, addWorkspace, joinWorkspace }}
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
