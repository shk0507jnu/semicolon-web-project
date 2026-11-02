// 근무 배치·최소 인원 계산 도우미 (06 날짜별 근무 상세, 07 근무 배치 관리, 08 최소 근무 인원)
import { MOCK_DAY_ASSIGNMENTS, MOCK_DAY_SLOTS, MOCK_MEMBERS, MOCK_MY_SHIFTS, MOCK_USER } from '../mocks/data';
import { timeToHours } from './date';

// TODO: 백엔드 연결 후 날짜별 배치/시간대 정보를 API로 받아오기
export function getDayAssignments(date) {
  if (MOCK_DAY_ASSIGNMENTS[date]) return MOCK_DAY_ASSIGNMENTS[date];
  const myShift = MOCK_MY_SHIFTS[date];
  const me = MOCK_MEMBERS.find((m) => m.name === MOCK_USER.name);
  return myShift && me ? [{ memberId: me.id, ...myShift }] : [];
}

export function getDaySlots(date) {
  return MOCK_DAY_SLOTS[date] ?? [];
}

// 해당 시간대를 처음부터 끝까지 맡는 근무자 수
export function countCovering(assignments, slot) {
  const s = timeToHours(slot.start);
  const e = timeToHours(slot.end);
  return assignments.filter((a) => timeToHours(a.start) <= s && timeToHours(a.end) >= e).length;
}

// 시간대별 배치 상태 [{ ...slot, assigned, shortage }]
export function getSlotStatuses(assignments, slots) {
  return slots.map((slot) => {
    const assigned = countCovering(assignments, slot);
    return { ...slot, assigned, shortage: Math.max(0, slot.min - assigned) };
  });
}

// ───── 요일 표시 (08 규칙 목록) ─────
const MON_FRI = ['월', '화', '수', '목', '금'];
const isSame = (a, b) => a.length === b.length && a.every((d, i) => d === b[i]);

// ['월'..'금'] → '평일', ['수'] → '수요일', ['토','일'] → '주말', 그 외 → '월·수·금'
export function formatDaysTitle(days) {
  if (isSame(days, MON_FRI)) return '평일';
  if (isSame(days, ['토', '일'])) return '주말';
  if (days.length === 1) return `${days[0]}요일`;
  return days.join('·');
}

// ['월'..'금'] → '월–금', ['수'] → '매주 수요일', 그 외 → '월·수·금'
export function formatDaysSummary(days) {
  if (isSame(days, MON_FRI)) return '월–금';
  if (days.length === 1) return `매주 ${days[0]}요일`;
  return days.join('·');
}
