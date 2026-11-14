// 19 플로팅 채팅: '공지로 보내기' 메시지에서 근무 일정 1건을 찾아줘.
// 예) '11월 9일(월) 김민수 오후 근무는 14:00–22:00입니다.' → { date: '2026-11-09', start: '14:00', end: '22:00', memberName: '김민수' }
// 런칭 전 오프라인 버전이라 규칙(정규식)으로 찾고, 나중에 AI 추출 API로 바꾸면 이 함수만 교체하면 돼.
// 못 찾으면 { error: 'date' | 'time' } 를 돌려줘서 화면에서 보완 안내를 띄워.

const pad2 = n => String(n).padStart(2, '0');

// '14:00', '9시', '오후 2시 30분' → 'HH:MM' (분은 00 또는 30처럼 그대로)
function toTime(hour, minute, meridiem) {
  let h = Number(hour);
  const m = Number(minute || 0);
  if (meridiem === '오후' && h < 12) h += 12;
  if (meridiem === '오전' && h === 12) h = 0;
  if (h > 24 || m > 59 || (h === 24 && m > 0)) return null;
  return `${pad2(h)}:${pad2(m)}`;
}

const TIME = String.raw`(오전|오후)?\s*(\d{1,2})(?::(\d{2})|시\s*(?:(\d{1,2})분)?)`;
const RANGE = new RegExp(`${TIME}\\s*(?:[–—~\\-]|부터)\\s*${TIME}`);

export function parseNoticeSchedule(text, { today, memberNames = [], fallbackName = '' } = {}) {
  const source = (text || '').trim();
  const dateMatch = source.match(/(?:(\d{4})년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
    || source.match(/(?:(\d{4})[./-])?(\d{1,2})[./](\d{1,2})(?!\d)/);
  if (!dateMatch) return { error: 'date' };

  const [ty, tm] = (today || '2026-01-01').split('-').map(Number);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  // 연도가 없으면 오늘 기준: 이미 지난 달이 6개월 넘게 앞이면 내년으로 봐 (12월에 '1월 5일' 공지)
  let year = dateMatch[1] ? Number(dateMatch[1]) : ty;
  if (!dateMatch[1] && month < tm && tm - month > 6) year += 1;
  const probe = new Date(year, month - 1, day);
  if (month < 1 || month > 12 || probe.getMonth() !== month - 1 || probe.getDate() !== day) return { error: 'date' };
  const date = `${year}-${pad2(month)}-${pad2(day)}`;

  const range = source.match(RANGE);
  if (!range) return { error: 'time', date };
  const [, m1, h1, mm1, mk1, m2, h2, mm2, mk2] = range;
  // '오후 2시~6시' 처럼 뒤쪽에 오전/오후가 없으면 앞쪽 것을 따라가
  const start = toTime(h1, mm1 ?? mk1, m1);
  const end = toTime(h2, mm2 ?? mk2, m2 || m1);
  if (!start || !end || start === end) return { error: 'time', date };

  const memberName = memberNames.find(name => source.includes(name)) || fallbackName;
  return { date, start, end, memberName };
}

// '오전 9:20' (채팅 말풍선 시간)
export function formatChatTime(date = new Date()) {
  const h = date.getHours();
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad2(date.getMinutes())}`;
}

// '2026-11-07' → '2026년 11월 7일 토요일' (채팅 날짜 구분선)
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function formatChatDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일 ${WEEKDAYS[new Date(y, m - 1, d).getDay()]}요일`;
}

// '2026-11-09' → '11월 9일 (월)' (일정 카드)
export function formatScheduleDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}
