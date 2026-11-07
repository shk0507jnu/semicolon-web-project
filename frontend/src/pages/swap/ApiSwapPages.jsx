import { useState } from 'react';
import { generatePath, useNavigate, useSearchParams } from 'react-router-dom';
import { calendarRequest } from '../../api/calendar';
import ApiState from '../../components/calendar/ApiState';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import DateField from '../../components/common/DateField';
import PageHeading from '../../components/common/PageHeading';
import SelectField from '../../components/common/SelectField';
import TextAreaField from '../../components/common/TextAreaField';
import { useCalendarApi } from '../../hooks/useCalendarApi';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { PATHS } from '../../routes/paths';
import { actualToday, eventTimeLabel } from '../../utils/calendarModel.mjs';

export function ApiSwapCreate() {
  const { workspaceId, eyebrow } = useRouteWorkspace();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [date, setDate] = useState(search.get('date') || actualToday());
  const [eventId, setEventId] = useState(search.get('event') || '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const state = useCalendarApi(workspaceId, [`/calendar/days/${date}?mine=true`]);
  const options = (state.data?.[0].events || []).filter(e => e.can_request_substitute);
  const selected = options.find(e=>String(e.id)===eventId) || options[0];
  async function save(e) {
    e.preventDefault(); if (!selected) return; setError(''); setBusy(true);
    try {
      await calendarRequest(`/events/${selected.id}/substitute-requests`, {workspaceId,method:'POST',body:{reason:reason.trim()}});
      navigate(generatePath(PATHS.swaps, {workspaceId}));
    } catch(e) {setError(e.message);state.reload();} finally {setBusy(false);}
  }
  return <form onSubmit={save} className="flex flex-col gap-5 p-4">
    <PageHeading eyebrow={eyebrow} title="대타 요청하기" description="본인에게 배정된 앞으로의 일정을 선택하세요." />
    <Card title="요청할 일정">
      <DateField label="날짜" value={date} onChange={next=>{setDate(next);setEventId('');}} />
      <ApiState {...state} />
      {options.length ? <SelectField label="내 일정" value={String(selected.id)} onChange={e=>setEventId(e.target.value)} options={options.map(e=>({value:String(e.id),label:`${e.title} · ${eventTimeLabel(e)}`}))} />
        : state.data && <p className="text-sm text-muted">이 날짜에 대타를 요청할 수 있는 일정이 없어요.</p>}
      <TextAreaField label="요청 사유" labelSize="sm" value={reason} onChange={e=>setReason(e.target.value)} maxLength={200} />
    </Card>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Button type="submit" disabled={!selected || busy}>{busy ? '등록 중…' : '대타 요청 등록'}</Button>
  </form>;
}

const STATUS = {pending:'모집 중',accepted:'수락 완료',rejected:'거절됨',cancelled:'취소됨'};
export function ApiSwapList() {
  const { workspaceId, eyebrow } = useRouteWorkspace();
  const navigate = useNavigate();
  const [mine, setMine] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const state = useCalendarApi(workspaceId, [`/substitute-requests?status=all&mine=${mine}`, '/me']);
  const [requests, me] = state.data || [];
  async function act(id, action) {
    setError(''); setBusy(id);
    try {await calendarRequest(`/substitute-requests/${id}`, {workspaceId,method:'PATCH',body:{action}});state.reload();}
    catch(e) {setError(e.message);} finally {setBusy(null);}
  }
  return <div className="flex flex-col gap-5 p-4">
    <PageHeading eyebrow={eyebrow} title="대타 요청" description="수락하면 해당 일정의 담당자가 변경됩니다." />
    <div className="flex gap-2"><Button variant={mine?'soft':'primary'} onClick={()=>setMine(false)}>전체 요청</Button><Button variant={mine?'primary':'soft'} onClick={()=>setMine(true)}>내 요청</Button></div>
    <ApiState {...state} />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {requests?.items.map(r=><Card key={r.id} title={`${r.start_date} · ${STATUS[r.status]}`}>
      <p className="text-sm text-ink-strong">{r.title} · {r.requester_name}</p>
      <p className="text-xs text-muted">{r.start_time || '종일'}{r.end_time ? `–${r.end_time}` : ''} · {r.reason || '사유 없음'}</p>
      {r.status==='pending' && (r.requester_id===me.id
        ? <Button variant="soft" disabled={busy!==null} onClick={()=>act(r.id,'cancel')}>요청 취소</Button>
        : <Button disabled={busy!==null || r.start_date<actualToday()} onClick={()=>act(r.id,'accept')}>대타 수락</Button>)}
    </Card>)}
    {requests?.items.length===0 && <Card><p className="text-sm text-muted">등록된 대타 요청이 없어요.</p></Card>}
    <Button variant="soft" onClick={()=>navigate(generatePath(PATHS.swapNew,{workspaceId}))}>+ 대타 요청 작성</Button>
  </div>;
}
