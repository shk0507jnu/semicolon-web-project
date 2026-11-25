export const CONDITION_LABELS = { SHIFT: '근무', LEAVE: '종일 휴가', FORBIDDEN_SHIFT: '근무 제외', PREFERRED_SHIFT: '근무 선호', MAX_SHIFT: '최대 근무 횟수', MIN_SHIFT: '최소 근무 횟수' };
export const SHIFT_LABELS = { ALL: '종일·전체 근무', DAY: '주간', EVENING: '저녁', NIGHT: '야간' };
export const conditionFields = ['kind', 'user_id', 'employee_name', 'start_date', 'end_date', 'start_time', 'end_time', 'shift', 'value'];
export const editableItem = item => Object.fromEntries(conditionFields.map(k => [k, item[k] ?? (k === 'employee_name' ? '' : null)]));
export function conditionDetail(item) {
  const date = item.start_date === item.end_date ? item.start_date : `${item.start_date || '시작일 미정'}–${item.end_date || '종료일 미정'}`;
  const time = item.kind === 'LEAVE' ? '종일' : item.start_time ? `${item.start_time}–${item.end_time}` : SHIFT_LABELS[item.shift] || '시간대 확인 필요';
  return `${date || '날짜 확인 필요'} · ${time}${item.value != null ? ` · ${item.value}회` : ''}`;
}
export function changesBetween(before, after) {
  const labels = { kind:'조건', user_id:'멤버', start_date:'시작일', end_date:'종료일', start_time:'시작 시간', end_time:'종료 시간', shift:'적용 시간대', value:'횟수' };
  return Object.keys(labels).filter(k => (before?.[k] ?? null) !== (after?.[k] ?? null)).map(k => ({
    key:k, label:labels[k], before:k==='user_id' ? before?.employee_name || '미지정' : (k==='kind' ? CONDITION_LABELS[before?.[k]] : k==='shift' ? SHIFT_LABELS[before?.[k]] : before?.[k]) ?? '없음',
    after:k==='user_id' ? after?.employee_name || '미지정' : (k==='kind' ? CONDITION_LABELS[after?.[k]] : k==='shift' ? SHIFT_LABELS[after?.[k]] : after?.[k]) ?? '없음',
  }));
}
export const addDays = (value, days) => {
  const d = new Date(`${value}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10);
};
export function nextWeek(today) {
  const d = new Date(`${today}T12:00:00Z`); const delta = 8 - (d.getUTCDay() || 7);
  const start = addDays(today, delta); return { start, end:addDays(start,6) };
}
// Deliberately a UI fixture, not a constraint solver. No persistence or API writes.
export function examplePlan(start, members, existing=[]) {
  const pairs = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2],[0,1]];
  const generated = pairs.flatMap((pair, index) => pair.filter(i=>members[i]).map(i => ({
    id:`example-${index}-${i}`, date:addDays(start,index), user:members[i], start:'14:00',end:'22:00',example:true,
  })));
  return { mode:'example', days:Array.from({length:7},(_,i)=>addDays(start,i)), generated, existing };
}
