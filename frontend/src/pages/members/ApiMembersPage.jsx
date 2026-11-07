import ApiState from '../../components/calendar/ApiState';
import Card from '../../components/common/Card';
import PageHeading from '../../components/common/PageHeading';
import { useCalendarApi } from '../../hooks/useCalendarApi';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';

export default function ApiMembersPage() {
  const { workspaceId, eyebrow } = useRouteWorkspace();
  const state = useCalendarApi(workspaceId, ['/members']);
  return <div className="flex flex-col gap-5 p-4">
    <PageHeading eyebrow={eyebrow} title="워크스페이스 멤버" description="근무를 배정할 수 있는 소속 멤버입니다." />
    <ApiState {...state} />
    {state.data && <Card title={`멤버 · ${state.data[0].items.length}명`}>
      {state.data[0].items.map(m=><p className="text-sm text-ink-strong" key={m.id}>{m.name} · {m.role==='editor'?'관리자':'근무자'}</p>)}
      <p className="text-xs text-muted">연락처·시급·초대 기능은 아직 연결되지 않았어요.</p>
    </Card>}
  </div>;
}
