import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';

// 주소(/w/:workspaceId/...)에 있는 워크스페이스 정보를 꺼내줘.
// eyebrow: 페이지 상단 파란 소제목 ('카페 알바 · 워크스페이스')
export function useRouteWorkspace() {
  const { workspaceId } = useParams();
  const { workspaces, currentWorkspaceId, selectWorkspace } = useWorkspace();
  const workspace = workspaces.find((ws) => ws.id === workspaceId) ?? null;
  useEffect(() => {
    if (workspace && currentWorkspaceId !== workspaceId) selectWorkspace(workspaceId);
  }, [workspace, workspaceId, currentWorkspaceId, selectWorkspace]);

  return {
    workspaceId,
    workspace,
    eyebrow: workspace ? `${workspace.name} · 워크스페이스` : '워크스페이스',
  };
}
