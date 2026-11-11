// Figma 16/18 example amounts, aligned to the existing demo calendar's September date.
const records = (month, days, completedCount) => days.map((day, index) => ({
  id: `${month}-${day}`, date: `${month}-${String(day).padStart(2, '0')}`,
  start: '14:00', end: '22:00', status: index < completedCount ? 'completed' : 'scheduled',
}));

export const MOCK_PAYROLL_MONTHS = [
  { workspaceId: 'cafe', month: '2026-09', hourlyWage: 12000, status: 'calculating',
    records: records('2026-09', [2, 4, 6, 10, 12, 14, 16, 18, 20, 22, 24, 26], 3) },
  { workspaceId: 'cafe', month: '2026-08', hourlyWage: 12000, status: 'paid', paidAt: '2026-09-05', paidAmount: 1152000,
    records: records('2026-08', [2, 4, 6, 10, 12, 14, 16, 18, 20, 22, 24, 26], 12) },
  { workspaceId: 'cafe', month: '2026-07', hourlyWage: 12000, status: 'paid', paidAt: '2026-08-05', paidAmount: 960000,
    records: records('2026-07', [2, 4, 6, 10, 12, 14, 16, 18, 20, 22], 10) },
];
