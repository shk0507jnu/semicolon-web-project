import { calendarApiEnabled } from '../../api/calendar';
import { ApiSwapCreate } from './ApiSwapPages';
import { useState } from 'react';
import { generatePath, useNavigate, useSearchParams } from 'react-router-dom';
import DayTimeline from '../../components/calendar/DayTimeline';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeading from '../../components/common/PageHeading';
import SelectField from '../../components/common/SelectField';
import TextAreaField from '../../components/common/TextAreaField';
import { useSwaps } from '../../contexts/SwapContext';
import { useRouteWorkspace } from '../../hooks/useRouteWorkspace';
import { MOCK_MY_SHIFTS } from '../../mocks/data';
import { PATHS } from '../../routes/paths';
import { formatMonthDayWeekday, getToday, parseISODate, timeToHours } from '../../utils/date';

// 12 대타 요청 작성 (피그마: 12 대타 요청 작성, 1:52)
// 06 '내 근무 대타 요청'으로 들어오면 주소에 ?date=2026-09-09 가 붙어서, 그 날 근무가 미리 선택돼.
function MockSwapCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { workspaceId, eyebrow } = useRouteWorkspace();
  const { addRequest } = useSwaps();

  // 오늘 이후의 내 근무만 고를 수 있어
  // TODO: 백엔드 연결 후 워크스페이스별 내 근무 목록 받아오기
  const myShifts = Object.entries(MOCK_MY_SHIFTS)
    .filter(([date]) => date >= getToday())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, shift]) => ({ date, ...shift }));

  const requestedDate = searchParams.get('date');
  const [date, setDate] = useState(
    myShifts.some((s) => s.date === requestedDate) ? requestedDate : (myShifts[0]?.date ?? ''),
  );
  const [reason, setReason] = useState('');
  const shift = myShifts.find((s) => s.date === date);

  const options = myShifts.map((s) => ({
    value: s.date,
    label: `${formatMonthDayWeekday(s.date)} ${s.start}–${s.end}`,
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!shift) return;
    // TODO: 백엔드 대타 요청 등록 API 연결
    addRequest({ ...shift, reason: reason.trim() || '사유 없음' });
    navigate(generatePath(PATHS.swaps, { workspaceId }));
  };

  const d = date ? parseISODate(date) : null;
  const hours = shift ? timeToHours(shift.end) - timeToHours(shift.start) : 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-4">
      <PageHeading eyebrow={eyebrow} title="대타 요청하기" description="대신 근무해줄 동료를 찾아보세요." />

      <Card title="요청할 근무">
        {options.length > 0 ? (
          <SelectField
            label="내 근무 선택"
            labelSize="sm"
            options={options}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        ) : (
          <p className="text-sm leading-[21px] text-muted">대타를 요청할 수 있는 내 근무가 없어요.</p>
        )}
        <TextAreaField
          label="요청 사유"
          labelSize="sm"
          placeholder="개인 일정으로 대타를 구합니다."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={100}
        />
        <p className="text-xs leading-[18px] text-muted">등록된 요청은 워크스페이스 멤버에게 공개됩니다.</p>
      </Card>

      <Card title="요청 시간 확인">
        <DayTimeline shift={shift} />
        <p className="text-sm leading-[21px] font-medium text-ink-strong">
          {shift ? `${d.getMonth() + 1}월 ${d.getDate()}일 · ${shift.label} ${hours}시간` : '선택한 근무가 없어요.'}
        </p>
      </Card>

      <Button type="submit" variant="primary" disabled={!shift}>
        대타 요청 등록
      </Button>
      <Button variant="soft" onClick={() => navigate(-1)}>
        취소
      </Button>
    </form>
  );
}

export default function SwapCreatePage() {
  return calendarApiEnabled ? <ApiSwapCreate /> : <MockSwapCreatePage />;
}
