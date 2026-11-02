import { generatePath, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ListRow from '../../components/common/ListRow';
import PageHeading from '../../components/common/PageHeading';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { MOCK_INVITES, MOCK_USER } from '../../mocks/data';
import { PATHS } from '../../routes/paths';

// 10 초대 링크 참여 (피그마: 10 초대 링크 참여, 1:52)
// TODO: 로그인 안 한 사람이 링크를 열면 → 로그인 화면으로 보냈다가 로그인 후 이 화면으로 돌아오게 (로그인 상태 관리 붙일 때)
export default function InvitePage() {
  const navigate = useNavigate();
  const { inviteCode } = useParams();
  const { joinWorkspace } = useWorkspace();

  // TODO: 백엔드 연결 후 초대 코드로 워크스페이스 정보 조회
  const invite = MOCK_INVITES[inviteCode?.toUpperCase()];

  if (!invite) {
    // 디자인 없음 → 임시 화면
    return (
      <div className="flex flex-col gap-5 p-4">
        <PageHeading eyebrow="WORKSPACE INVITATION" title="초대 링크를 확인해주세요" description="만료되었거나 잘못된 초대 링크예요." />
        <Button variant="soft" onClick={() => navigate(PATHS.workspaces)}>
          내 워크스페이스로 가기
        </Button>
      </div>
    );
  }

  const { workspace, inviterName, description } = invite;

  const handleJoin = () => {
    // TODO: 백엔드 워크스페이스 참여 API 연결
    joinWorkspace(workspace);
    navigate(generatePath(PATHS.calendar, { workspaceId: workspace.id }));
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading
        eyebrow="WORKSPACE INVITATION"
        title="함께 일할 준비되셨나요?"
        description={`${inviterName}님이 워크스페이스에 초대했어요.`}
      />

      <Card title={workspace.name} tone="soft">
        <p className="text-[28px] leading-[42px] font-bold text-darkblue">멤버 {workspace.memberCount}명</p>
        <p className="text-sm leading-[21px] text-muted">{description}</p>
      </Card>

      <Card title="참여 정보">
        <ListRow title="내 계정" summary={`${MOCK_USER.name} · ${MOCK_USER.email}`} />
        <ListRow title="참여 역할" summary={`${workspace.role} · 관리자가 역할을 변경할 수 있어요.`} />
      </Card>

      <Button variant="primary" onClick={handleJoin}>
        워크스페이스 참여
      </Button>
      {/* TODO: 로그아웃 처리 후 로그인 화면으로 (지금은 이동만) */}
      <Button variant="soft" onClick={() => navigate(PATHS.login)}>
        다른 계정으로 로그인
      </Button>
      <p className="text-xs leading-[18px] text-muted">참여하면 이 워크스페이스의 일정과 공지를 확인할 수 있습니다.</p>
    </div>
  );
}
