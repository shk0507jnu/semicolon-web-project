"""Regression tests for the supplied Nov-23 parser; no live model requests."""
import itertools
import json
import random
from pathlib import Path

import pytest
from pydantic import ValidationError

from test_api import client, EDITOR
from test_notice_parser import offline, preview, fake_gemini, leave
from test_work_constraints import save, review, conditions
from constraint_rules import feasible


@pytest.mark.parametrize('text', [
    '홍길동 12월 1일부터 7일까지 야간 근무 제외\n홍길동 12월 1일부터 7일까지 야간 최소 1회',
    '홍길동 12월 1일부터 6일까지 야간 최소 3회\n홍길동 12월 1일부터 3일까지 야간 최대 1회\n홍길동 12월 4일부터 6일까지 야간 최대 1회',
    '홍길동 12월 1일부터 7일까지 최소 1회\n홍길동 12월 1일부터 7일까지 종일 근무 제외',
    '홍길동 12월 1일부터 7일까지 최소 8회',
    '홍길동 12월 1일부터 7일까지 전체 최대 0회\n홍길동 12월 1일부터 7일까지 야간 최소 1회',
    '홍길동 12월 1일 13시~15시 근무 제외\n홍길동 12월 1일 14시~16시 최소 1회',
    '홍길동 12월 1일 13시~15시 근무\n홍길동 12월 1일 종일 근무 제외',
])
def test_impossible_conditions_block_preview_and_save(client, text):
    draft = preview(client, text).json()
    assert not draft['can_confirm'] and draft['errors'], draft
    assert save(client, draft).status_code == 422
    assert conditions(client) == []


@pytest.mark.parametrize('text', [
    '홍길동 12월 1일부터 7일까지 야간 최대 10회',  # loose upper bound is valid
    '홍길동 12월 1일부터 7일까지 야간 최대 0회',
    '홍길동 12월 1일부터 3일까지 야간 근무 제외\n홍길동 12월 1일부터 7일까지 야간 최소 4회',
    '홍길동 12월 1일부터 6일까지 야간 최소 2회\n홍길동 12월 1일부터 3일까지 야간 최대 1회\n홍길동 12월 4일부터 6일까지 야간 최대 1회',
    '홍길동 12월 1일 야간 근무 제외\n홍길동 12월 1일 주간 최소 1회',
    '홍길동 12월 1일 13시~15시 근무 제외\n홍길동 12월 1일 15시~16시 근무',
])
def test_possible_conditions_still_save(client, text):
    draft = preview(client, text).json()
    assert draft['can_confirm'], draft
    assert save(client, draft).status_code == 200


def test_saved_leave_and_new_leave_both_limit_available_days(client, monkeypatch):
    fake_gemini(monkeypatch, [leave(start_date='2026-12-01', end_date='2026-12-07'),
        leave(constraint_type='MIN_SHIFT', start_date='2026-12-01', end_date='2026-12-07', shift='NIGHT', value=1)])
    assert not preview(client, '휴가와 최소 근무 조건').json()['can_confirm']
    fake_gemini(monkeypatch, [leave(start_date='2026-12-01', end_date='2026-12-07')])
    draft = preview(client, '일주일 휴가').json()
    assert save(client, draft).status_code == 200
    assert not preview(client, '홍길동 12월 1일부터 7일까지 야간 최소 1회').json()['can_confirm']
    assert preview(client, '관리자 12월 1일부터 7일까지 야간 최소 1회').json()['can_confirm']


def test_confirm_rechecks_newly_saved_conflicts_atomically(client):
    before = client.get('/api/calendar/days/2026-12-01', headers=EDITOR).json()['events']
    draft = preview(client, '홍길동 12월 1일부터 7일까지 최소 1회\n관리자 12월 1일 13시~15시 근무').json()
    assert draft['can_confirm']
    block = preview(client, '홍길동 12월 1일부터 7일까지 종일 근무 제외').json()
    assert save(client, block).status_code == 200
    assert save(client, draft).status_code == 409
    assert len(conditions(client)) == 1
    assert client.get('/api/calendar/days/2026-12-01', headers=EDITOR).json()['events'] == before


def test_edit_cannot_create_combination_conflict(client):
    draft = preview(client, '홍길동 12월 1일부터 6일까지 야간 최소 2회\n홍길동 12월 1일부터 3일까지 야간 최대 1회\n홍길동 12월 4일부터 6일까지 야간 최대 1회').json()
    ids = save(client, draft).json()['constraint_ids']
    response = client.put(f'/api/work-constraints/{ids[0]}', headers=EDITOR,
                          json={'revision': 0, 'item': {**draft['items'][0], 'value': 3}})
    assert response.status_code == 422
    assert conditions(client)[0]['value'] == 2


@pytest.mark.parametrize('value', [True, False, '2', 1.5])
def test_counts_are_strict_in_model_and_review_api(client, value):
    from notice_llm import Constraint
    with pytest.raises(ValidationError):
        Constraint(**leave(constraint_type='MAX_SHIFT', shift='NIGHT', value=value))
    draft = preview(client, '홍길동 내일 최대 2회').json()
    assert review(client, draft, [{**draft['items'][0], 'value': value}]).status_code == 422


@pytest.mark.parametrize('uid', [None, True, 999])
def test_member_required_before_any_db_write(client, uid):
    draft = preview(client, '홍길동 내일 최대 2회').json()
    response = review(client, draft, [{**draft['items'][0], 'user_id': uid}])
    if uid is True:
        assert response.status_code == 422
    else:
        assert not response.json()['can_confirm']
        assert save(client, response.json()).status_code == 422
    assert conditions(client) == []


def test_legacy_acknowledged_partial_result_cannot_save(client, monkeypatch):
    import main
    fake_gemini(monkeypatch, [leave()], clarification=True)
    draft = preview(client, '일부 요청만 추출된 공지').json()
    with main.connect() as conn:
        unsafe = {**draft, 'clarification_message': None, 'can_confirm': True, 'errors': []}
        conn.execute('UPDATE notice_parser_drafts SET parsed_json=? WHERE id=?', (json.dumps(unsafe), draft['id']))
    assert not client.get(f'/api/notice-parser/previews/{draft["id"]}', headers=EDITOR).json()['can_confirm']
    assert save(client, draft).status_code == 422
    fresh = preview(client, '홍길동 12월 20일 종일 근무 제외\n관리자 12월 20일 야간 최대 2회').json()
    assert fresh['can_confirm'] and save(client, fresh).status_code == 200


def test_interval_algorithm_matches_exhaustive_small_schedules():
    rng = random.Random(20261123)
    for _ in range(500):
        bounds = []
        for _ in range(rng.randint(1, 8)):
            a = rng.randrange(6)
            b = rng.randrange(a+1, 8)
            bounds.append((a, b, rng.choice(['MIN_SHIFT','MAX_SHIFT']), rng.randrange(9)))
        expected = any(all((sum(plan[a:b]) >= count if kind == 'MIN_SHIFT' else sum(plan[a:b]) <= count)
                           for a,b,kind,count in bounds) for plan in itertools.product((0,1), repeat=7))
        assert feasible(bounds) == expected, bounds


RECORDED = json.loads((Path(__file__).parent/'fixtures/evaluation_progress.json').read_text(encoding='utf-8'))


@pytest.mark.parametrize('case', list(RECORDED['results'].values()), ids=list(RECORDED['results']))
def test_supplied_64_recorded_outputs_through_web_api(client, monkeypatch, case):
    """Replays recorded LLM output, not a claim of 64 new model invocations."""
    import main
    import notice_parser
    from notice_llm import ParsedCommand
    actual = ParsedCommand.model_validate(case['actual']).model_dump(mode='json')
    with main.connect() as conn:
        for name in {i['employee_name'] for i in actual['constraints']} - {''}:
            uid = conn.execute("INSERT INTO users(name,role) VALUES(?,'viewer')", (name,)).lastrowid
            conn.execute("INSERT INTO workspace_members VALUES('cafe',?,'viewer')", (uid,))
    monkeypatch.setattr(notice_parser, 'gemini_available', lambda: True)
    monkeypatch.setattr(notice_parser, 'run_gemini', lambda *_: actual)
    # Isolate the supplied model adapter from the separate narrow clock grammar.
    monkeypatch.setattr(notice_parser, 'local_shifts', lambda *_: None)
    monkeypatch.setattr(notice_parser, 'local_conditions', lambda *_: None)
    draft = preview(client, case['input'], reference=RECORDED['reference_date']).json()
    assert draft['engine'] == 'gemini'
    assert draft['can_confirm'] is (not actual['need_clarification']), draft
    result = save(client, draft)
    assert result.status_code == (422 if actual['need_clarification'] else 200), result.text
    if not actual['need_clarification']:
        assert len(result.json()['event_ids']) + len(result.json()['constraint_ids']) == len(actual['constraints'])
    else:
        assert conditions(client) == []
