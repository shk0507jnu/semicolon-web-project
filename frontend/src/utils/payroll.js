// 급여 계산 도우미 (05 이번 달 예상 급여, 16 급여 확인)
import { MOCK_PAYROLL } from '../mocks/data';
import { timeToHours } from './date';

export const shiftHours = ({ start, end }) => timeToHours(end) - timeToHours(start);

// TODO: 백엔드 연결 후 워크스페이스별 이번 달 급여 정보를 API로 받아오기
export function getPayrollSummary() {
  const { hourlyWage, recentRecords, earlier } = MOCK_PAYROLL;
  const records = recentRecords.map((r) => {
    const hours = shiftHours(r);
    return { ...r, hours, pay: hours * hourlyWage };
  });
  const totalHours = records.reduce((sum, r) => sum + r.hours, 0) + earlier.hours;

  return {
    hourlyWage,
    records, // 최근 근무 (목록에 하나씩 보여줄 것)
    earlier: { ...earlier, pay: earlier.hours * hourlyWage }, // 그 이전 근무 (한 줄로 묶어서)
    totalHours,
    totalPay: totalHours * hourlyWage,
  };
}
