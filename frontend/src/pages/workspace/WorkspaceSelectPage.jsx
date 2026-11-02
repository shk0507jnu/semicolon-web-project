import { generatePath, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ListRow from '../../components/common/ListRow';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { MOCK_WORKSPACES } from '../../mocks/data';
import { PATHS } from '../../routes/paths';

// 03 워크스페이스 선택 (피그마: 03 워크스페이스 선택, 1:52)
export default function WorkspaceSelectPage() {
  const navigate = useNavigate();
  const { selectWorkspace } = useWorkspace();
  // TODO: 백엔드 API 연결 후 내가 참여 중인 워크스페이스 목록 받아오기
  const workspaces = MOCK_WORKSPACES;

  const handleSelect = (workspace) => {
    selectWorkspace(workspace.id);
    navigate(generatePath(PATHS.calendar, { workspaceId: workspace.id }));
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <header className="flex flex-col gap-1">
        <p className="text-xs leading-[18px] text-darkblue">MY WORKSPACES</p>
        <h1 className="text-2xl leading-9 font-bold text-ink-strong">어디에서 일하시나요?</h1>
        <p className="text-xs leading-[18px] text-muted">참여 중인 워크스페이스를 선택하세요.</p>
      </header>

      <Card title={`내 워크스페이스 · ${workspaces.length}`}>
        {workspaces.map((ws) => (
          <ListRow
            key={ws.id}
            title={ws.name}
            summary={`${ws.role} · 멤버 ${ws.memberCount}명 · ${ws.scheduleSummary}`}
            onClick={() => handleSelect(ws)}
          />
        ))}
      </Card>

      <Button variant="primary" onClick={() => navigate(PATHS.workspaceNew)}>
        + 워크스페이스 생성
      </Button>

      {/* TODO: '워크스페이스 관리'가 어느 화면으로 가는지 사이트맵에 없어서 형한테 확인 필요 */}
      <Button variant="soft">워크스페이스 관리</Button>

      <Card title="초대받으셨나요?" tone="soft">
        <p className="text-sm leading-[21px] text-muted">
          초대 링크를 열어 동료의 워크스페이스에 참여할 수 있어요.
        </p>
      </Card>
    </div>
  );
}
