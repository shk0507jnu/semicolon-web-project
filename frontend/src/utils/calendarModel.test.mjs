import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarWeeks, eventRange, staffingStatuses } from './calendarModel.mjs';

test('Monday-based API weekday is placed correctly in Sunday-first September calendar', () => {
  const weeks=calendarWeeks([{date:'2026-09-01'}],1);
  assert.equal(weeks[0][0],null);
  assert.equal(weeks[0][1],null);
  assert.equal(weeks[0][2].date,'2026-09-01');
  assert.equal(calendarWeeks([{date:'2026-11-01'}],6)[0][0].date,'2026-11-01');
});
const night={id:1,title:'야간',start_date:'2026-09-09',end_date:'2026-09-10',start_time:'22:00',end_time:'06:00',user:{id:1}};
test('overnight event is clipped to each selected day',()=>{
  assert.equal(eventRange(night,'2026-09-09').end,'24:00');
  assert.equal(eventRange(night,'2026-09-10').start,'00:00');
  assert.equal(eventRange(night,'2026-09-10').end,'06:00');
  assert.equal(eventRange(night,'2026-09-11'),null);
  assert.equal(eventRange({...night,all_day:true},'2026-09-09'),null);
});
test('midnight end produces no zero-width bar on the next day',()=>{
  assert.equal(eventRange({...night,end_time:'00:00'},'2026-09-10'),null);
});
function shift(user,start,end){return {id:`${user}-${start}`,user:{id:user},start_date:'2026-09-09',end_date:'2026-09-09',start_time:start,end_time:end,title:'근무',category:{name:'근무'}};}
const rules=[{days:['수'],start:'09:00',end:'18:00',min:2}];
test('headcount counts distinct people and catches gaps within a staffing slot',()=>{
  const covered=[shift(1,'09:00','18:00'),shift(2,'09:00','12:00'),shift(3,'12:00','18:00')];
  assert.equal(staffingStatuses(covered,rules,'2026-09-09')[0].shortage,0);
  const gap=[shift(1,'09:00','18:00'),shift(2,'09:00','12:00'),shift(3,'13:00','18:00')];
  assert.equal(staffingStatuses(gap,rules,'2026-09-09')[0].shortage,1);
  assert.equal(staffingStatuses([shift(1,'09:00','18:00'),shift(1,'09:00','18:00')],rules,'2026-09-09')[0].assigned,1);
});
test('non-work events and rules for other weekdays do not count as staff',()=>{
  const personal={...shift(1,'09:00','18:00'),category:{name:'개인'}};
  assert.equal(staffingStatuses([personal],rules,'2026-09-09')[0].assigned,0);
  assert.deepEqual(staffingStatuses([],rules,'2026-09-10'),[]);
});
