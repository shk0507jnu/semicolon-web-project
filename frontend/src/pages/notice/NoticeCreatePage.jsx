import { useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Checkbox from '../../components/common/Checkbox';
import PageHeading from '../../components/common/PageHeading';
import TextAreaField from '../../components/common/TextAreaField';
import TextField from '../../components/common/TextField';
import { useNotices } from '../../contexts/NoticeContext';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { PATHS } from '../../routes/paths';

// 15 공지 작성 (피그마: 15 공지 작성, 1:52) — 관리자 화면
export default function NoticeCreatePage() {
  const navigate = useNavigate();
  const { workspaceId, workspace, eyebrow } = useRouteWorkspace();
  const { addNotice } = useNotices();
  const [form, setForm] = useState({ title: '', body: '', pinned: false });

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: 백엔드 공지 등록 API 연결
    addNotice({ title: form.title.trim(), body: form.body.trim(), pinned: form.pinned });
    navigate(generatePath(PATHS.notices, { workspaceId }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-4">
      <PageHeading eyebrow={eyebrow} title="새 공지 작성" description="멤버에게 전달할 소식을 작성하세요." />

      <Card title="공지 내용">
        <TextField
          label="제목"
          labelSize="sm"
          name="title"
          placeholder="9월 스케줄 확인 요청"
          value={form.title}
          onChange={handleChange}
          maxLength={50}
          required
        />
        <TextAreaField
          label="본문"
          labelSize="sm"
          name="body"
          placeholder={'9월 근무 일정이 등록되었습니다.\n본인의 근무 날짜와 시간을 확인해주세요.'}
          value={form.body}
          onChange={handleChange}
          maxLength={2000}
          required
        />
        <Checkbox label="중요 공지로 상단에 고정" name="pinned" checked={form.pinned} onChange={handleChange} compact />
      </Card>

      <Card title="공개 범위" tone="soft">
        <p className="text-sm leading-[21px] text-muted">
          {workspace ? `${workspace.name} 워크스페이스의` : '이 워크스페이스의'} 모든 멤버
        </p>
      </Card>

      <Button type="submit" variant="primary">
        공지 등록
      </Button>
      <Button variant="soft" onClick={() => navigate(-1)}>
        취소
      </Button>
    </form>
  );
}
