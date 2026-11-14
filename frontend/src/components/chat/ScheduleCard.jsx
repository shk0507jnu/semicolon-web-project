import { useState } from 'react';
import { calendarApiEnabled } from '../../api/calendar';
import { useChat } from '../../contexts/ChatContext';
import { formatScheduleDay } from '../../utils/chatSchedule.mjs';
import DateField from '../common/DateField';
import SelectField from '../common/SelectField';
import TimeRangeField from '../common/TimeRangeField';
import { CalendarIcon, CheckIcon } from '../common/Icons';

// 공지에서 찾은 일정 카드 (피그마 04 '일정 1건을 찾았어요' 2:956, 05 '달력에 추가했어요' 2:1001)
// status
//  - review   : 찾은 일정 확인 → [수정] [일정에 추가]
//  - editing  : 날짜·시간·근무자 직접 고치기 → [취소] [저장]
//  - unparsed : 날짜/시간을 못 찾음 → 보완 안내 + [직접 입력]
//  - added    : 달력에 저장됨 → [달력에서 보기]
// '일정에 추가'를 누르기 전에는 달력에 저장하지 않아. (피그마 개발 전달 메모)
const shiftLabel = start => {
  const hour = Number(start.slice(0, 2));
  if (hour < 12) return '오전 근무';
  if (hour < 17) return '오후 근무';
  return '야간 근무';
};

const BUTTON = 'flex h-11 items-center justify-center rounded-xl px-4 text-sm leading-[21px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darkblue';
const SECONDARY = `${BUTTON} border border-line bg-white text-darkblue hover:bg-primary-soft`;
const PRIMARY = `${BUTTON} bg-primary text-ink-strong hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100`;

export default function ScheduleCard({ schedule, workspaceId, workspaceName, memberNames, onChange, onOpenCalendar }) {
  const { addShift } = useChat();
  const [form, setForm] = useState(null);
  const { status } = schedule;
  const added = status === 'added';

  const startEdit = () => {
    setForm({ date: schedule.date, start: schedule.start, end: schedule.end, memberName: schedule.memberName });
    onChange({ status: 'editing', previous: status });
  };

  const add = () => {
    const created = addShift(workspaceId, {
      date: schedule.date, start: schedule.start, end: schedule.end,
      memberName: schedule.memberName, label: shiftLabel(schedule.start), fromChat: true,
    });
    onChange({ status: 'added', duplicate: !created });
  };

  if (status === 'editing' && form) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-primary-soft p-3">
        <p className="flex items-center gap-1.5 text-sm leading-[21px] font-medium text-darkblue">
          <CalendarIcon size={18} />
          일정 수정
        </p>
        <DateField label="날짜" value={form.date} onChange={date => setForm(f => ({ ...f, date: date || f.date }))} />
        <TimeRangeField label="근무 시간" value={form} onChange={({ start, end }) => setForm(f => ({ ...f, start, end }))} />
        <SelectField
          label="근무자"
          labelSize="sm"
          value={form.memberName}
          onChange={e => setForm(f => ({ ...f, memberName: e.target.value }))}
          options={[...new Set([form.memberName, ...memberNames])].map(name => ({ value: name, label: name }))}
        />
        <div className="flex gap-2">
          <button type="button" className={`${SECONDARY} w-[84px] shrink-0`} onClick={() => onChange({ status: schedule.previous === 'unparsed' ? 'unparsed' : 'review' })}>
            취소
          </button>
          <button type="button" className={`${PRIMARY} flex-1`} onClick={() => onChange({ ...form, status: 'review', reason: undefined })}>
            저장
          </button>
        </div>
      </div>
    );
  }

  if (status === 'unparsed') {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-primary-soft p-3" role="status">
        <p className="flex items-center gap-1.5 text-sm leading-[21px] font-medium text-darkblue">
          <CalendarIcon size={18} />
          {schedule.reason === 'time' ? '근무 시간을 찾지 못했어요' : '일정을 찾지 못했어요'}
        </p>
        <p className="text-xs leading-[18px] text-muted">
          날짜와 시간을 함께 적어 주세요.<br />예) 11월 9일(월) 김민수 14:00–22:00
        </p>
        <button type="button" className={`${SECONDARY} w-full`} onClick={startEdit}>
          직접 입력해서 추가하기
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 rounded-2xl border border-line p-3 ${added ? 'bg-success-bg' : 'bg-primary-soft'}`} role="status">
      <p className={`flex items-center gap-1.5 text-sm leading-[21px] font-medium ${added ? 'text-success' : 'text-darkblue'}`}>
        {added ? <CheckIcon size={18} /> : <CalendarIcon size={18} />}
        {added ? (schedule.duplicate ? '이미 달력에 있는 일정이에요' : '달력에 추가했어요') : '일정 1건을 찾았어요'}
      </p>
      <p className="text-sm leading-[21px] font-medium text-ink-strong">
        {formatScheduleDay(schedule.date)} · {schedule.start}–{schedule.end}
      </p>
      <p className="text-xs leading-[18px] text-muted">
        {schedule.memberName} · {workspaceName}
      </p>
      {added ? (
        <button type="button" className={`${SECONDARY} w-full`} onClick={() => onOpenCalendar(schedule.date)}>
          달력에서 보기
        </button>
      ) : (
        <>
          <div className="flex gap-2">
            <button type="button" className={`${SECONDARY} w-[84px] shrink-0`} onClick={startEdit}>
              수정
            </button>
            <button type="button" className={`${PRIMARY} flex-1`} onClick={add} disabled={calendarApiEnabled}>
              일정에 추가
            </button>
          </div>
          {calendarApiEnabled && (
            <p className="text-xs leading-[18px] text-muted">달력 DB 저장은 채팅 API 연결 후 가능해요.</p>
          )}
        </>
      )}
    </div>
  );
}
