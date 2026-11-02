import { useState } from 'react';
import { generatePath, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import Callout from '../../components/common/Callout';
import Card from '../../components/common/Card';
import DateField from '../../components/common/DateField';
import ListRow from '../../components/common/ListRow';
import PageHeading from '../../components/common/PageHeading';
import TimeRangeField from '../../components/common/TimeRangeField';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { MOCK_MEMBERS } from '../../mocks/data';
import { PATHS } from '../../routes/paths';
import { formatMonthDayWeekday, getToday } from '../../utils/date';
import { getDayAssignments, getDaySlots } from '../../utils/staffing';

// 그 날짜의 첫 번째 시간대를 기본 근무 시간으로 잡아줘 (시간대가 없으면 09:00–18:00)
function defaultRange(date) {
  const slots = getDaySlots(date);
  const first = slots[0];
  return first ? { start: first.start, end: first.end } : { start: '09:00', end: '18:00' };
}

// 07 근무 배치 관리 (피그마: 07 근무 배치 관리, 1:52) — 관리자 화면
// 06에서 '근무 배치 수정'으로 들어오면 주소에 ?date=2026-09-09 가 붙어 와.
export default function ScheduleManagePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { workspaceId, eyebrow } = useRouteWorkspace();

  const [date, setDate] = useState(searchParams.get('date') ?? getToday());
  const [range, setRange] = useState(() => defaultRange(date));

  const assignments = getDayAssignments(date);
  // 이미 배치된 사람은 처음부터 선택된 상태로 시작
  const [selectedIds, setSelectedIds] = useState(() => assignments.map((a) => a.memberId));

  const handleDateChange = (next) => {
    setDate(next);
    setRange(defaultRange(next));
    setSelectedIds(getDayAssignments(next).map((a) => a.memberId));
  };

  const toggleMember = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // 선택한 시간과 똑같은 시간대의 최소 인원
  const slot = getDaySlots(date).find((s) => s.start === range.start && s.end === range.end);
  const min = slot?.min ?? 0;

  const handleSave = () => {
    // TODO: 백엔드 근무 배치 저장 API 연결 ({ date, range, selectedIds })
    console.log('배치 저장', { date, range, selectedIds });
    navigate(-1);
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading eyebrow={eyebrow} title="근무 배치 관리" description={`${formatMonthDayWeekday(date)} · 관리자`} />

      <Card title="배치할 근무">
        <DateField label="날짜" value={date} onChange={handleDateChange} />
        <TimeRangeField label="근무 시간" value={range} onChange={setRange} />
      </Card>

      <Card title="근무자 선택">
        {min > 0 && (
          <Callout tone={selectedIds.length < min ? 'danger' : 'info'}>
            현재 {selectedIds.length}명 선택 · {selectedIds.length < min ? `최소 ${min}명 필요` : '최소 인원 충족'}
          </Callout>
        )}
        {MOCK_MEMBERS.map((m) => {
          const selected = selectedIds.includes(m.id);
          const assigned = assignments.find((a) => a.memberId === m.id);
          return (
            <ListRow
              key={m.id}
              title={`${selected ? '✓' : '□'} ${m.name}`}
              summary={assigned ? `${assigned.start}–${assigned.end} · 배치됨` : '해당 시간 배치 없음'}
              onClick={() => toggleMember(m.id)}
              aria-pressed={selected}
            />
          );
        })}
      </Card>

      <Button variant="primary" onClick={handleSave}>
        배치 저장
      </Button>
      <Button variant="soft" onClick={() => navigate(generatePath(PATHS.minStaff, { workspaceId }))}>
        최소 인원 설정 확인
      </Button>
    </div>
  );
}
