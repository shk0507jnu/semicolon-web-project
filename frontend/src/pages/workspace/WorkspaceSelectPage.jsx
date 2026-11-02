import { generatePath, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ListRow from '../../components/common/ListRow';
import PageHeading from '../../components/common/PageHeading';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { PATHS } from '../../routes/paths';

// 03 워크스페이스 선택 (피그마: 03 워크스페이스 선택, 1:52)
export default function WorkspaceSelectPage() {
  const navigate = useNavigate();
  // TODO: 백엔드 API 연결 후 workspaces 는 서버에서 받아오기 (WorkspaceContext 참고)
  const { workspaces, selectWorkspace } = useWorkspace();

  const handleSelect = (workspace) => {
    selectWorkspace(workspace.id);
    navigate(generatePath(PATHS.calendar, { workspaceId: workspace.id }));
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading
        eyebrow="MY WORKSPACES"
        title="어디에서 일하시나요?"
        description="참여 중인 워크스페이스를 선택하세요."
      />

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
