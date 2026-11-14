import { generatePath, useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';
import { WalletIcon } from '../common/Icons';
import { PATHS } from '../../routes/paths';

// 급여 내역이 없을 때 (피그마 18 '기록 없음' 1:143 — 지갑 아이콘 + 안내 + '근무 일정 확인하기')
// 16 이번 달 급여에서도 같이 써. history=true 면 18 문구.
export default function PayrollEmpty({ workspaceId, available, history = false }) {
  const navigate = useNavigate();
  const title = available ? (history ? '아직 급여 내역이 없어요' : '이 달의 급여 내역이 없어요') : '급여 집계를 준비하고 있어요';
  return <Card className="!items-center !gap-4 !px-6 !py-12 !text-center">
    <WalletIcon size={32} className="text-darkblue" />
    <h2 className="text-base leading-6 font-bold text-ink-strong">{title}</h2>
    <p className="text-sm leading-[21px] text-muted">
      {available
        ? <>근무 기록이 쌓이면<br />{history ? '월별 급여를 이곳에서 확인할 수 있어요.' : '급여 내역을 이곳에서 확인할 수 있어요.'}</>
        : <>급여 정보가 연결되면<br />근무별 금액과 월별 내역을 확인할 수 있어요.</>}
    </p>
    <Button variant="secondary" onClick={() => navigate(generatePath(PATHS.calendar, { workspaceId }))}>근무 일정 확인하기</Button>
  </Card>;
}
