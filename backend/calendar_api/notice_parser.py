"""Temporary bridge for shiftoptbackend_11_18's parser and the calendar DB.

Clock-time assignments use a deliberately narrow local grammar. Natural-language
constraints use the supplied Gemini parser. Only reviewed SHIFT/LEAVE items can
be added to the calendar; optimizer constraints remain preview-only.
"""
import json
import os
import re
import time
import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field


def init_parser_db(conn):
    conn.execute('''CREATE TABLE IF NOT EXISTS notice_parser_drafts (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        reference_date TEXT NOT NULL,
        input_text TEXT NOT NULL,
        engine TEXT NOT NULL,
        parsed_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        saved_event_ids TEXT
    )''')
    conn.commit()


def gemini_available():
    # Lazy import keeps the existing calendar API usable before optional packages
    # are installed, and loads only backend/calendar_api/.env (never the frontend).
    try:
        import notice_llm  # noqa: F401
    except ImportError:
        return False
    return bool(os.environ.get('GOOGLE_API_KEY'))


def run_gemini(text, reference):
    from notice_llm import parse_with_gemini
    return parse_with_gemini(text, reference).model_dump(mode='json')


DAY = re.compile(r'(?:(?P<year>\d{4})년\s*)?(?:(?P<month>\d{1,2})월\s*)?(?P<day>\d{1,2})일|(?P<iso>\d{4}-\d{2}-\d{2})')
CLOCK = r'(오전|오후)?\s*(\d{1,2})(?::(\d{2})|시\s*(?:(\d{1,2})분)?)'
TIME_RANGE = re.compile(CLOCK + r'\s*(?:부터|[~–—-])\s*' + CLOCK + r'\s*(?:까지)?')
CLOCK_HINT = re.compile(r'\d{1,2}\s*시|\d{1,2}:\d{2}')
KINDS = {'LEAVE', 'FORBIDDEN_SHIFT', 'PREFERRED_SHIFT', 'MAX_SHIFT', 'MIN_SHIFT'}


def clock_value(parts):
    marker, hour, minute, korean_minute = parts
    h, m = int(hour), int(minute or korean_minute or 0)
    if m > 59 or h > 24 or (h == 24 and m) or (marker and not 1 <= h <= 12):
        raise ValueError('시간 범위를 확인해 주세요.')
    if marker:
        h = h % 12 + (12 if marker == '오후' else 0)
    return f'{h:02}:{m:02}'


def local_shifts(text, reference, members):
    """Require every line to match; never silently save just part of a message."""
    items = []
    for line in text.splitlines():
        if not line.strip():
            continue
        dates, times = list(DAY.finditer(line)), list(TIME_RANGE.finditer(line))
        if len(dates) != 1 or len(times) != 1:
            return None
        dm, tm = dates[0], times[0]
        try:
            day = date.fromisoformat(dm['iso']) if dm['iso'] else date(
                int(dm['year'] or reference.year), int(dm['month'] or reference.month), int(dm['day']))
            start, end = clock_value(tm.groups()[:4]), clock_value(tm.groups()[4:])
            if start >= end or start == '24:00':
                return None
        except ValueError:
            return None
        rest = line
        for match in sorted([dm, tm], key=lambda m: m.start(), reverse=True):
            rest = rest[:match.start()] + ' ' + rest[match.end():]
        # Match a complete registered name, never a substring or the sender by default.
        rest = re.sub(r'\([월화수목금토일](?:요일)?\)', '', rest).strip()
        found = [m for m in members if re.fullmatch(
            re.escape(m['name']) + r'(?:은|는)?\s*(?:근무(?:합니다|예정|배정)?|근무 예정|근무 배정)?[.!]?', rest)]
        if len(found) != 1:
            return None
        items.append(dict(kind='SHIFT', employee_name=found[0]['name'], user_id=found[0]['id'],
                          start_date=day.isoformat(), end_date=day.isoformat(),
                          start_time=start, end_time=end, all_day=False, calendar_eligible=True))
    return items or None


def normalize_constraints(parsed, members):
    errors, items = [], []
    if parsed.get('need_clarification') is not False:
        errors.append(parsed.get('clarification_message') or '이름, 날짜, 근무 조건을 구체적으로 적어 주세요.')
    constraints = parsed.get('constraints')
    if not isinstance(constraints, list) or not constraints:
        return [], errors + ['근무 조건을 찾지 못했습니다. 내용을 보완해 다시 보내 주세요.']
    if len(constraints) > 20:
        return [], errors + ['한 번에 최대 20개 항목을 분석할 수 있습니다. 공지를 나눠 보내 주세요.']
    for raw in constraints:
        kind = raw.get('constraint_type')
        name = raw.get('employee_name', '')
        matches = [m for m in members if m['name'] == name]
        issues = []
        if len(matches) != 1:
            issues.append(f'{name or "직원"}: 이 워크스페이스에서 이름을 한 명으로 확인할 수 없습니다.')
        try:
            start, end = date.fromisoformat(raw['start_date']), date.fromisoformat(raw['end_date'])
            if start > end:
                raise ValueError()
        except (KeyError, TypeError, ValueError):
            issues.append(f'{name}: 시작일과 종료일을 확인해 주세요.')
        if kind not in KINDS:
            issues.append('지원하지 않는 근무 조건입니다.')
        if kind != 'LEAVE' and raw.get('shift') not in {'DAY', 'EVENING', 'NIGHT'}:
            issues.append(f'{name}: 주간·저녁·야간 중 근무 종류가 필요합니다.')
        if kind in {'MAX_SHIFT', 'MIN_SHIFT'} and (type(raw.get('value')) is not int or raw['value'] < 0):
            issues.append(f'{name}: 근무 횟수는 0 이상의 정수로 적어 주세요.')
        if kind == 'LEAVE' and (raw.get('shift') is not None or raw.get('value') is not None):
            issues.append(f'{name}: 시간대가 있는 휴가는 현재 종일 휴가로 저장할 수 없습니다.')
        errors.extend(issues)
        items.append(dict(kind=kind, employee_name=name, user_id=matches[0]['id'] if len(matches) == 1 else None,
                          start_date=raw.get('start_date'), end_date=raw.get('end_date'),
                          start_time=None, end_time=None, all_day=kind == 'LEAVE',
                          shift=raw.get('shift'), value=raw.get('value'),
                          calendar_eligible=kind == 'LEAVE' and not issues))
    return items, errors


def interval(item):
    start = datetime.fromisoformat(item['start_date'])
    end = datetime.fromisoformat(item['end_date'])
    if item['all_day']:
        return start, end + timedelta(days=1)
    def minutes(value):
        h, m = map(int, value.split(':'))
        return timedelta(hours=h, minutes=m)
    return start + minutes(item['start_time']), end + minutes(item['end_time'])


def overlaps(a, b):
    sa, ea = interval(a)
    sb, eb = interval(b)
    return sa < eb and sb < ea


def validate_calendar_items(conn, items, workspace_id):
    eligible = [item for item in items if item['calendar_eligible']]
    for i, item in enumerate(eligible):
        if not conn.execute('SELECT 1 FROM workspace_members WHERE workspace_id=? AND user_id=?',
                            (workspace_id, item['user_id'])).fetchone():
            raise HTTPException(409, '워크스페이스 멤버가 변경되었습니다. 공지를 다시 분석해 주세요.')
        for day in (item['start_date'], item['end_date']):
            if not conn.execute('SELECT 1 FROM calendar WHERE date=?', (day,)).fetchone():
                raise HTTPException(422, '달력 DB에서 지원하지 않는 날짜입니다.')
        candidates = conn.execute('''SELECT * FROM events WHERE workspace_id=? AND user_id=?
            AND start_date<=? AND end_date>=?''',
            (workspace_id, item['user_id'], item['end_date'], item['start_date'])).fetchall()
        if any(overlaps(item, row) for row in candidates) or any(
                item['user_id'] == other['user_id'] and overlaps(item, other) for other in eligible[:i]):
            raise HTTPException(409, f"{item['employee_name']}의 {item['start_date']} 일정이 겹칩니다. 기존 일정이나 공지를 수정해 주세요.")
    return eligible


class PreviewIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    reference_date: date


def create_parser_router(get_conn, current_member, require_editor):
    router = APIRouter(prefix='/api/notice-parser', tags=['공지 파서 (임시)'])

    @router.get('/status')
    def status(user=Depends(current_member)):
        return {'gemini_available': gemini_available(), 'local_schedule_available': True,
                'constraint_storage': False}

    @router.post('/preview')
    def preview(body: PreviewIn, user=Depends(require_editor), conn=Depends(get_conn)):
        text = body.text.strip()
        if not text:
            raise HTTPException(422, '공지 내용을 입력해 주세요.')
        if re.search(r'취소|삭제|철회|수정|변경|반차|반일|시간차', text):
            raise HTTPException(422, '현재 공지 파서는 신규 근무와 종일 휴가만 달력에 추가할 수 있습니다. 기존 일정 변경·취소 및 부분 휴가는 달력에서 직접 처리해 주세요.')
        members = [dict(row) for row in conn.execute('''SELECT u.id,u.name FROM users u
            JOIN workspace_members m ON m.user_id=u.id WHERE m.workspace_id=?''', (user['workspace_id'],))]
        items = local_shifts(text, body.reference_date, members)
        errors = []
        if items:
            engine = 'local-time'
        elif CLOCK_HINT.search(text):
            raise HTTPException(422, '시간 일정은 한 줄에 한 명씩 “홍길동 11월 29일 13시~15시 근무” 형식으로 적어 주세요. 등록된 이름과 유효한 날짜·시간이 필요하며, 자정을 넘는 근무는 날짜별로 나눠 주세요.')
        else:
            if not gemini_available():
                raise HTTPException(503, '휴가·근무 조건 분석에는 서버의 GOOGLE_API_KEY 설정이 필요합니다. 지금은 “홍길동 11월 29일 13시~15시 근무” 형식의 시간 일정을 테스트할 수 있습니다.')
            try:
                parsed = run_gemini(text, body.reference_date)
                items, errors = normalize_constraints(parsed, members)
            except Exception:
                raise HTTPException(502, 'Gemini 분석에 실패했습니다. 서버의 API 키·모델 설정을 확인한 뒤 다시 시도해 주세요.') from None
            engine = 'gemini'
        if len(items) > 20:
            raise HTTPException(422, '한 번에 최대 20개 항목까지 분석할 수 있습니다.')
        # A clarification blocks the complete batch, including otherwise valid leaves.
        if not errors:
            try:
                validate_calendar_items(conn, items, user['workspace_id'])
            except HTTPException as error:
                errors.append(error.detail)
        eligible = sum(bool(i['calendar_eligible']) for i in items)
        result = dict(id=uuid.uuid4().hex, engine=engine, reference_date=body.reference_date.isoformat(),
                      items=items, errors=errors, can_confirm=bool(eligible and not errors),
                      calendar_count=eligible, preview_only_count=len(items) - eligible)
        with conn:
            conn.execute('''INSERT INTO notice_parser_drafts
                (id,workspace_id,user_id,reference_date,input_text,engine,parsed_json,created_at)
                VALUES (?,?,?,?,?,?,?,?)''', (result['id'], user['workspace_id'], user['id'],
                body.reference_date.isoformat(), text, engine, json.dumps(result, ensure_ascii=False), int(time.time())))
        return result

    @router.post('/previews/{preview_id}/confirm')
    def confirm(preview_id: str, user=Depends(require_editor), conn=Depends(get_conn)):
        with conn:
            conn.execute('BEGIN IMMEDIATE')
            row = conn.execute('''SELECT * FROM notice_parser_drafts
                WHERE id=? AND workspace_id=? AND user_id=?''', (preview_id, user['workspace_id'], user['id'])).fetchone()
            if not row:
                raise HTTPException(404, '분석 결과를 찾을 수 없습니다.')
            if row['saved_event_ids'] is not None:
                return {'event_ids': json.loads(row['saved_event_ids']), 'already_saved': True}
            if int(time.time()) - row['created_at'] > 3600:
                raise HTTPException(409, '분석 결과가 만료되었습니다. 공지를 다시 분석해 주세요.')
            parsed = json.loads(row['parsed_json'])
            if not parsed['can_confirm']:
                raise HTTPException(422, '이 결과는 저장할 수 없습니다. 내용을 보완해 다시 분석해 주세요.')
            eligible = validate_calendar_items(conn, parsed['items'], user['workspace_id'])
            ids = []
            for item in eligible:
                category, color = ('휴가', '#7C6CC4') if item['kind'] == 'LEAVE' else ('근무', '#17658F')
                conn.execute('INSERT OR IGNORE INTO categories(name,color) VALUES (?,?)', (category, color))
                category_id = conn.execute('SELECT id FROM categories WHERE name=?', (category,)).fetchone()['id']
                cursor = conn.execute('''INSERT INTO events (workspace_id,title,description,start_date,end_date,
                    start_time,end_time,all_day,category_id,user_id) VALUES (?,?,?,?,?,?,?,?,?,?)''',
                    (user['workspace_id'], f"{item['employee_name']} {category}", row['input_text'],
                     item['start_date'], item['end_date'], item['start_time'], item['end_time'],
                     int(item['all_day']), category_id, item['user_id']))
                ids.append(cursor.lastrowid)
            conn.execute('UPDATE notice_parser_drafts SET saved_event_ids=? WHERE id=?', (json.dumps(ids), preview_id))
        return {'event_ids': ids, 'already_saved': False}

    return router
