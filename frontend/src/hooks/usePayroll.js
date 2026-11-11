import { calendarApiEnabled } from '../api/calendar';
import { MOCK_PAYROLL_MONTHS } from '../mocks/payroll';
import { actualToday } from '../utils/calendarModel.mjs';
import { getToday } from '../utils/date';
import { selectPayrollSource } from '../utils/payrollModel.mjs';

export function usePayroll(workspaceId) {
  // The calendar service has no wage/payment endpoint yet. Do not mix mock payments
  // or a guessed hourly wage into a real DB user's payroll.
  return selectPayrollSource({
    mode: calendarApiEnabled ? 'api' : 'mock', workspaceId,
    currentMonth: (calendarApiEnabled ? actualToday() : getToday()).slice(0, 7),
    demoMonths: MOCK_PAYROLL_MONTHS,
  });
}
