import { useState } from 'react';
import { generatePath, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { calendarRequest } from '../../api/calendar';
import ApiState from '../../components/calendar/ApiState';
import DayTimeline from '../../components/calendar/DayTimeline';
import MonthCalendar from '../../components/calendar/MonthCalendar';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeading from '../../components/common/PageHeading';
import { useCalendarApi } from '../../hooks/useCalendarApi';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { PATHS } from '../../routes/paths';
import { actualToday, eventRange, eventTimeLabel, staffingStatuses } from '../../utils/calendarModel.mjs';

function EventRows({ events, date }) {
  return events.length ? events.map(event => <div key={event.id} className="border-b border-line pb-2 last:border-0">
    <p className="text-sm font-medium text-ink-strong">{event.title} · {event.user?.name || '담당자 미지정'}</p>
    <p className="mt-1 text-xs text-muted">{eventTimeLabel(event)}</p>
    {eventRange(event, date) && event.start_date !== event.end_date && <p className="text-xs text-muted">선택한 날짜의 시간만 막대에 표시됩니다.</p>}
  </div>) : <p className="text-sm text-muted">등록된 일정이 없어요.</p>;
}

export function ApiCalendarDashboard() {
  const { workspaceId, eyebrow } = useRouteWorkspace();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const requested = search.get('date');
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(requested || '') ? requested : actualToday();
  const [year, month] = selectedDate.split('-').map(Number);
  const [mine, setMine] = useState(false);
  const state = useCalendarApi(workspaceId, [
    `/calendar?year=${year}&month=${month}&mine=${mine}`,
    `/calendar/days/${selectedDate}?mine=${mine}`, '/me',
  ]);
  const [calendar, day, me] = state.data || [];
  const chooseDate = date => setSearch({ date });
  const move = target => target && chooseDate(`${target.year}-${String(target.month).padStart(2, '0')}-01`);
  return <div className="flex flex-col gap-5 p-4">
    <PageHeading eyebrow={eyebrow} title="근무 달력" description={me ? `${me.name}님, 근무 일정을 확인하세요.` : '근무 일정을 확인하세요.'} />
    <div className="flex gap-2">
      <Button variant={mine ? 'soft' : 'primary'} aria-pressed={!mine} onClick={() => setMine(false)}>전체 일정</Button>
      <Button variant={mine ? 'primary' : 'soft'} aria-pressed={mine} onClick={() => setMine(true)}>내 일정</Button>
    </div>
    <ApiState {...state} />
    {calendar && <>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <button type="button" aria-label="이전 달" disabled={!calendar.prev} onClick={() => move(calendar.prev)} className="size-9 rounded-lg bg-canvas disabled:opacity-30">‹</button>
          <h2 className="text-base font-bold text-ink-strong">{calendar.title}</h2>
          <button type="button" aria-label="다음 달" disabled={!calendar.next} onClick={() => move(calendar.next)} className="size-9 rounded-lg bg-canvas disabled:opacity-30">›</button>
        </div>
        <label className="flex items-center justify-between text-xs text-muted">월 선택
          <input type="month" aria-label="월 선택" value={`${year}-${String(month).padStart(2,'0')}`} min="2026-01" max="2030-12" onChange={e => e.target.value && chooseDate(`${e.target.value}-01`)} className="rounded-lg border border-line px-2 py-1" />
        </label>
        <MonthCalendar apiMonth={calendar} year={year} monthIndex={month-1} selectedDate={selectedDate}
          shiftDates={new Set(calendar.days.filter(d => d.has_event).map(d => d.date))} onSelectDate={chooseDate} />
      </Card>
      <Card title={day.label}>
        {day.is_holiday && <p className="text-xs text-muted">{day.holiday_name} · 원본 달력 기준</p>}
        <DayTimeline ranges={day.events.map(e => eventRange(e, selectedDate)).filter(Boolean)} />
        <EventRows events={day.events} date={selectedDate} />
        <Button variant="soft" onClick={() => navigate(generatePath(PATHS.dayDetail, { workspaceId, date: selectedDate }))}>근무 상세 보기</Button>
        {me.can_edit && <Button onClick={() => navigate(`${generatePath(PATHS.scheduleManage, { workspaceId })}?date=${selectedDate}`)}>근무 배치 추가</Button>}
      </Card>
      <Card title="급여 · 공지"><p className="text-sm text-muted">급여와 공지 데이터는 아직 연결되지 않았어요.</p></Card>
    </>}
  </div>;
}

export function ApiDayDetail() {
  const { date } = useParams();
  const { workspaceId, eyebrow } = useRouteWorkspace();
  const navigate = useNavigate();
  const state = useCalendarApi(workspaceId, [`/calendar/days/${date}`, '/me', '/staffing-rules']);
  const [day, me, rules] = state.data || [];
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const statuses = day ? staffingStatuses(day.events, rules.items, date) : [];
  async function requestPermission() {
    setBusy(true); setMessage('');
    try { await calendarRequest('/edit-permission-requests', { workspaceId, method:'POST', body:{reason:'근무 배치 편집 요청'} }); setMessage('편집 권한을 요청했어요.'); }
    catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }
  return <div className="flex flex-col gap-5 p-4">
    <PageHeading eyebrow={eyebrow} title={day?.label || '근무 상세'} description="시간대별 일정과 배치 상태를 확인하세요." />
    <ApiState {...state} />
    {day && <>
      <Card title="하루 일정"><DayTimeline ranges={day.events.map(e => eventRange(e, date)).filter(Boolean)} /><EventRows events={day.events} date={date} /></Card>
      {day.events.map(event => <Card key={event.id} title={`${event.title} · ${event.user?.name || '미지정'}`}>
        <p className="text-sm text-muted">{eventTimeLabel(event)}</p>
        {event.description && <p className="text-sm text-muted">{event.description}</p>}
        {me.can_edit && <Button variant="soft" onClick={() => navigate(`${generatePath(PATHS.scheduleManage, {workspaceId})}?date=${date}&event=${event.id}`)}>일정 수정</Button>}
        {event.can_request_substitute && <Button variant="soft" onClick={() => navigate(`${generatePath(PATHS.swapNew, {workspaceId})}?date=${date}&event=${event.id}`)}>대타 요청</Button>}
        {event.substitute_request?.status === 'pending' && <p className="text-xs text-muted">대타 요청 대기 중</p>}
      </Card>)}
      <Card title="시간대별 최소 인원">
        {statuses.length ? statuses.map((s,i) => <p key={i} className={`text-sm ${s.shortage ? 'text-red-700' : 'text-muted'}`}>{s.start}–{s.end} · {s.assigned}/{s.min}명 · {s.shortage ? `${s.shortage}명 부족` : '충족'}</p>) : <p className="text-sm text-muted">이 요일에 등록된 최소 인원 규칙이 없어요.</p>}
      </Card>
      {me.can_edit ? <>
        <Button onClick={() => navigate(`${generatePath(PATHS.scheduleManage,{workspaceId})}?date=${date}`)}>근무 배치 추가</Button>
        <Button variant="soft" onClick={() => navigate(generatePath(PATHS.minStaff,{workspaceId}))}>최소 인원 설정</Button>
      </> : <Button variant="soft" disabled={busy} onClick={requestPermission}>편집 권한 요청</Button>}
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
      <Button variant="soft" onClick={() => navigate(`${generatePath(PATHS.calendar,{workspaceId})}?date=${date}`)}>달력으로 돌아가기</Button>
    </>}
  </div>;
}
