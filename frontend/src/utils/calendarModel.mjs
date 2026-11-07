export function actualToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// API weekdays start on Monday; the existing UI starts on Sunday.
export function calendarWeeks(days, firstWeekday) {
  const cells = Array((firstWeekday + 1) % 7).fill(null).concat(days);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export function eventRange(event, day) {
  if (event.all_day || day < event.start_date || day > event.end_date) return null;
  const start = day > event.start_date ? '00:00' : event.start_time;
  const end = day < event.end_date ? '24:00' : event.end_time;
  if (!start || !end || end <= start) return null;
  return { id: event.id, memberId: event.user?.id, start, end, label: event.title };
}

export function eventTimeLabel(event) {
  if (event.all_day) return '종일';
  return event.start_date === event.end_date
    ? `${event.start_time}–${event.end_time}`
    : `${event.start_date} ${event.start_time} → ${event.end_date} ${event.end_time}`;
}

// Minimum simultaneous headcount, not simply the number of overlapping events.
export function staffingStatuses(events, rules, day) {
  const [y, m, d] = day.split('-').map(Number);
  const weekday = ['일','월','화','수','목','금','토'][new Date(y, m - 1, d).getDay()];
  const ranges = events.filter(e => e.category?.name === '근무').map(e => eventRange(e, day)).filter(Boolean);
  return rules.filter(r => r.days.includes(weekday)).map(rule => {
    const cuts = [...new Set([rule.start, rule.end, ...ranges.flatMap(r => [r.start, r.end])])]
      .filter(t => t >= rule.start && t <= rule.end).sort();
    const counts = cuts.slice(0, -1).map((start, i) => new Set(ranges.filter(r =>
      r.memberId != null && r.start <= start && r.end >= cuts[i + 1]).map(r => r.memberId)).size);
    const assigned = counts.length ? Math.min(...counts) : 0;
    return { ...rule, assigned, shortage: Math.max(0, rule.min - assigned) };
  });
}
