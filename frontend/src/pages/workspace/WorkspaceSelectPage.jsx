import { calendarApiEnabled } from '../../api/calendar';
import ApiState from '../../components/calendar/ApiState';
import { useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Callout from '../../components/common/Callout';
import Card from '../../components/common/Card';
import ListRow from '../../components/common/ListRow';
import PageHeading from '../../components/common/PageHeading';
import InviteJoinCard from '../../components/workspace/InviteJoinCard';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { PATHS } from '../../routes/paths';

// 03 워크스페이스 선택 (피그마: 03 워크스페이스 선택, 1:52)
//
// '워크스페이스 관리'를 누르면 관리 모드가 돼. (사용자·형 결정: 관리 → 워크스페이스 선택 → 09 멤버 관리)
//  - 보통 모드: 워크스페이스를 누르면 → 05 달력
//  - 관리 모드: 워크스페이스를 누르면 → 09 멤버 관리 (관리자인 워크스페이스만 누를 수 있어)
// 관리 모드의 안내 박스·흐린 표시는 피그마에 없어서 임시로 만든 거야.
export default function WorkspaceSelectPage() {
  const navigate = useNavigate();
  // TODO: 백엔드 API 연결 후 workspaces 는 서버에서 받아오기 (WorkspaceContext 참고)
  const { workspaces, selectWorkspace, loading, error, reload } = useWorkspace();
  const [manageMode, setManageMode] = useState(false);

  const handleSelect = (workspace) => {
    selectWorkspace(workspace.id);
    const target = manageMode ? PATHS.members : PATHS.calendar;
    navigate(generatePath(target, { workspaceId: workspace.id }));
  };

  // TODO: 백엔드 연결 후 역할 정보는 권한 값으로 확인하기 (지금은 '관리자' 글자로 판단)
  const canManage = (ws) => ws.role === '관리자';

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading
        eyebrow="MY WORKSPACES"
        title="어디에서 일하시나요?"
        description="참여 중인 워크스페이스를 선택하세요."
      />

      <ApiState loading={loading} error={error} reload={reload} />
      <Card title={`내 워크스페이스 · ${workspaces.length}`}>
        {manageMode && <Callout tone="info">관리할 워크스페이스를 선택하세요. 관리자인 곳만 선택할 수 있어요.</Callout>}
        {workspaces.map((ws) => {
          const disabled = manageMode && !canManage(ws);
          const row = (
            <ListRow
              key={ws.id}
              title={ws.name}
              summary={`${ws.role} · 멤버 ${ws.memberCount}명 · ${ws.scheduleSummary}`}
              onClick={disabled ? undefined : () => handleSelect(ws)}
            />
          );
          return disabled ? (
            <div key={ws.id} aria-disabled="true" className="opacity-40">
              {row}
            </div>
          ) : (
            row
          );
        })}
      </Card>

      <Button variant="primary" onClick={() => navigate(PATHS.workspaceNew)}>
        + 워크스페이스 생성
      </Button>

      <Button variant="soft" onClick={() => setManageMode((v) => !v)} aria-pressed={manageMode}>
        {manageMode ? '관리 취소' : '워크스페이스 관리'}
      </Button>

      {!calendarApiEnabled && <InviteJoinCard />}
    </div>
  );
}
