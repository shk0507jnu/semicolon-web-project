export const isPayrollMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '');

export function payrollMonthLabel(month) {
  if (!isPayrollMonth(month)) return '';
  const [year, number] = month.split('-').map(Number);
  return `${year}년 ${number}월`;
}

export function paidHours({ start, end }) {
  const minutes = value => value.split(':').map(Number).reduce((h, m) => h * 60 + m);
  const difference = minutes(end) - minutes(start);
  return (difference < 0 ? difference + 1440 : difference) / 60;
}

export function summarizePayroll(month) {
  if (!month) return null;
  const records = month.records.map(record => {
    const hours = paidHours(record);
    return { ...record, hours, pay: Math.round(hours * month.hourlyWage) };
  }).sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));
  const completed = records.filter(r => r.status === 'completed');
  const planned = records.filter(r => r.status === 'scheduled');
  const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);
  return {
    ...month, records, completed, planned,
    completedHours: sum(completed, 'hours'), plannedHours: sum(planned, 'hours'),
    completedPay: sum(completed, 'pay'), plannedPay: sum(planned, 'pay'),
    totalHours: sum(records, 'hours'), totalPay: sum(records, 'pay'),
  };
}

export function payrollYearSummary(months, year) {
  const items = months.filter(m => m.month.startsWith(`${year}-`)).sort((a, b) => b.month.localeCompare(a.month));
  const paid = items.filter(m => m.status === 'paid');
  return { items, paidCount: paid.length, paidTotal: paid.reduce((sum, m) => sum + m.paidAmount, 0) };
}

// Paid amounts come from payment records, never inferred just because a month has ended.
export function selectPayrollSource({ mode, workspaceId, currentMonth, demoMonths }) {
  return {
    currentMonth,
    available: mode !== 'api',
    months: mode === 'api' ? [] : demoMonths.filter(m => m.workspaceId === workspaceId).map(summarizePayroll),
  };
}
