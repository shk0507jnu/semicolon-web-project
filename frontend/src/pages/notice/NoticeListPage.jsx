import { useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ListRow from '../../components/common/ListRow';
import PageHeading from '../../components/common/PageHeading';
import TextField from '../../components/common/TextField';
import { sortForList, useNotices } from '../../contexts/NoticeContext';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { PATHS } from '../../routes/paths';
import { formatDotDateTime } from '../../utils/date';

// 13 공지 목록 (피그마: 13 공지 목록, 1:52)
export default function NoticeListPage() {
  const navigate = useNavigate();
  const { workspaceId, eyebrow } = useRouteWorkspace();
  const { notices } = useNotices();
  const [query, setQuery] = useState('');

  // 제목·본문에 검색어가 들어간 공지만 (대소문자 무시)
  const q = query.trim().toLowerCase();
  const filtered = sortForList(notices).filter(
    (n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
  );

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading eyebrow={eyebrow} title="워크스페이스 공지" description="팀의 새로운 소식을 확인하세요." />

      <Card title="공지 검색">
        <TextField
          label="검색어"
          labelSize="sm"
          type="search"
          placeholder="제목 또는 내용을 입력하세요"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Card>

      <Card title={q ? `검색 결과 · ${filtered.length}` : `전체 공지 · ${filtered.length}`}>
        {filtered.length === 0 ? (
          <p className="text-sm leading-[21px] text-muted">
            {q ? '검색 결과가 없어요.' : '아직 등록된 공지가 없어요.'}
          </p>
        ) : (
          filtered.map((n) => (
            <ListRow
              key={n.id}
              title={`${n.pinned ? '[필독] ' : ''}${n.title}`}
              summary={`${n.authorName} · ${formatDotDateTime(n.createdAt)} · ${n.read ? '확인 완료' : '미확인'}`}
              onClick={() => navigate(generatePath(PATHS.noticeDetail, { workspaceId, noticeId: n.id }))}
            />
          ))
        )}
      </Card>

      {/* TODO: 공지 작성은 관리자만 보이게 (권한 확인 붙일 때) */}
      <Button variant="primary" onClick={() => navigate(generatePath(PATHS.noticeNew, { workspaceId }))}>
        + 공지 작성
      </Button>
    </div>
  );
}
