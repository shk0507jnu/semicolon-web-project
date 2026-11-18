import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Callout from '../../components/common/Callout';
import Card from '../../components/common/Card';
import Checkbox from '../../components/common/Checkbox';
import ListRow from '../../components/common/ListRow';
import PageHeading from '../../components/common/PageHeading';
import PasswordField from '../../components/common/PasswordField';
import TextField from '../../components/common/TextField';
import { useUser } from '../../contexts/UserContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { PASSWORD_MIN_LENGTH } from '../../db/localDb.mjs';
import { PATHS } from '../../routes/paths';

// 17 내 정보 (피그마: 17 내 정보, 1:52) — 하단 메뉴 'MY'
// 오프라인 로컬 DB 연결:
//  - 기본 정보(이름·연락처) 저장 → users 표. 새로고침·재로그인해도 유지
//  - 비밀번호 변경 → auth_accounts (현재 비밀번호 확인, 다른 기기 로그아웃)
//  - 알림 설정 3개 → user_notification_settings (누르면 바로 저장)
// 비밀번호 변경·알림 설정은 디자인이 없어서, 목록 줄을 누르면 아래로 펼쳐지는 임시 모양이야. (형한테 확인 필요)
export default function MyPage() {
  const navigate = useNavigate();
  const { user, updateUser, logOut } = useUser();
  const { workspaces } = useWorkspace();
  const [form, setForm] = useState({ name: user.name, phone: user.phone });
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [openSection, setOpenSection] = useState(null); // 'password' | 'notifications' | null

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
    setProfileError('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    const result = updateUser({ name: form.name.trim(), phone: form.phone.trim() });
    if (!result.ok) {
      setProfileError(result.message);
      return;
    }
    // 저장 완료 표시는 디자인이 없어서 버튼 글자로 잠깐 보여줘
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logOut();
    navigate(PATHS.login, { replace: true });
  };

  const toggle = (section) => setOpenSection((prev) => (prev === section ? null : section));

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
          {profileError && <Callout tone="danger">{profileError}</Callout>}
          <Button type="submit" variant="primary">
            {saved ? '저장했어요!' : '변경사항 저장'}
          </Button>
        </form>
      </Card>

      <Card title="계정 설정">
        <ListRow
          title="비밀번호 변경"
          summary="계정의 비밀번호를 변경합니다."
          onClick={() => toggle('password')}
          aria-expanded={openSection === 'password'}
        />
        {openSection === 'password' && <PasswordChangeForm onDone={() => setOpenSection(null)} />}
        <ListRow
          title="알림 설정"
          summary="근무 변경 · 대타 요청 · 새 공지"
          onClick={() => toggle('notifications')}
          aria-expanded={openSection === 'notifications'}
        />
        {openSection === 'notifications' && <NotificationSettings />}
      </Card>

      <Button variant="soft" onClick={handleLogout}>
        로그아웃
      </Button>
    </div>
  );
}

function PasswordChangeForm({ onDone }) {
  const { changePassword } = useUser();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [message, setMessage] = useState(null); // { tone, text }
  const [pending, setPending] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setMessage({ tone: 'danger', text: '새 비밀번호가 일치하지 않아요.' });
      return;
    }
    setPending(true);
    const result = await changePassword({ current: form.current, next: form.next });
    setPending(false);
    if (!result.ok) {
      setMessage({ tone: 'danger', text: result.message });
      return;
    }
    setForm({ current: '', next: '', confirm: '' });
    setMessage({ tone: 'info', text: '비밀번호를 바꿨어요. 다른 기기에서는 로그아웃돼요.' });
    setTimeout(onDone, 1500);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-line bg-canvas p-3">
      <PasswordField label="현재 비밀번호" labelSize="sm" name="current" autoComplete="current-password" value={form.current} onChange={handleChange} required />
      <PasswordField
        label="새 비밀번호"
        labelSize="sm"
        name="next"
        autoComplete="new-password"
        placeholder={`${PASSWORD_MIN_LENGTH}자 이상`}
        value={form.next}
        onChange={handleChange}
        minLength={PASSWORD_MIN_LENGTH}
        required
      />
      <PasswordField label="새 비밀번호 확인" labelSize="sm" name="confirm" autoComplete="new-password" value={form.confirm} onChange={handleChange} required />
      {message && <Callout tone={message.tone}>{message.text}</Callout>}
      <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
        {pending ? '확인하는 중…' : '비밀번호 변경'}
      </Button>
    </form>
  );
}

const NOTIFICATION_OPTIONS = [
  { key: 'shiftChange', label: '근무 변경 알림' },
  { key: 'substituteRequest', label: '대타 요청 알림' },
  { key: 'announcement', label: '새 공지 알림' },
];

function NotificationSettings() {
  const { getNotificationSettings, updateNotificationSettings } = useUser();
  const [settings, setSettings] = useState(getNotificationSettings);

  const handleChange = (key) => (e) => {
    const next = { ...settings, [key]: e.target.checked };
    setSettings(next);
    updateNotificationSettings({ [key]: e.target.checked });
  };

  return (
    <fieldset className="flex flex-col rounded-xl border border-line bg-canvas px-3 py-1">
      <legend className="sr-only">알림 설정</legend>
      {NOTIFICATION_OPTIONS.map((option) => (
        <Checkbox key={option.key} label={option.label} name={option.key} checked={settings[option.key]} onChange={handleChange(option.key)} />
      ))}
      <p className="pb-2 text-[11px] leading-4 text-muted">바꾸면 바로 저장돼요. (실제 알림 발송은 서버 연결 후)</p>
    </fieldset>
  );
}
