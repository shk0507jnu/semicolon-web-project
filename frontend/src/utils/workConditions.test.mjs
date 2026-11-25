import test from 'node:test';
import assert from 'node:assert/strict';
import {nextWeek, addDays, changesBetween, editableItem, examplePlan} from './workConditions.mjs';

test('weekly dates stay correct over month and year boundaries',()=>{
  assert.deepEqual(nextWeek('2026-11-22'),{start:'2026-11-23',end:'2026-11-29'});
  assert.deepEqual(nextWeek('2026-12-28'),{start:'2027-01-04',end:'2027-01-10'});
  assert.equal(addDays('2028-02-28',1),'2028-02-29');
});

test('review shows the changed identity and a zero count without hiding either',()=>{
  const before={user_id:null,employee_name:'수진',value:2};
  const after={user_id:1,employee_name:'김수진',value:0};
  const changes=changesBetween(before,after);
  assert.equal(changes[0].before,'수진');
  assert.equal(changes[0].after,'김수진');
  assert.equal(changes[1].after,0);
  assert.equal(editableItem({...after,calendar_eligible:true}).calendar_eligible,undefined);
});

test('example plan stays separate from the existing calendar and handles small rosters',()=>{
  const existing=Object.freeze([Object.freeze({id:10,title:'기존 일정'})]);
  const members=Object.freeze([{id:1,name:'김수진'},{id:2,name:'이민수'},{id:3,name:'박서연'},{id:4,name:'정우진'}]);
  const result=examplePlan('2026-11-23',members,existing);
  assert.equal(result.mode,'example');
  assert.equal(result.existing,existing);
  assert.equal(result.generated.length,14);
  assert.ok(result.generated.every(e=>e.example&&e.id!==10));
  assert.deepEqual(examplePlan('2026-11-23',[]).generated,[]);
  assert.ok(examplePlan('2026-11-23',members.slice(0,1)).generated.every(e=>e.user.id===1));
});
