import test from 'node:test';
import assert from 'node:assert/strict';
import { formatChatDay, formatChatTime, formatScheduleDay, parseNoticeSchedule } from './chatSchedule.mjs';

const opts = { today: '2026-09-09', memberNames: ['김민수', '박서연'], fallbackName: '나' };

test('Figma 19 example notice becomes one schedule', () => {
  assert.deepEqual(parseNoticeSchedule('11월 9일(월) 김민수 오후 근무는 14:00–22:00입니다.', opts),
    { date: '2026-11-09', start: '14:00', end: '22:00', memberName: '김민수' });
});

test('Korean hour words, tilde and missing member', () => {
  assert.deepEqual(parseNoticeSchedule('9/12 오후 2시~6시 30분 대타 부탁해요', opts),
    { date: '2026-09-12', start: '14:00', end: '18:30', memberName: '나' });
  assert.equal(parseNoticeSchedule('10월 3일 박서연 09:00-15:00', opts).memberName, '박서연');
});

test('missing or impossible parts ask the user to fill in', () => {
  assert.deepEqual(parseNoticeSchedule('이번 주 근무표 확인 부탁드려요', opts), { error: 'date' });
  assert.deepEqual(parseNoticeSchedule('2월 30일 14:00-22:00', opts), { error: 'date' });
  assert.deepEqual(parseNoticeSchedule('11월 9일 오후 근무', opts), { error: 'time', date: '2026-11-09' });
});

test('a January notice written in December belongs to next year', () => {
  assert.equal(parseNoticeSchedule('1월 5일 10:00-18:00', { today: '2026-12-20' }).date, '2027-01-05');
});

test('chat labels match Figma wording', () => {
  assert.equal(formatChatDay('2026-11-07'), '2026년 11월 7일 토요일');
  assert.equal(formatScheduleDay('2026-11-09'), '11월 9일 (월)');
  assert.equal(formatChatTime(new Date(2026, 10, 7, 9, 20)), '오전 9:20');
  assert.equal(formatChatTime(new Date(2026, 10, 7, 12, 5)), '오후 12:05');
});
