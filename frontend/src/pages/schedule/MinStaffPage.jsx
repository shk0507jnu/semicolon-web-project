import { calendarApiEnabled } from '../../api/calendar';
import { ApiMinStaff } from './ApiSchedulePages';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Callout from '../../components/common/Callout';
import Card from '../../components/common/Card';
import ListRow from '../../components/common/ListRow';
import NumberStepper from '../../components/common/NumberStepper';
import PageHeading from '../../components/common/PageHeading';
import TimeRangeField from '../../components/common/TimeRangeField';
import WeekdayPicker from '../../components/common/WeekdayPicker';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { MOCK_STAFFING_RULES } from '../../mocks/data';
import { formatDaysSummary, formatDaysTitle } from '../../utils/staffing';

// 08 최소 근무 인원 설정 (피그마: 08 최소 근무 인원 설정, 1:52) — 관리자 화면
function MockMinStaffPage() {
  const navigate = useNavigate();
  const { eyebrow } = useRouteWorkspace();

  // TODO: 백엔드 연결 후 규칙 목록을 API로 받아오기
  const [rules, setRules] = useState(MOCK_STAFFING_RULES);
  const [days, setDays] = useState(['수']);
  const [range, setRange] = useState({ start: '14:00', end: '18:00' });
  const [min, setMin] = useState(3);

  const handleAddRule = () => {
    if (days.length === 0) return;
    setRules((prev) => [...prev, { id: `r-${Date.now()}`, days, start: range.start, end: range.end, min }]);
  };

  // 등록된 규칙을 누르면 위 입력칸에 불러와서 확인·수정할 수 있어
  const loadRule = (rule) => {
    setDays(rule.days);
    setRange({ start: rule.start, end: rule.end });
    setMin(rule.min);
  };

  const handleSave = () => {
    // TODO: 백엔드 최소 인원 규칙 저장 API 연결
    console.log('규칙 저장', rules);
    navigate(-1);
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeading eyebrow={eyebrow} title="최소 근무 인원" description="시간대별 필요한 근무자 수를 정해주세요." />

      <Card title="요일별 최소 인원">
        <WeekdayPicker value={days} onChange={setDays} />
        <TimeRangeField label="적용 시간" value={range} onChange={setRange} />
        <NumberStepper label="최소 근무 인원" value={min} onChange={setMin} min={1} max={20} unit="명" />
        <Callout tone="info">
          {days.length > 0
            ? `매주 ${days.join('·')}요일에 반복 적용됩니다.`
            : '적용할 요일을 선택해주세요.'}
        </Callout>
        <Button variant="soft" onClick={handleAddRule} disabled={days.length === 0}>
          + 시간대 추가
        </Button>
      </Card>

      <Card title="등록된 규칙">
        {rules.map((rule) => (
          <ListRow
            key={rule.id}
            title={`${formatDaysTitle(rule.days)} ${rule.start}–${rule.end}`}
            summary={`${formatDaysSummary(rule.days)} · 최소 ${rule.min}명`}
            onClick={() => loadRule(rule)}
          />
        ))}
      </Card>

      <Button variant="primary" onClick={handleSave}>
        규칙 저장
      </Button>
      <p className="text-xs leading-[18px] text-muted">
        설정한 인원보다 적게 배치된 시간대는 달력과 근무 상세에서 부족 상태로 표시됩니다.
      </p>
    </div>
  );
}

export default function MinStaffPage() {
  return calendarApiEnabled ? <ApiMinStaff /> : <MockMinStaffPage />;
}
