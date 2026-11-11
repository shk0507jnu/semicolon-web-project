import { generatePath, useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';
import { PATHS } from '../../routes/paths';

export default function PayrollEmpty({ workspaceId, available, history = false }) {
  const navigate = useNavigate();
  return <Card className="items-center gap-4 py-10 text-center">
    <h2 className="text-base font-bold text-ink-strong">{available ? (history ? '아직 급여 내역이 없어요' : '이 달의 급여 내역이 없어요') : '급여 집계를 준비하고 있어요'}</h2>
    <p className="text-sm leading-[21px] text-muted">{available ? '근무 기록이 쌓이면 급여 내역을 확인할 수 있어요.' : '급여 정보가 연결되면 근무별 금액과 월별 내역을 확인할 수 있어요.'}</p>
    <Button variant="secondary" onClick={() => navigate(generatePath(PATHS.calendar, { workspaceId }))}>근무 일정 확인하기</Button>
  </Card>;
}
