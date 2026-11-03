import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ListRow from '../../components/common/ListRow';
import PageHeading from '../../components/common/PageHeading';
import TextField from '../../components/common/TextField';
import { useUser } from '../../contexts/UserContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { PATHS } from '../../routes/paths';

// 17 내 정보 (피그마: 17 내 정보, 1:52) — 하단 메뉴 'MY'
export default function MyPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useUser();
  const { workspaces } = useWorkspace();
  const [form, setForm] = useState({ name: user.name, phone: user.phone });
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    // TODO: 백엔드 내 정보 수정 API 연결
    updateUser({ name: form.name.trim(), phone: form.phone.trim() });
    // 저장 완료 표시는 디자인이 없어서 버튼 글자로 잠깐 보여줘
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate(PATHS.login, { replace: true });
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading eyebrow="MY PROFILE" title="내 정보" description="계정 정보와 알림을 관리하세요." />

      <Card title={user.name} tone="soft">
        <p className="text-sm leading-[21px] text-muted">
          {user.email}
          <br />
          참여 중인 워크스페이스 {workspaces.length}개
        </p>
      </Card>

      <Card title="기본 정보">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <TextField
            label="이름"
            labelSize="sm"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            maxLength={20}
            required
          />
          <TextField
            label="연락처"
            labelSize="sm"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="010-0000-0000"
            value={form.phone}
            onChange={handleChange}
            pattern="[0-9\-]{9,13}"
            title="숫자와 -만 입력해주세요"
          />
          <Button type="submit" variant="primary">
            {saved ? '저장했어요!' : '변경사항 저장'}
          </Button>
        </form>
      </Card>

      <Card title="계정 설정">
        {/* TODO: 비밀번호 변경·알림 설정 화면은 사이트맵·디자인에 없어서 보기 전용 (형한테 확인 필요) */}
        <ListRow title="비밀번호 변경" summary="계정의 비밀번호를 변경합니다." />
        <ListRow title="알림 설정" summary="근무 변경 · 대타 요청 · 새 공지" />
      </Card>

      <Button variant="soft" onClick={handleLogout}>
        로그아웃
      </Button>
    </div>
  );
}
