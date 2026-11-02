// 날짜 관련 도우미 함수
// 날짜는 'YYYY-MM-DD' 문자열로 주고받아. (시간대 때문에 날짜가 하루 밀리는 문제를 피하려고)

import { MOCK_TODAY } from '../mocks/data';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 오늘 날짜 'YYYY-MM-DD' (임시 데이터 확인용 고정값이 있으면 그걸 써)
export function getToday() {
  return MOCK_TODAY ?? toISODate(new Date());
}
export const WEEKDAY_LABELS = WEEKDAYS;

const pad = (n) => String(n).padStart(2, '0');

// Date → 'YYYY-MM-DD'
export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 'YYYY-MM-DD' → Date (현지 시간 자정)
export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// '2026-09-09' → '9월 9일 (수)'
export function formatMonthDayWeekday(iso) {
  const date = parseISODate(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}

// 달력 한 달치를 주 단위 배열로 만들어줘. 빈 칸은 null.
// 예) 2026년 9월 → [[null, null, '2026-09-01', ...], ...]
export function getMonthWeeks(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(toISODate(new Date(year, monthIndex, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// '14:00' → 14, '22:30' → 22.5
export function timeToHours(time) {
  const [h, m] = time.split(':').map(Number);
  return h + m / 60;
}

// 768000 → '768,000원'
export function formatWon(amount) {
  return `${amount.toLocaleString('ko-KR')}원`;
}
