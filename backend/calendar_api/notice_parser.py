"""Web adapter for the supplied ShiftOptBackend-2 parser and the calendar DB.

Clock-time assignments use a deliberately narrow local grammar. Natural-language
constraints use the supplied Gemini parser. Reviewed SHIFT/LEAVE items are added
to the calendar; reviewed optimizer constraints are persisted separately.
"""
import json
import os
import re
import time
import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from work_constraints import (ReviewedItem, init_constraints_db, validate_reviewed_items,
                              insert_constraints, CONSTRAINT_KINDS)


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
    columns = {r['name'] for r in conn.execute('PRAGMA table_info(notice_parser_drafts)')}
    for name, definition in {
        'revision': 'INTEGER NOT NULL DEFAULT 0', 'original_json': 'TEXT',
        'saved_constraint_ids': 'TEXT',
    }.items():
        if name not in columns:
            conn.execute(f'ALTER TABLE notice_parser_drafts ADD COLUMN {name} {definition}')
    conn.execute('UPDATE notice_parser_drafts SET original_json=parsed_json WHERE original_json IS NULL')
    conn.commit()
    init_constraints_db(conn)


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


DAY = re.compile(r'(?:(?P<year>\d{4})년\s*)?(?:(?P<month>\d{1,2})월\s*)?(?P<day>\d{1,2})일|(?P<iso>\d{4}-\d{2}-\d{2})|(?P<relative>오늘|내일|모레)')
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


def resolve_day(match, reference):
    if match['relative']:
        return reference + timedelta(days={'오늘': 0, '내일': 1, '모레': 2}[match['relative']])
    if match['iso']:
        return date.fromisoformat(match['iso'])
    return date(int(match['year'] or reference.year), int(match['month'] or reference.month), int(match['day']))


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
            day = resolve_day(dm, reference)
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


def local_conditions(text, reference, members):
    """Small, complete-line grammar for predictable demo inputs; never a partial parse."""
    items = []
    for line in filter(str.strip, text.splitlines()):
        dates, times = list(DAY.finditer(line)), list(TIME_RANGE.finditer(line))
        if not 1 <= len(dates) <= 2 or len(times) > 1:
            return None
        name = line[:dates[0].start()].strip()
        if not any(m['name'] == name for m in members):
            name = re.sub(r'[은는]$', '', name).strip()
        if not re.fullmatch(r'[가-힣A-Za-z]{2,30}', name):
            return None
        rest = line[dates[-1].end():].strip()
        if len(dates) == 2 and not re.fullmatch(r'\s*(?:부터|[~–—-])\s*', line[dates[0].end():dates[1].start()]):
            return None
        rest = re.sub(r'^까지\s*', '', rest)
        try:
            start = resolve_day(dates[0], reference)
            end = start if len(dates) == 1 else resolve_day(dates[-1], reference if dates[-1]['relative'] else start)
            dm = dates[-1]
            if end < start and len(dates) == 2 and not any(dm[k] for k in ('year', 'month', 'iso', 'relative')):
                end = date(start.year + (start.month == 12), start.month % 12 + 1, int(dm['day']))
            if end < start:
                return None
            a = b = None
            if times:
                tm = times[0]
                a, b = clock_value(tm.groups()[:4]), clock_value(tm.groups()[4:])
                rest = rest.replace(tm.group(0).strip(), '').strip()
        except ValueError:
            return None
        match = re.fullmatch(r'(?:(종일|전체|주간|저녁|야간)\s*)?(?:근무\s*)?(제외|불가|금지|선호|희망|최대\s*\d+회|최소\s*\d+회)[.!]?', rest)
        if not match:
            return None
        scope, action = match.groups()
        if action.startswith(('최대', '최소')):
            kind = 'MAX_SHIFT' if action.startswith('최대') else 'MIN_SHIFT'
            value = int(re.search(r'\d+', action)[0])
        else:
            kind = 'PREFERRED_SHIFT' if action in {'선호', '희망'} else 'FORBIDDEN_SHIFT'
            value = None
        # Unqualified exclusion/preference is not silently interpreted as all day.
        shift = {'종일': 'ALL', '전체': 'ALL', '주간': 'DAY', '저녁': 'EVENING', '야간': 'NIGHT'}.get(scope)
        if kind in {'MAX_SHIFT', 'MIN_SHIFT'} and not shift:
            shift = 'ALL'
        matches = [m for m in members if m['name'] == name]
        items.append(dict(kind=kind, employee_name=name, user_id=matches[0]['id'] if len(matches) == 1 else None,
                          start_date=start.isoformat(), end_date=end.isoformat(),
                          start_time=a, end_time=b, shift=shift, value=value, calendar_eligible=False))
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
        if kind != 'LEAVE' and raw.get('shift') not in {'DAY', 'EVENING', 'NIGHT', 'ALL'} and not (
                kind in {'MAX_SHIFT', 'MIN_SHIFT'} and raw.get('shift') is None):
            issues.append(f'{name}: 주간·저녁·야간 중 근무 종류가 필요합니다.')
        if kind in {'MAX_SHIFT', 'MIN_SHIFT'} and (type(raw.get('value')) is not int or raw['value'] < 0):
            issues.append(f'{name}: 근무 횟수는 0 이상의 정수로 적어 주세요.')
        if kind == 'LEAVE' and (raw.get('shift') is not None or raw.get('value') is not None):
            issues.append(f'{name}: 시간대가 있는 휴가는 현재 종일 휴가로 저장할 수 없습니다.')
        errors.extend(issues)
        items.append(dict(kind=kind, employee_name=name, user_id=matches[0]['id'] if len(matches) == 1 else None,
                          start_date=raw.get('start_date'), end_date=raw.get('end_date'),
                          start_time=None, end_time=None, all_day=kind == 'LEAVE',
                          shift=raw.get('shift') or ('ALL' if kind in {'MAX_SHIFT', 'MIN_SHIFT'} else None), value=raw.get('value'),
                          calendar_eligible=kind == 'LEAVE' and not issues))
    return items, errors


def local_mixed(text, reference, members):
    items = []
    for line in filter(str.strip, text.splitlines()):
        parsed = local_shifts(line, reference, members) or local_conditions(line, reference, members)
        if not parsed:
            return None
        items.extend(parsed)
    return items or None


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


class ReviewIn(BaseModel):
    revision: int = Field(ge=0)
    items: list[ReviewedItem] = Field(min_length=1, max_length=20)


class ConfirmIn(BaseModel):
    revision: int = Field(ge=0)


def enrich_result(conn, result, workspace_id, initial_errors=()):
    items, errors = validate_reviewed_items(conn, result['items'], workspace_id)
    errors = list(dict.fromkeys([*initial_errors, *errors]))
    if not errors:
        try:
            validate_calendar_items(conn, items, workspace_id)
        except HTTPException as error:
            errors.append(error.detail)
    eligible = sum(i['calendar_eligible'] for i in items)
    conditions = sum(i['constraint_eligible'] for i in items)
    result.update(items=items, errors=errors, calendar_count=eligible, constraint_count=conditions,
                  preview_only_count=0, can_confirm=bool(items and not errors))
    return result


def create_parser_router(get_conn, current_member, require_editor):
    router = APIRouter(prefix='/api/notice-parser', tags=['공지 파서 (임시)'])

    @router.get('/status')
    def status(user=Depends(current_member)):
        return {'gemini_available': gemini_available(), 'local_schedule_available': True,
                'constraint_storage': True, 'optimizer_available': False}

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
        elif (items := local_conditions(text, body.reference_date, members)):
            engine = 'local-constraints'
        elif (items := local_mixed(text, body.reference_date, members)):
            engine = 'local-mixed'
        elif CLOCK_HINT.search(text):
            raise HTTPException(422, '한 줄에 한 명씩 “김수진 내일 13시~15시 근무” 또는 “김수진 내일 13시~15시 근무 제외” 형식으로 적어 주세요. 이름과 날짜·시간을 확인하고, 자정을 넘는 근무는 날짜별로 나눠 주세요.')
        else:
            if not gemini_available():
                raise HTTPException(503, '자유로운 문장·휴가 분석에는 서버의 GOOGLE_API_KEY 설정이 필요합니다. “김수진 내일 13시~15시 근무”, “김수진 내일 종일 근무 제외” 등의 형식은 키 없이 테스트할 수 있어요.')
            try:
                parsed = run_gemini(text, body.reference_date)
                items, errors = normalize_constraints(parsed, members)
            except Exception:
                raise HTTPException(502, 'Gemini 분석에 실패했습니다. 서버의 API 키·모델 설정을 확인한 뒤 다시 시도해 주세요.') from None
            engine = 'gemini'
        if len(items) > 20:
            raise HTTPException(422, '한 번에 최대 20개 항목까지 분석할 수 있습니다.')
        result = dict(id=uuid.uuid4().hex, engine=engine, reference_date=body.reference_date.isoformat(),
                      items=items, revision=0, input_text=text,
                      clarification_message=(parsed.get('clarification_message') or '원문의 모호한 내용을 확인해 주세요.')
                          if engine == 'gemini' and parsed.get('need_clarification') is not False else None)
        enrich_result(conn, result, user['workspace_id'], errors)
        encoded = json.dumps(result, ensure_ascii=False)
        with conn:
            conn.execute('''INSERT INTO notice_parser_drafts
                (id,workspace_id,user_id,reference_date,input_text,engine,parsed_json,created_at,original_json)
                VALUES (?,?,?,?,?,?,?,?,?)''', (result['id'], user['workspace_id'], user['id'],
                body.reference_date.isoformat(), text, engine, encoded, int(time.time()), encoded))
        return result

    def read_draft(conn, preview_id, user):
        row = conn.execute('''SELECT * FROM notice_parser_drafts
            WHERE id=? AND workspace_id=? AND user_id=?''', (preview_id, user['workspace_id'], user['id'])).fetchone()
        if not row:
            raise HTTPException(404, '분석 결과를 찾을 수 없습니다.')
        return row

    def draft_payload(row):
        result = json.loads(row['parsed_json'])
        clarification = json.loads(row['original_json'] or row['parsed_json']).get('clarification_message')
        if clarification:
            result.update(clarification_message=clarification, can_confirm=False)
            result['errors'] = list(dict.fromkeys([*result.get('errors', []), clarification]))
        return {**result, 'revision': row['revision'], 'input_text': row['input_text'],
                'original_items': json.loads(row['original_json'] or row['parsed_json'])['items'],
                'saved': row['saved_event_ids'] is not None,
                'event_ids': json.loads(row['saved_event_ids'] or '[]'),
                'constraint_ids': json.loads(row['saved_constraint_ids'] or '[]'),
                'expired': row['saved_event_ids'] is None and int(time.time()) - row['created_at'] > 3600}

    @router.get('/previews/{preview_id}')
    def read(preview_id: str, user=Depends(require_editor), conn=Depends(get_conn)):
        return draft_payload(read_draft(conn, preview_id, user))

    @router.put('/previews/{preview_id}')
    def review(preview_id: str, body: ReviewIn, user=Depends(require_editor), conn=Depends(get_conn)):
        with conn:
            conn.execute('BEGIN IMMEDIATE')
            row = read_draft(conn, preview_id, user)
            if row['saved_event_ids'] is not None:
                raise HTTPException(409, '이미 저장한 결과입니다. 근무 조건 관리에서 수정해 주세요.')
            if int(time.time()) - row['created_at'] > 3600:
                raise HTTPException(409, '분석 결과가 만료되었습니다. 원문을 다시 분석해 주세요.')
            if row['revision'] != body.revision:
                raise HTTPException(409, '다른 창에서 결과가 수정됐어요. 새로고침 후 확인해 주세요.')
            result = json.loads(row['parsed_json'])
            result['items'] = [i.model_dump() for i in body.items]
            result['revision'] = row['revision'] + 1
            # A partially extracted command may omit a person's entire request.
            # Editing retained rows cannot resolve that: require corrected text
            # and a fresh parse. Read immutable original JSON for legacy drafts.
            clarification = json.loads(row['original_json'] or row['parsed_json']).get('clarification_message')
            result['clarification_message'] = clarification
            enrich_result(conn, result, user['workspace_id'],
                          [clarification] if clarification else [])
            conn.execute('UPDATE notice_parser_drafts SET parsed_json=?,revision=? WHERE id=?',
                         (json.dumps(result, ensure_ascii=False), result['revision'], preview_id))
        return draft_payload(read_draft(conn, preview_id, user))

    @router.post('/previews/{preview_id}/confirm')
    def confirm(preview_id: str, body: ConfirmIn | None = None, user=Depends(require_editor), conn=Depends(get_conn)):
        with conn:
            conn.execute('BEGIN IMMEDIATE')
            row = read_draft(conn, preview_id, user)
            if row['saved_event_ids'] is not None:
                return {'event_ids': json.loads(row['saved_event_ids']),
                        'constraint_ids': json.loads(row['saved_constraint_ids'] or '[]'), 'already_saved': True}
            if (body and body.revision != row['revision']) or (body is None and row['revision'] != 0):
                raise HTTPException(409, '분석 결과가 수정됐어요. 최신 결과를 다시 확인해 주세요.')
            if int(time.time()) - row['created_at'] > 3600:
                raise HTTPException(409, '분석 결과가 만료되었습니다. 공지를 다시 분석해 주세요.')
            parsed = json.loads(row['parsed_json'])
            original = json.loads(row['original_json'] or row['parsed_json'])
            if not parsed['can_confirm'] or original.get('clarification_message'):
                raise HTTPException(422, '이 결과는 저장할 수 없습니다. 내용을 보완해 다시 분석해 주세요.')
            items, errors = validate_reviewed_items(conn, parsed['items'], user['workspace_id'])
            if errors:
                raise HTTPException(409, ' '.join(errors))
            parsed['items'] = items
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
            constraint_ids = insert_constraints(conn, parsed['items'], row, user)
            conn.execute('UPDATE notice_parser_drafts SET saved_event_ids=?,saved_constraint_ids=? WHERE id=?',
                         (json.dumps(ids), json.dumps(constraint_ids), preview_id))
        return {'event_ids': ids, 'constraint_ids': constraint_ids, 'already_saved': False}

    return router
