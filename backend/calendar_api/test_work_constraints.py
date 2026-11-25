import json
from concurrent.futures import ThreadPoolExecutor

import pytest

from test_api import client, EDITOR, VIEWER
from test_notice_parser import offline, preview, fake_gemini, leave


def save(client, draft, **kwargs):
    return client.post(f'/api/notice-parser/previews/{draft["id"]}/confirm',
                       headers=kwargs.get('headers', EDITOR), json={'revision': draft['revision']})


def review(client, draft, items, **kwargs):
    return client.put(f'/api/notice-parser/previews/{draft["id"]}', headers=EDITOR,
                      json={'revision': draft['revision'], 'items': items, **kwargs})


def conditions(client, **kwargs):
    return client.get('/api/work-constraints', headers=kwargs.pop('headers', EDITOR), params=kwargs).json()['items']


@pytest.mark.parametrize('text,kind,start,end,scope,value', [
    ('홍길동 내일 종일 근무 제외', 'FORBIDDEN_SHIFT', '2026-11-19', '2026-11-19', 'ALL', None),
    ('홍길동 29일부터 3일까지 야간 선호', 'PREFERRED_SHIFT', '2026-11-29', '2026-12-03', 'NIGHT', None),
    ('홍길동 12월 29일부터 3일까지 최대 0회', 'MAX_SHIFT', '2026-12-29', '2027-01-03', 'ALL', 0),
    ('관리자 23일부터 29일까지 최소 2회', 'MIN_SHIFT', '2026-11-23', '2026-11-29', 'ALL', 2),
    ('홍길동 11월 29일 13시~15시 근무 불가', 'FORBIDDEN_SHIFT', '2026-11-29', '2026-11-29', None, None),
])
def test_local_conditions_saved_and_reloaded(client, text, kind, start, end, scope, value):
    draft = preview(client, text).json()
    assert draft['can_confirm'], draft
    result = save(client, draft)
    assert result.status_code == 200 and result.json()['event_ids'] == []
    item, = conditions(client)
    assert (item['kind'], item['start_date'], item['end_date'], item['shift'], item['value']) == (kind, start, end, scope, value)
    assert item['source_text'] == text and item['created_by'] == 2
    assert item['strength'] == ('SOFT' if kind == 'PREFERRED_SHIFT' else 'HARD')
    assert conditions(client, start_date='2027-02-01', end_date='2027-02-07') == []


def test_correct_unknown_member_preserves_original_and_checks_revision(client):
    draft = preview(client, '길동 내일 종일 근무 제외').json()
    assert not draft['can_confirm']
    item = {**draft['items'][0], 'user_id': 1, 'employee_name': 'forged name'}
    fixed = review(client, draft, [item]).json()
    assert fixed['revision'] == 1 and fixed['can_confirm']
    assert fixed['original_items'][0]['employee_name'] == '길동'
    assert fixed['items'][0]['employee_name'] == '홍길동'
    assert review(client, draft, [item]).status_code == 409
    assert save(client, draft).status_code == 409
    assert save(client, fixed).status_code == 200
    assert review(client, fixed, [item]).status_code == 409
    assert save(client, fixed).json()['already_saved']
    assert len(conditions(client)) == 1


@pytest.mark.parametrize('patch', [
    {'user_id': 999}, {'start_date': '2031-01-01'}, {'end_date': '2026-02-30'},
    {'end_date': '2026-01-01'}, {'start_time': '24:00', 'end_time': '25:00'},
    {'kind': 'MIN_SHIFT', 'value': -1}, {'shift': None},
])
def test_edits_cannot_bypass_validation(client, patch):
    draft = preview(client, '홍길동 내일 종일 근무 제외').json()
    result = review(client, draft, [{**draft['items'][0], **patch}])
    assert result.status_code == 200
    assert not result.json()['can_confirm'] and result.json()['errors']
    assert save(client, result.json()).status_code == 422
    assert conditions(client) == []


def test_duplicate_constraints_and_contradictory_limits(client):
    text = '홍길동 23일부터 29일까지 최대 2회'
    duplicate = preview(client, text+'\n'+text).json()
    assert not duplicate['can_confirm']
    draft = preview(client, text).json()
    assert save(client, draft).status_code == 200
    assert not preview(client, text).json()['can_confirm']
    assert not preview(client, '홍길동 23일부터 29일까지 최소 3회').json()['can_confirm']
    assert preview(client, '홍길동 23일부터 29일까지 최소 1회').json()['can_confirm']


def test_mixed_shift_and_conditions_atomic_and_idempotent(client):
    draft = preview(client, '홍길동 내일 13시~15시 근무\n관리자 내일 종일 근무 제외').json()
    assert draft['calendar_count'] == draft['constraint_count'] == 1
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(lambda _: save(client, draft), range(4)))
    assert all(r.status_code == 200 for r in results)
    assert sum(not r.json()['already_saved'] for r in results) == 1
    assert len(conditions(client)) == 1
    assert len(client.get('/api/calendar/days/2026-11-19', headers=EDITOR).json()['events']) == 1


def test_membership_loss_rolls_back_events_and_conditions(client):
    import main
    draft = preview(client, '홍길동 내일 13시~15시 근무\n관리자 내일 종일 근무 제외').json()
    with main.connect() as conn:
        conn.execute("DELETE FROM workspace_members WHERE workspace_id='cafe' AND user_id=1")
    assert save(client, draft).status_code == 409
    assert conditions(client) == []
    assert client.get('/api/calendar/days/2026-11-19', headers=EDITOR).json()['events'] == []


def test_condition_edit_deactivation_and_workspace_isolation(client):
    import main
    draft = preview(client, '홍길동 내일 종일 근무 제외').json()
    cid, = save(client, draft).json()['constraint_ids']
    item = {**draft['items'][0], 'kind':'PREFERRED_SHIFT'}
    body = {'revision':0, 'item':item}
    path = f'/api/work-constraints/{cid}'
    assert client.put(path, headers=VIEWER, json=body).status_code == 403
    with main.connect() as conn:
        conn.execute("INSERT INTO workspaces(id,name) VALUES('other','다른 팀')")
        conn.execute("INSERT INTO workspace_members VALUES('other',2,'editor')")
    other = {**EDITOR, 'X-Workspace-Id':'other'}
    assert conditions(client, headers=other) == []
    assert client.put(path, headers=other, json=body).status_code == 404
    assert client.get(f'/api/notice-parser/previews/{draft["id"]}', headers=other).status_code == 404
    assert client.put(path, headers=EDITOR, json=body).status_code == 200
    assert conditions(client)[0]['strength'] == 'SOFT'
    assert client.put(path, headers=EDITOR, json=body).status_code == 409
    assert client.post(path+'/deactivate', headers=EDITOR, json={'revision':0}).status_code == 409
    assert client.post(path+'/deactivate', headers=EDITOR, json={'revision':1}).status_code == 200
    assert conditions(client) == []
    with main.connect() as conn:
        assert conn.execute('SELECT active FROM work_constraints WHERE id=?', (cid,)).fetchone()['active'] == 0


def test_clarification_cannot_be_dismissed_by_checkbox(client, monkeypatch):
    fake_gemini(monkeypatch, [leave(constraint_type='MAX_SHIFT', shift='NIGHT', value=2)], clarification=True)
    draft = preview(client, '조건이 모호함').json()
    pending = review(client, draft, draft['items']).json()
    assert not pending['can_confirm']
    fixed = review(client, pending, pending['items'], acknowledge_clarification=True).json()
    assert not fixed['can_confirm'] and save(client, fixed).status_code == 422
    assert conditions(client) == []


def test_expired_review_and_boolean_identifier_rejected(client):
    import main
    draft = preview(client, '홍길동 내일 종일 근무 제외').json()
    assert review(client, draft, [{**draft['items'][0], 'user_id':True}]).status_code == 422
    with main.connect() as conn:
        conn.execute('UPDATE notice_parser_drafts SET created_at=0 WHERE id=?', (draft['id'],))
    assert review(client, draft, draft['items']).status_code == 409
    assert save(client, draft).status_code == 409


def test_demo_roster_has_four_members_without_changing_event_ownership(client):
    import main
    from seed_demo import seed_members
    with main.connect() as conn:
        before = [tuple(r) for r in conn.execute('SELECT id,user_id FROM events')]
        members = seed_members(conn)
        assert seed_members(conn) == members
        assert [m['name'] for m in members] == ['김수진','이민수','박서연','정우진']
        assert [tuple(r) for r in conn.execute('SELECT id,user_id FROM events')] == before
        conn.execute("UPDATE users SET name='사용자 지정 이름' WHERE id=1")
        assert seed_members(conn)[0]['name'] == '사용자 지정 이름'
    assert len(client.get('/api/demo-users', headers=EDITOR).json()['items']) == 4


def test_migration_is_repeatable_and_keeps_original_drafts(client):
    import main
    from notice_parser import init_parser_db
    draft = preview(client, '홍길동 내일 종일 근무 제외').json()
    save(client, draft)
    with main.connect() as conn:
        init_parser_db(conn)
        init_parser_db(conn)
        row = conn.execute('SELECT original_json FROM notice_parser_drafts WHERE id=?', (draft['id'],)).fetchone()
        assert json.loads(row['original_json']) == draft
    assert len(conditions(client)) == 1


def test_context_only_returns_workspace_events_and_limits_range(client):
    draft = preview(client).json()
    save(client, draft)
    path = '/api/work-constraints/context'
    result = client.get(path, headers=EDITOR, params={'start_date':'2026-11-23','end_date':'2026-11-29'})
    assert result.status_code == 200
    assert len(result.json()['events']) == 1 and not result.json()['optimizer_available']
    assert client.get(path, headers=EDITOR, params={'start_date':'2026-01-01','end_date':'2026-12-31'}).status_code == 422


def test_old_draft_schema_is_upgraded_without_losing_saved_ids():
    import sqlite3
    from notice_parser import init_parser_db
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row
    conn.execute('''CREATE TABLE notice_parser_drafts (
        id TEXT PRIMARY KEY,workspace_id TEXT,user_id INTEGER,reference_date TEXT,
        input_text TEXT,engine TEXT,parsed_json TEXT,created_at INTEGER,saved_event_ids TEXT)''')
    conn.execute("INSERT INTO notice_parser_drafts VALUES('old','cafe',2,'2026-11-22','기존 공지','local-time','{\"items\":[]}',1,'[99]')")
    init_parser_db(conn)
    init_parser_db(conn)
    row = conn.execute('SELECT * FROM notice_parser_drafts').fetchone()
    assert row['saved_event_ids'] == '[99]' and row['revision'] == 0
    assert row['original_json'] == row['parsed_json']
    assert row['saved_constraint_ids'] is None
    conn.close()
