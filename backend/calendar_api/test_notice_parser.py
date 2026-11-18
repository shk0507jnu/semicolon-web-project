import json

import pytest
from pydantic import ValidationError

from test_api import client, EDITOR, VIEWER
import notice_parser


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    # Never spend API credits during automated tests, even on a configured machine.
    monkeypatch.setattr(notice_parser, 'gemini_available', lambda: False)
    monkeypatch.setattr(notice_parser, 'run_gemini', lambda *_: pytest.fail('Unexpected Gemini request'))


def preview(client, text='홍길동 11월 29일 13시~15시 근무', **kwargs):
    return client.post('/api/notice-parser/preview', headers=kwargs.pop('headers', EDITOR),
                       json={'text': text, 'reference_date': kwargs.pop('reference', '2026-11-18'), **kwargs})


def confirm(client, draft, headers=EDITOR):
    return client.post(f'/api/notice-parser/previews/{draft["id"]}/confirm', headers=headers)


def fake_gemini(monkeypatch, constraints, clarification=False):
    monkeypatch.setattr(notice_parser, 'gemini_available', lambda: True)
    monkeypatch.setattr(notice_parser, 'run_gemini', lambda *_: {
        'constraints': constraints, 'need_clarification': clarification,
        'clarification_message': '날짜를 확인해 주세요.' if clarification else None})


def leave(**changes):
    return {'constraint_type': 'LEAVE', 'employee_name': '홍길동', 'start_date': '2026-12-20',
            'end_date': '2026-12-22', 'shift': None, 'value': None, **changes}


@pytest.mark.parametrize('text,start,end,day', [
    ('홍길동 11월 29일 13시~15시 근무', '13:00', '15:00', '2026-11-29'),
    ('11월 29일 홍길동 13:15–15:30', '13:15', '15:30', '2026-11-29'),
    ('홍길동은 29일 오후 1시부터 오후 3시까지 근무합니다.', '13:00', '15:00', '2026-11-29'),
    ('홍길동 2027-01-02 22:00~24:00 근무', '22:00', '24:00', '2027-01-02'),
    ('홍길동 2027년 1월 2일 오전 12시~오전 1시 근무', '00:00', '01:00', '2027-01-02'),
])
def test_local_clock_formats(client, text, start, end, day):
    response = preview(client, text)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body['engine'] == 'local-time' and body['can_confirm']
    item = body['items'][0]
    assert (item['start_date'], item['start_time'], item['end_time'], item['user_id']) == (day, start, end, 1)


@pytest.mark.parametrize('text', [
    '홍길동 2월 30일 13시~15시 근무', '홍길동 11월 29일 25시~26시 근무',
    '홍길동 11월 29일 15시~13시 근무', '홍길동 11월 29일 오후 13시~15시 근무',
    '없는직원 11월 29일 13시~15시 근무', '11월 29일 13시~15시 근무',
    '홍길동 11월 29일 13시~15시 근무 불가', '홍길동 11월 29일 13시~15시 휴가',
    '홍길동 11월 29일 13시~15시 근무\n관리자 휴가',
    '홍길동 11월 29일부터 3일까지 13시~15시 근무',
    '홍길동 12월 20일 휴가 취소', '홍길동 12월 20일 오전 반차',
])
def test_ambiguous_clock_input_never_partially_saves(client, text):
    assert preview(client, text).status_code == 422


def test_preview_requires_confirmation_and_is_idempotent(client):
    before = client.get('/api/calendar/days/2026-11-29', headers=EDITOR).json()['events']
    draft = preview(client).json()
    assert client.get('/api/calendar/days/2026-11-29', headers=EDITOR).json()['events'] == before
    first = confirm(client, draft)
    second = confirm(client, draft)
    assert first.status_code == second.status_code == 200
    assert second.json()['already_saved']
    assert first.json()['event_ids'] == second.json()['event_ids']
    after = client.get('/api/calendar/days/2026-11-29', headers=EDITOR).json()['events']
    assert len(after) == len(before) + 1
    assert after[-1]['user']['id'] == 1


def test_missing_key_does_not_report_gemini_success(client):
    assert client.get('/api/notice-parser/status', headers=EDITOR).json()['gemini_available'] is False
    response = preview(client, '홍길동 12월 20일부터 22일까지 휴가')
    assert response.status_code == 503 and 'GOOGLE_API_KEY' in response.json()['detail']


def test_roles_and_workspace_scope(client):
    assert preview(client, headers=VIEWER).status_code == 403
    draft = preview(client).json()
    assert confirm(client, draft, VIEWER).status_code == 403
    import main
    with main.connect() as conn:
        conn.execute("INSERT INTO workspaces(id,name) VALUES ('other','다른 팀')")
        conn.execute("INSERT INTO workspace_members VALUES ('other',2,'editor')")
        conn.execute("INSERT INTO users(id,name,role) VALUES (3,'다른 관리자','editor')")
        conn.execute("INSERT INTO workspace_members VALUES ('cafe',3,'editor')")
    assert confirm(client, draft, {**EDITOR, 'X-Workspace-Id': 'other'}).status_code == 404
    assert confirm(client, draft, {'X-User-Id': '3'}).status_code == 404
    assert preview(client, headers={**EDITOR, 'X-Workspace-Id': 'other'}).status_code == 422


def test_membership_and_expiration_rechecked_at_confirm(client):
    draft = preview(client).json()
    import main
    with main.connect() as conn:
        conn.execute("DELETE FROM workspace_members WHERE workspace_id='cafe' AND user_id=1")
    assert confirm(client, draft).status_code == 409
    with main.connect() as conn:
        conn.execute("INSERT INTO workspace_members VALUES ('cafe',1,'viewer')")
        conn.execute('UPDATE notice_parser_drafts SET created_at=0 WHERE id=?', (draft['id'],))
    assert confirm(client, draft).status_code == 409


def test_conflicting_batch_is_atomic(client):
    draft = preview(client, '홍길동 11월 29일 13시~15시 근무\n관리자 11월 29일 13시~15시 근무').json()
    assert draft['can_confirm']
    response = client.post('/api/events', headers=EDITOR, json={
        'title': '후속 배정', 'start_date': '2026-11-29', 'start_time': '14:00', 'end_time': '16:00', 'user_id': 2})
    assert response.status_code == 201
    before = client.get('/api/calendar/days/2026-11-29', headers=EDITOR).json()['events']
    assert confirm(client, draft).status_code == 409
    assert client.get('/api/calendar/days/2026-11-29', headers=EDITOR).json()['events'] == before


def test_duplicate_rows_blocked_but_adjacent_times_allowed(client):
    line = '홍길동 11월 29일 13시~15시 근무'
    duplicate = preview(client, line + '\n' + line).json()
    assert duplicate['errors'] and not duplicate['can_confirm']
    draft = preview(client, line + '\n홍길동 11월 29일 15시~17시 근무').json()
    assert len(confirm(client, draft).json()['event_ids']) == 2


def test_leave_and_conditions_split_and_only_leave_persisted(client, monkeypatch):
    condition = leave(constraint_type='PREFERRED_SHIFT', shift='DAY')
    fake_gemini(monkeypatch, [leave(), condition])
    draft = preview(client, '홍길동 12월 20일부터 22일까지 휴가').json()
    assert draft['engine'] == 'gemini'
    assert draft['calendar_count'] == draft['preview_only_count'] == 1
    ids = confirm(client, draft).json()['event_ids']
    assert len(ids) == 1
    event = client.get(f'/api/events/{ids[0]}', headers=EDITOR).json()
    assert event['all_day'] and event['end_date'] == '2026-12-22'
    assert event['category']['name'] == '휴가'


@pytest.mark.parametrize('constraint', [
    leave(employee_name='다른 팀 직원'), leave(start_date=None), leave(end_date='2026-02-30'),
    leave(end_date='2026-12-19'), leave(shift='DAY'),
    leave(constraint_type='MIN_SHIFT', shift='NIGHT', value=True),
])
def test_invalid_llm_output_blocks_complete_batch(client, monkeypatch, constraint):
    fake_gemini(monkeypatch, [leave(), constraint])
    draft = preview(client, '휴가와 조건').json()
    assert draft['errors'] and not draft['can_confirm']
    assert confirm(client, draft).status_code == 422


def test_clarification_blocks_other_valid_items(client, monkeypatch):
    fake_gemini(monkeypatch, [leave()], clarification=True)
    draft = preview(client, '휴가').json()
    assert not draft['can_confirm'] and draft['errors']


def test_duplicate_names_not_guessed(client, monkeypatch):
    import main
    with main.connect() as conn:
        conn.execute("INSERT INTO users(id,name,role) VALUES (3,'홍길동','viewer')")
        conn.execute("INSERT INTO workspace_members VALUES ('cafe',3,'viewer')")
    assert preview(client).status_code == 422
    fake_gemini(monkeypatch, [leave()])
    assert not preview(client, '휴가').json()['can_confirm']


def test_gemini_failure_does_not_leak_credentials(client, monkeypatch):
    monkeypatch.setattr(notice_parser, 'gemini_available', lambda: True)
    def fail(*_):
        raise ValueError('secret-api-key')
    monkeypatch.setattr(notice_parser, 'run_gemini', fail)
    response = preview(client, '홍길동 휴가')
    assert response.status_code == 502 and 'secret-api-key' not in response.text


def test_original_adapter_schema_rejects_boolean_count():
    from notice_llm import ParsedCommand
    with pytest.raises(ValidationError):
        ParsedCommand.model_validate_json(json.dumps({'constraints': [leave(constraint_type='MAX_SHIFT', shift='NIGHT', value=True)],
                                                      'need_clarification': False}))


def test_parallel_confirmation_inserts_once(client):
    from concurrent.futures import ThreadPoolExecutor
    draft = preview(client).json()
    with ThreadPoolExecutor(max_workers=4) as executor:
        responses = list(executor.map(lambda _: confirm(client, draft), range(4)))
    assert all(response.status_code == 200 for response in responses)
    assert sum(not response.json()['already_saved'] for response in responses) == 1
    assert len({tuple(response.json()['event_ids']) for response in responses}) == 1


def test_conditions_only_are_preview_only(client, monkeypatch):
    fake_gemini(monkeypatch, [leave(constraint_type='MAX_SHIFT', shift='NIGHT', value=3)])
    draft = preview(client, '홍길동 12월 야간 근무 최대 3회').json()
    assert draft['calendar_count'] == 0 and draft['preview_only_count'] == 1
    assert not draft['can_confirm']
    assert confirm(client, draft).status_code == 422


def test_date_outside_calendar_blocks_save(client):
    draft = preview(client, '홍길동 2031년 1월 1일 13시~15시 근무').json()
    assert draft['errors'] and not draft['can_confirm']


def test_llm_adapter_calls_supplied_model_and_closes_client(monkeypatch):
    from types import SimpleNamespace
    from datetime import date
    import notice_llm
    calls, closed = [], []
    def generate_content(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(text=json.dumps({'constraints': [leave()], 'need_clarification': False}))
    def factory(**kwargs):
        assert kwargs['http_options'].timeout == 30000
        assert kwargs['http_options'].retry_options.attempts == 1
        return SimpleNamespace(models=SimpleNamespace(generate_content=generate_content), close=lambda: closed.append(True))
    monkeypatch.setenv('GOOGLE_API_KEY', 'fake-test-key')
    monkeypatch.setattr(notice_llm.genai, 'Client', factory)
    result = notice_llm.parse_with_gemini('홍길동 휴가', date(2026, 11, 18))
    assert len(result.constraints) == 1 and closed == [True]
    assert calls[0]['model'] == notice_llm.MODEL_NAME
    assert '2026-11-18' in calls[0]['contents']
    assert calls[0]['config'].response_schema is notice_llm.ParsedCommand
