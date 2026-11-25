"""Reviewed scheduling constraints. This module stores rules, not optimizer results."""
import hashlib
import json
import re
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, StrictInt
from constraint_rules import conflict_errors

CONSTRAINT_KINDS = {'FORBIDDEN_SHIFT', 'PREFERRED_SHIFT', 'MAX_SHIFT', 'MIN_SHIFT'}
ITEM_KINDS = CONSTRAINT_KINDS | {'SHIFT', 'LEAVE'}
SHIFTS = {'DAY', 'EVENING', 'NIGHT', 'ALL'}
TIME = re.compile(r'^(?:[01]\d|2[0-3]):[0-5]\d$')


def init_constraints_db(conn):
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS work_constraints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id TEXT NOT NULL REFERENCES workspaces(id),
            user_id INTEGER NOT NULL REFERENCES users(id),
            kind TEXT NOT NULL CHECK(kind IN ('FORBIDDEN_SHIFT','PREFERRED_SHIFT','MAX_SHIFT','MIN_SHIFT')),
            start_date TEXT NOT NULL REFERENCES calendar(date),
            end_date TEXT NOT NULL REFERENCES calendar(date),
            shift TEXT CHECK(shift IN ('DAY','EVENING','NIGHT','ALL')),
            start_time TEXT,
            end_time TEXT,
            value INTEGER CHECK(value >= 0),
            strength TEXT NOT NULL CHECK(strength IN ('HARD','SOFT')),
            source_preview_id TEXT NOT NULL REFERENCES notice_parser_drafts(id),
            source_item_index INTEGER NOT NULL,
            created_by INTEGER NOT NULL REFERENCES users(id),
            fingerprint TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
            revision INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            CHECK(start_date <= end_date),
            CHECK((start_time IS NULL AND end_time IS NULL) OR
                  (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)),
            CHECK((kind IN ('MAX_SHIFT','MIN_SHIFT') AND value IS NOT NULL) OR
                  (kind NOT IN ('MAX_SHIFT','MIN_SHIFT') AND value IS NULL)),
            UNIQUE(source_preview_id, source_item_index)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_constraint_active_fingerprint
            ON work_constraints(workspace_id,fingerprint) WHERE active=1;
        CREATE INDEX IF NOT EXISTS idx_constraint_period
            ON work_constraints(workspace_id,active,start_date,end_date);
    ''')
    conn.commit()


def fingerprint(item):
    fields = ('user_id', 'kind', 'start_date', 'end_date', 'shift', 'start_time', 'end_time', 'value')
    return hashlib.sha256(json.dumps([item.get(k) for k in fields]).encode()).hexdigest()


def validate_reviewed_items(conn, items, workspace_id, *, exclude_id=None):
    """Rebuild derived fields on the server; neither names nor eligibility are trusted."""
    members = {r['id']: r['name'] for r in conn.execute('''SELECT u.id,u.name FROM users u
        JOIN workspace_members m ON m.user_id=u.id WHERE m.workspace_id=?''', (workspace_id,))}
    normalized, errors = [], []
    for index, raw in enumerate(items):
        item = {k: raw.get(k) for k in ('kind', 'user_id', 'employee_name', 'start_date', 'end_date',
                                       'start_time', 'end_time', 'shift', 'value')}
        issues = []
        uid, kind = item['user_id'], item['kind']
        if type(uid) is not int or uid not in members:
            issues.append('워크스페이스 멤버를 한 명 선택해 주세요.')
        else:
            item['employee_name'] = members[uid]
        if kind not in ITEM_KINDS:
            issues.append('지원하는 조건 종류를 선택해 주세요.')
        try:
            start, end = date.fromisoformat(item['start_date']), date.fromisoformat(item['end_date'])
            if start > end:
                raise ValueError()
            item['start_date'], item['end_date'] = start.isoformat(), end.isoformat()
            for day in (start, end):
                if not conn.execute('SELECT 1 FROM calendar WHERE date=?', (day.isoformat(),)).fetchone():
                    raise ValueError()
        except (ValueError, TypeError):
            issues.append('달력 DB 범위 안에서 유효한 시작일·종료일을 선택해 주세요.')
        a, b = item['start_time'], item['end_time']
        clock = bool(a or b)
        if clock and not (isinstance(a, str) and isinstance(b, str) and TIME.fullmatch(a)
                          and (TIME.fullmatch(b) or b == '24:00') and a < b):
            issues.append('시작·종료 시간을 확인해 주세요. 자정을 넘으면 날짜별로 나눠 주세요.')
        if kind == 'SHIFT':
            if not clock or item['start_date'] != item['end_date']:
                issues.append('시간 근무는 하루 단위의 시작·종료 시간이 필요해요.')
            item['shift'], item['value'] = None, None
        elif kind == 'LEAVE':
            if clock or item['shift'] not in (None, 'ALL') or item['value'] is not None:
                issues.append('휴가는 종일만 지원해요.')
            item['shift'], item['value'] = None, None
        elif kind in CONSTRAINT_KINDS:
            if clock:
                item['shift'] = None
            elif item['shift'] not in SHIFTS:
                issues.append('종일·전체 근무 또는 적용 시간대를 선택해 주세요.')
            if kind in {'MAX_SHIFT', 'MIN_SHIFT'}:
                if type(item['value']) is not int or not 0 <= item['value'] <= 366:
                    issues.append('근무 횟수는 0~366 사이의 정수로 입력해 주세요.')
            elif item['value'] is not None:
                issues.append('횟수 조건이 아닌 항목에는 횟수를 입력할 수 없어요.')
        item.update(all_day=kind == 'LEAVE', calendar_eligible=kind in {'SHIFT', 'LEAVE'} and not issues,
                    constraint_eligible=kind in CONSTRAINT_KINDS and not issues,
                    strength='SOFT' if kind == 'PREFERRED_SHIFT' else 'HARD', issues=issues)
        normalized.append(item)
        errors.extend(f'{index + 1}번 · {e}' for e in issues)
    valid = [i for i in normalized if i['constraint_eligible']]
    seen = set()
    for item in valid:
        key = fingerprint(item)
        duplicate = conn.execute('''SELECT id FROM work_constraints
            WHERE workspace_id=? AND active=1 AND fingerprint=? AND id!=?''',
                                 (workspace_id, key, exclude_id or -1)).fetchone()
        if key in seen or duplicate:
            errors.append(f"{item['employee_name']}: 같은 근무 조건이 이미 있거나 중복 입력됐어요.")
        seen.add(key)
    existing = [dict(r) for r in conn.execute('''SELECT * FROM work_constraints
        WHERE workspace_id=? AND active=1 AND id!=?''', (workspace_id, exclude_id or -1))]
    # Include actual leave/shift events, scoped to this workspace. General
    # all-day calendar events (meetings, notices) are not automatically leave.
    existing.extend(dict(r) for r in conn.execute('''SELECT e.user_id,e.start_date,e.end_date,
        e.start_time,e.end_time,CASE WHEN c.name='휴가' THEN 'LEAVE' ELSE 'SHIFT' END AS kind,
        NULL AS shift,NULL AS value FROM events e JOIN categories c ON c.id=e.category_id
        WHERE e.workspace_id=? AND (c.name='휴가' AND e.all_day=1 OR c.name='근무' AND e.all_day=0)''',
        (workspace_id,)))
    errors.extend(conflict_errors([i for i in normalized if not i['issues']], existing))
    return normalized, list(dict.fromkeys(errors))


def insert_constraints(conn, items, draft, user):
    ids = []
    for index, item in enumerate(items):
        if not item.get('constraint_eligible'):
            continue
        cursor = conn.execute('''INSERT INTO work_constraints
            (workspace_id,user_id,kind,start_date,end_date,shift,start_time,end_time,value,strength,
             source_preview_id,source_item_index,created_by,fingerprint)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (user['workspace_id'], item['user_id'], item['kind'], item['start_date'], item['end_date'],
             item.get('shift'), item.get('start_time'), item.get('end_time'), item.get('value'),
             item['strength'], draft['id'], index, user['id'], fingerprint(item)))
        ids.append(cursor.lastrowid)
    return ids


class ReviewedItem(BaseModel):
    kind: str
    user_id: StrictInt | None = None
    employee_name: str = ''
    start_date: str | None = None
    end_date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    shift: str | None = None
    value: StrictInt | None = None


class ConstraintEdit(BaseModel):
    revision: int = Field(ge=0)
    item: ReviewedItem


class ConstraintDeactivate(BaseModel):
    revision: int = Field(ge=0)


def create_constraints_router(get_conn, current_member, require_editor):
    router = APIRouter(prefix='/api/work-constraints', tags=['근무 조건'])

    @router.get('/context')
    def schedule_context(start_date: date, end_date: date, user=Depends(current_member), conn=Depends(get_conn)):
        if not 0 <= (end_date-start_date).days <= 31:
            raise HTTPException(422, '최대 32일 범위로 조회해 주세요.')
        rows = conn.execute('''SELECT e.id,e.title,e.user_id,u.name AS employee_name,
            e.start_date,e.end_date,e.start_time,e.end_time,e.all_day
            FROM events e LEFT JOIN users u ON e.user_id=u.id WHERE e.workspace_id=?
            AND e.start_date<=? AND e.end_date>=? ORDER BY e.start_date,e.start_time''',
            (user['workspace_id'], end_date.isoformat(), start_date.isoformat()))
        return {'events': [dict(r) for r in rows], 'optimizer_available': False}

    @router.get('')
    def list_conditions(start_date: date | None = None, end_date: date | None = None,
                        user=Depends(current_member), conn=Depends(get_conn)):
        if start_date and end_date and start_date > end_date:
            raise HTTPException(422, '조회 기간을 확인해 주세요.')
        start_date = start_date.isoformat() if start_date else None
        end_date = end_date.isoformat() if end_date else None
        rows = conn.execute('''SELECT c.*,u.name AS employee_name,d.input_text AS source_text
            FROM work_constraints c JOIN users u ON c.user_id=u.id
            JOIN notice_parser_drafts d ON d.id=c.source_preview_id
            WHERE c.workspace_id=? AND c.active=1
            AND (? IS NULL OR c.end_date>=?) AND (? IS NULL OR c.start_date<=?)
            ORDER BY c.start_date,c.id''', (user['workspace_id'], start_date, start_date, end_date, end_date))
        return {'items': [dict(r) for r in rows], 'optimizer_available': False}

    def get_owned(conn, constraint_id, user, revision):
        row = conn.execute('SELECT * FROM work_constraints WHERE id=? AND workspace_id=? AND active=1',
                           (constraint_id, user['workspace_id'])).fetchone()
        if not row:
            raise HTTPException(404, '근무 조건을 찾을 수 없습니다.')
        if row['revision'] != revision:
            raise HTTPException(409, '다른 창에서 조건을 수정했어요. 새로고침 후 다시 확인해 주세요.')
        return row

    @router.put('/{constraint_id}')
    def update(constraint_id: int, body: ConstraintEdit, user=Depends(require_editor), conn=Depends(get_conn)):
        with conn:
            conn.execute('BEGIN IMMEDIATE')
            get_owned(conn, constraint_id, user, body.revision)
            if body.item.kind not in CONSTRAINT_KINDS:
                raise HTTPException(422, '근무 조건만 수정할 수 있어요.')
            items, errors = validate_reviewed_items(conn, [body.item.model_dump()], user['workspace_id'], exclude_id=constraint_id)
            if errors:
                raise HTTPException(422, ' '.join(errors))
            item = items[0]
            conn.execute('''UPDATE work_constraints SET user_id=?,kind=?,start_date=?,end_date=?,shift=?,
                start_time=?,end_time=?,value=?,strength=?,fingerprint=?,revision=revision+1,
                updated_at=datetime('now') WHERE id=?''',
                (*[item[k] for k in ('user_id','kind','start_date','end_date','shift','start_time','end_time','value','strength')],
                 fingerprint(item), constraint_id))
        return {'id': constraint_id, 'revision': body.revision + 1}

    @router.post('/{constraint_id}/deactivate')
    def deactivate(constraint_id: int, body: ConstraintDeactivate, user=Depends(require_editor), conn=Depends(get_conn)):
        with conn:
            conn.execute('BEGIN IMMEDIATE')
            get_owned(conn, constraint_id, user, body.revision)
            conn.execute("UPDATE work_constraints SET active=0,revision=revision+1,updated_at=datetime('now') WHERE id=?", (constraint_id,))
        return {'id': constraint_id, 'active': False}

    return router
