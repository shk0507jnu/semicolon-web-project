import { useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeading from '../../components/common/PageHeading';
import SelectField from '../../components/common/SelectField';
import TextAreaField from '../../components/common/TextAreaField';
import TextField from '../../components/common/TextField';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { WORKSPACE_TYPES } from '../../mocks/data';
import { PATHS } from '../../routes/paths';

// 04 워크스페이스 생성 (피그마: 04 워크스페이스 생성, 1:52)
export default function WorkspaceCreatePage() {
  const navigate = useNavigate();
  const { currentWorkspace, addWorkspace, selectWorkspace } = useWorkspace();
  const [form, setForm] = useState({ name: '', type: WORKSPACE_TYPES[0].value, description: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const created = await addWorkspace({
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim(),
      });
      selectWorkspace(created.id);
      navigate(generatePath(PATHS.calendar, { workspaceId: created.id }));
    } catch(e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading
        // 피그마 예시는 '카페 알바 · 워크스페이스' → 지금 선택된 워크스페이스 이름을 보여줘
        eyebrow={currentWorkspace ? `${currentWorkspace.name} · 워크스페이스` : '워크스페이스'}
        title="새 워크스페이스"
        description="함께 일할 공간의 정보를 입력하세요."
      />

      <Card title="워크스페이스 정보">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField
            label="이름"
            labelSize="sm"
            name="name"
            placeholder="카페 알바"
            value={form.name}
            onChange={handleChange}
            maxLength={30}
            required
          />
          <SelectField
            label="유형"
            labelSize="sm"
            name="type"
            options={WORKSPACE_TYPES}
            value={form.type}
            onChange={handleChange}
          />
          <TextAreaField
            label="설명"
            labelSize="sm"
            name="description"
            placeholder="함께 근무하는 카페 팀의 공간입니다."
            value={form.description}
            onChange={handleChange}
            maxLength={200}
          />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <Button type="submit" variant="primary" disabled={saving || !form.name.trim()}>
            워크스페이스 생성
          </Button>
        </form>
      </Card>

      <Card title="생성하면 관리자가 됩니다" tone="soft">
        <p className="text-sm leading-[21px] text-muted">
          멤버를 초대하고 근무 일정과 최소 인원을 설정할 수 있어요.
        </p>
      </Card>
    </div>
  );
}
