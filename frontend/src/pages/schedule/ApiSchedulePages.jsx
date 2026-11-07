import { useState } from 'react';
import { generatePath, useNavigate, useSearchParams } from 'react-router-dom';
import { calendarRequest } from '../../api/calendar';
import ApiState from '../../components/calendar/ApiState';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import DateField from '../../components/common/DateField';
import ListRow from '../../components/common/ListRow';
import PageHeading from '../../components/common/PageHeading';
import TextField from '../../components/common/TextField';
import TimeRangeField from '../../components/common/TimeRangeField';
import NumberStepper from '../../components/common/NumberStepper';
import WeekdayPicker from '../../components/common/WeekdayPicker';
import { useCalendarApi } from '../../hooks/useCalendarApi';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { PATHS } from '../../routes/paths';
import { actualToday, eventTimeLabel } from '../../utils/calendarModel.mjs';

export function ApiScheduleManage() {
  const { workspaceId, eyebrow } = useRouteWorkspace();
  const [search] = useSearchParams();
  const initialDate = search.get('date') || actualToday();
  const eventId = search.get('event');
  const state = useCalendarApi(workspaceId, ['/me', '/members', ...(eventId ? [`/events/${eventId}`] : [])]);
  return <div className="flex flex-col gap-5 p-4">
    <PageHeading eyebrow={eyebrow} title={eventId ? '일정 수정' : '근무 배치 추가'} description="저장한 일정은 달력에 반영됩니다." />
    <ApiState {...state} />
    {state.data && (state.data[0].can_edit
      ? <ScheduleForm key={`${workspaceId}:${eventId || initialDate}`} workspaceId={workspaceId} initialDate={initialDate} members={state.data[1].items} event={state.data[2]} />
      : <p role="alert" className="text-sm text-muted">관리자만 근무를 배치할 수 있어요.</p>)}
  </div>;
}

function ScheduleForm({ workspaceId, initialDate, members, event }) {
  const navigate = useNavigate();
  const [date, setDate] = useState(event?.start_date || initialDate);
  const [endDate, setEndDate] = useState(event?.end_date || initialDate);
  const [title, setTitle] = useState(event?.title || '근무');
  const [allDay, setAllDay] = useState(event?.all_day || false);
  const [range, setRange] = useState({start:event?.start_time || '09:00',end:event?.end_time || '18:00'});
  const [selected, setSelected] = useState(event?.user ? [event.user.id] : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dayState = useCalendarApi(workspaceId, [`/calendar/days/${date}`]);
  async function save(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (event) await calendarRequest(`/events/${event.id}`, {workspaceId, method:'PATCH', body:{
        title:title.trim(), start_date:date, end_date:endDate, all_day:allDay,
        start_time:allDay ? null : range.start, end_time:allDay ? null : range.end, user_id:selected[0],
      }});
      else await calendarRequest('/assignments', {workspaceId, method:'POST', body:{date, ...range, title:title.trim(), user_ids:selected}});
      navigate(generatePath(PATHS.dayDetail, {workspaceId, date}));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="flex flex-col gap-5">
    <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
      <Card title="배치할 근무">
        <TextField label="일정 제목" labelSize="sm" value={title} onChange={e=>setTitle(e.target.value)} maxLength={100} required />
        <DateField label={event ? '시작일' : '날짜'} value={date} onChange={next => {setDate(next); if(endDate<next) setEndDate(next);}} />
        {event && <><DateField label="종료일" value={endDate} onChange={setEndDate} /><label className="text-sm"><input type="checkbox" checked={allDay} onChange={e=>setAllDay(e.target.checked)} /> 종일 일정</label></>}
        {!allDay && <TimeRangeField label="근무 시간" value={range} onChange={setRange} allowOvernight={!!event && endDate > date} />}
      </Card>
      <Card title={event ? '담당자 선택' : '근무자 선택'}>
        {members.map(member => <ListRow key={member.id} title={`${selected.includes(member.id) ? '✓' : '□'} ${member.name}`}
          summary={member.role==='editor' ? '관리자' : '근무자'} selected={selected.includes(member.id)} aria-pressed={selected.includes(member.id)}
          onClick={()=>setSelected(prev => event ? [member.id] : prev.includes(member.id) ? prev.filter(id=>id!==member.id) : [...prev,member.id])} />)}
      </Card>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={busy || !title.trim() || !selected.length}>{busy ? '저장 중…' : event ? '변경 저장' : '배치 저장'}</Button>
    </fieldset>
    <Card title="선택한 날짜의 기존 일정">
      <ApiState {...dayState} />
      {dayState.data?.[0].events.map(e => <p className="text-sm text-muted" key={e.id}>{e.user?.name || '미지정'} · {e.title} · {eventTimeLabel(e)}</p>)}
      {dayState.data?.[0].events.length===0 && <p className="text-sm text-muted">등록된 일정이 없어요.</p>}
    </Card>
  </form>;
}

export function ApiMinStaff() {
  const { workspaceId, eyebrow } = useRouteWorkspace();
  const state = useCalendarApi(workspaceId, ['/me', '/staffing-rules']);
  return <div className="flex flex-col gap-5 p-4">
    <PageHeading eyebrow={eyebrow} title="최소 근무 인원" description="요일과 시간대별 필요한 인원을 정해주세요." />
    <ApiState {...state} />
    {state.data && (state.data[0].can_edit
      ? <RulesForm key={workspaceId} workspaceId={workspaceId} initialRules={state.data[1].items} />
      : <p role="alert" className="text-sm text-muted">관리자만 최소 인원을 설정할 수 있어요.</p>)}
  </div>;
}

function RulesForm({ workspaceId, initialRules }) {
  const [rules, setRules] = useState(initialRules);
  const [days, setDays] = useState(['월','화','수','목','금']);
  const [range, setRange] = useState({start:'09:00',end:'18:00'});
  const [min, setMin] = useState(2);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  function add() {
    const rule = {...range, days, min};
    setRules(prev => editing===null ? [...prev,rule] : prev.map((r,i)=>i===editing ? rule : r));
    setEditing(null); setMessage('변경 내용을 저장해주세요.');
  }
  async function save() {
    setBusy(true); setMessage('');
    try {
      const result = await calendarRequest('/staffing-rules',{workspaceId, method:'PUT', body:{items:rules}});
      setRules(result.items); setMessage('최소 인원 규칙을 저장했어요.');
    } catch(e) { setMessage(e.message); } finally {setBusy(false);}
  }
  return <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
    <Card title={editing===null ? '규칙 추가' : '규칙 수정'}>
      <WeekdayPicker value={days} onChange={setDays} />
      <TimeRangeField label="적용 시간" value={range} onChange={setRange} />
      <NumberStepper label="최소 근무 인원" value={min} onChange={setMin} min={1} max={100} unit="명" />
      <Button variant="soft" disabled={!days.length} onClick={add}>{editing===null ? '+ 규칙 추가' : '수정 내용 반영'}</Button>
    </Card>
    <Card title="등록할 규칙">
      {!rules.length && <p className="text-sm text-muted">규칙을 추가해주세요.</p>}
      {rules.map((r,i)=><div key={i} className="flex items-center gap-2"><ListRow title={`${r.days.join('·')} ${r.start}–${r.end}`} summary={`최소 ${r.min}명`} onClick={()=>{setEditing(i);setDays(r.days);setRange({start:r.start,end:r.end});setMin(r.min);}} /><button type="button" aria-label={`${i+1}번 규칙 삭제`} onClick={()=>{setRules(prev=>prev.filter((_,n)=>n!==i));setEditing(null);setMessage('변경 내용을 저장해주세요.');}} className="shrink-0 text-xs text-muted">삭제</button></div>)}
    </Card>
    {message && <p role="status" className="text-sm text-muted">{message}</p>}
    <Button disabled={busy || editing!==null} onClick={save}>{busy ? '저장 중…' : '규칙 저장'}</Button>
  </fieldset>;
}
