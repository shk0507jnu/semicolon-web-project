import { calendarApiEnabled } from '../../api/calendar';
import ApiMembersPage from './ApiMembersPage';
import { useState } from 'react';
import { generatePath } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ListRow from '../../components/common/ListRow';
import PageHeading from '../../components/common/PageHeading';
import TextField from '../../components/common/TextField';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { MOCK_INVITE_CODES, MOCK_MEMBERS } from '../../mocks/data';
import { PATHS } from '../../routes/paths';

// 09 멤버 관리 (피그마: 09 멤버 관리, 1:52) — 관리자 화면
function MockMembersPage() {
  const { workspaceId, eyebrow } = useRouteWorkspace();
  // TODO: 백엔드 연결 후 멤버 목록·초대 코드를 API로 받아오기
  const members = MOCK_MEMBERS;
  const inviteCode = MOCK_INVITE_CODES[workspaceId] ?? 'CAFE24';

  // 실제 접속 주소 기준으로 초대 링크를 만들어 (배포하면 그 주소로 자동으로 바뀜)
  const inviteUrl = `${window.location.origin}${generatePath(PATHS.invite, { inviteCode })}`;
  const displayUrl = inviteUrl.replace(/^https?:\/\//, '');

  // 복사 결과를 버튼 글자로 잠깐 보여줘 (피그마에 복사 완료 상태가 없어서 임시)
  const [copyState, setCopyState] = useState('idle'); // idle | copied | failed
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    setTimeout(() => setCopyState('idle'), 2000);
  };

  // 휴대폰처럼 공유 기능이 있으면 공유창을 띄우고, 없으면 링크 복사
  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: '시프트링크 워크스페이스 초대', url: inviteUrl });
        return;
      } catch {
        // 사용자가 공유를 취소한 경우 등 → 아무것도 안 함
        return;
      }
    }
    copyLink();
  };

  const copyLabel = { idle: '초대 링크 복사', copied: '복사했어요!', failed: '복사에 실패했어요' }[copyState];

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading eyebrow={eyebrow} title="알바생·멤버 관리" description="멤버의 역할과 기본 시급을 관리하세요." />

      <Card title="워크스페이스 초대 링크">
        <TextField label="초대 주소" labelSize="sm" value={displayUrl} readOnly onFocus={(e) => e.target.select()} />
        <Button variant="primary" onClick={copyLink}>
          {copyLabel}
        </Button>
      </Card>

      <Card title={`멤버 ${members.length}명`}>
        <p className="text-[10px] leading-[15px] font-medium text-muted">멤버별 역할, 연락처와 기본 시급</p>
        {/* TODO: 멤버를 누르면 역할·시급 수정 화면으로 (디자인 없음) */}
        {members.map((m) => (
          <ListRow
            key={m.id}
            title={`${m.name} · ${m.role}`}
            summary={`${m.phone}  ·  ${m.hourlyWage.toLocaleString('ko-KR')}원`}
          />
        ))}
      </Card>

      <Button variant="primary" onClick={shareInvite}>
        + 새 멤버 초대
      </Button>
      <p className="text-xs leading-[18px] text-muted">기본 시급은 근무 기록과 예상 급여 계산에 사용됩니다.</p>
    </div>
  );
}

export default function MembersPage() { return calendarApiEnabled ? <ApiMembersPage /> : <MockMembersPage />; }
