import { generatePath, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeading from '../../components/common/PageHeading';
import { useNotices } from '../../contexts/NoticeContext';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { PATHS } from '../../routes/paths';
import { formatDotDateTime } from '../../utils/date';

// 14 공지 상세 (피그마: 14 공지 상세, 1:52)
export default function NoticeDetailPage() {
  const navigate = useNavigate();
  const { noticeId } = useParams();
  const { workspaceId, workspace, eyebrow } = useRouteWorkspace();
  const { notices, markRead } = useNotices();
  const notice = notices.find((n) => n.id === noticeId);
  const goToList = () => navigate(generatePath(PATHS.notices, { workspaceId }));

  if (!notice) {
    // 디자인 없음 → 임시 화면
    return (
      <div className="flex flex-col gap-5 p-4">
        <PageHeading eyebrow={eyebrow} title="공지 상세" description="삭제되었거나 없는 공지예요." />
        <Button variant="soft" onClick={goToList}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading
        eyebrow={eyebrow}
        title="공지 상세"
        description={`${workspace ? `${workspace.name} · ` : ''}공지사항`}
      />

      <Card title={notice.title}>
        <p className="text-sm leading-[21px] text-muted">
          {notice.authorName} · {notice.authorRole}
          <br />
          {formatDotDateTime(notice.createdAt, true)}
        </p>
      </Card>

      {/* 피그마의 두 번째 카드 제목(headline)이 없는 공지(15에서 새로 쓴 공지)는 '공지 내용'으로 보여줘 */}
      <Card title={notice.headline ?? '공지 내용'}>
        <p className="text-sm leading-[21px] whitespace-pre-line text-muted">{notice.body}</p>
      </Card>

      {/* TODO: 백엔드 읽음 처리 API 연결. 확인 후 버튼 모습은 디자인이 없어서 비활성 + 글자 변경으로 임시 처리 */}
      <Button variant="primary" onClick={() => markRead(notice.id)} disabled={notice.read}>
        {notice.read ? '확인 완료한 공지예요' : '공지 확인 완료'}
      </Button>
      <Button variant="soft" onClick={goToList}>
        목록으로
      </Button>
    </div>
  );
}
