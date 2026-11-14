import test from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_PAYROLL_MONTHS } from '../mocks/payroll.js';
import { isPayrollMonth, paidHours, payrollPeriodLabel, payrollYearSummary, selectPayrollSource, summarizePayroll } from './payrollModel.mjs';

test('current month separates completed and scheduled earnings', () => {
  const result = summarizePayroll(MOCK_PAYROLL_MONTHS[0]);
  assert.deepEqual([result.completedHours, result.plannedHours, result.completedPay, result.plannedPay, result.totalPay], [24, 72, 288000, 864000, 1152000]);
  assert.equal(result.completed[0].date, '2026-09-06');
});

test('paid history totals only confirmed payments, not current estimates', () => {
  const months = MOCK_PAYROLL_MONTHS.map(summarizePayroll);
  const result = payrollYearSummary(months, 2026);
  assert.equal(result.paidTotal, 2112000);
  assert.equal(result.paidCount, 2);
  assert.deepEqual(result.items.map(m => m.month), ['2026-09', '2026-08', '2026-07']);
  assert.equal(payrollYearSummary([{ ...months[1], paidAmount: 1000000 }], 2026).paidTotal, 1000000);
});

test('year filtering does not show other years or carry their totals', () => {
  assert.deepEqual(payrollYearSummary(MOCK_PAYROLL_MONTHS.map(summarizePayroll), 2025), { items: [], paidTotal: 0, paidCount: 0 });
});

test('API mode never displays mock pay or another workspace payments', () => {
  const input = { workspaceId: 'cafe', currentMonth: '2026-11', demoMonths: MOCK_PAYROLL_MONTHS };
  assert.deepEqual(selectPayrollSource({ ...input, mode: 'api' }), { available: false, months: [], currentMonth: '2026-11' });
  assert.deepEqual(selectPayrollSource({ ...input, mode: 'mock', workspaceId: 'store' }).months, []);
  assert.equal(selectPayrollSource({ ...input, mode: 'mock' }).months.length, 3);
});

test('hour calculation handles overnight shifts, minute precision and midnight', () => {
  assert.equal(paidHours({ start: '22:30', end: '06:00' }), 7.5);
  assert.equal(paidHours({ start: '14:00', end: '22:00' }), 8);
  assert.equal(paidHours({ start: '20:00', end: '24:00' }), 4);
});

test('month URL rejects malformed values', () => {
  for (const value of ['2026-13', '2026-00', '2026-1', '', null, '../2026-09']) assert.equal(isPayrollMonth(value), false);
  assert.equal(isPayrollMonth('2026-11'), true);
});

test('history summary period follows Figma 18 wording', () => {
  assert.equal(payrollPeriodLabel([{ month: '2026-11' }, { month: '2026-09' }, { month: '2026-10' }]), '2026년 9–11월');
  assert.equal(payrollPeriodLabel([{ month: '2026-09' }]), '2026년 9월');
  assert.equal(payrollPeriodLabel([{ month: '2025-12' }, { month: '2026-01' }]), '2025년 12월–2026년 1월');
  assert.equal(payrollPeriodLabel([]), '');
});
