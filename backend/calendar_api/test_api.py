import importlib
import os
import runpy
from datetime import date

import pytest
from fastapi.testclient import TestClient

HERE = os.path.dirname(os.path.abspath(__file__))
VIEWER = {"X-User-Id": "1"}
EDITOR = {"X-User-Id": "2"}
DOT_DAYS = [2, 4, 5, 9, 10, 11, 12, 14, 15, 17, 18, 22, 24, 25, 26, 28, 29, 30]


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db = tmp_path / "test.db"
    monkeypatch.setenv("CALENDAR_DB", str(db))
    monkeypatch.setenv('CALENDAR_DEMO_AUTH', '1')
    runpy.run_path(os.path.join(HERE, 'build.py'))
    import main
    importlib.reload(main)
    main.app.dependency_overrides[main.get_today] = lambda: date(2026, 11, 3)
    with TestClient(main.app) as c:  # lifespan(init_db) 실행
        import seed_demo
        importlib.reload(seed_demo)
        conn = main.connect()
        seed_demo.seed(conn)
        conn.close()
        yield c


def test_month_matches_design(client):
    r = client.get("/api/calendar", params={"year": 2026, "month": 9}, headers=VIEWER)
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "2026년 9월"
    assert len(body["days"]) == 30
    assert body["first_weekday"] == 1  # 9월 1일은 화요일
    assert [d["day"] for d in body["days"] if d["has_event"]] == DOT_DAYS
    assert body["days"][4]["is_weekend"] is True  # 9월 5일(토)
    assert body["prev"] == {"year": 2026, "month": 8}
    assert body["next"] == {"year": 2026, "month": 10}


def test_month_out_of_range(client):
    assert client.get("/api/calendar", params={"year": 2035, "month": 1}, headers=VIEWER).status_code == 404
    assert client.get("/api/calendar", params={"year": 2026, "month": 13}, headers=VIEWER).status_code == 422


def test_day_detail(client):
    r = client.get("/api/calendar/days/2026-09-09", headers=VIEWER)
    assert r.status_code == 200
    body = r.json()
    assert body["label"] == "9월 9일 (수)"
    assert len(body["events"]) == 1
    ev = body["events"][0]
    assert (ev["start_time"], ev["end_time"]) == ("09:00", "18:00")
    assert ev["category"]["name"] == "근무"
    assert ev["can_request_substitute"] is False  # 오늘(11/3) 이전 일정
    assert client.get("/api/calendar/days/2035-01-01", headers=VIEWER).status_code == 404


def test_viewer_cannot_edit_but_editor_can(client):
    payload = {"title": "회의", "start_date": "2026-12-10", "start_time": "10:00", "end_time": "11:00"}
    assert client.post("/api/events", json=payload, headers=VIEWER).status_code == 403

    r = client.post("/api/events", json=payload, headers=EDITOR)
    assert r.status_code == 201
    event_id = r.json()["id"]

    month = client.get("/api/calendar", params={"year": 2026, "month": 12}, headers=VIEWER).json()
    assert month["days"][9]["has_event"] is True  # 12월 10일

    r = client.patch(f"/api/events/{event_id}", json={"title": "주간 회의", "end_time": "12:00"}, headers=EDITOR)
    assert r.status_code == 200 and r.json()["title"] == "주간 회의" and r.json()["end_time"] == "12:00"

    assert client.delete(f"/api/events/{event_id}", headers=EDITOR).status_code == 204
    assert client.get(f"/api/events/{event_id}", headers=VIEWER).status_code == 404


def test_event_validation(client):
    base = {"title": "x", "start_date": "2026-12-10"}
    assert client.post("/api/events", json={**base, "end_date": "2026-12-09", "all_day": True}, headers=EDITOR).status_code == 422
    assert client.post("/api/events", json=base, headers=EDITOR).status_code == 422  # 시간 누락
    assert client.post("/api/events", json={**base, "start_time": "11:00", "end_time": "10:00"}, headers=EDITOR).status_code == 422
    assert client.post("/api/events", json={**base, "start_time": "25:00", "end_time": "26:00"}, headers=EDITOR).status_code == 422
    assert client.post("/api/events", json={**base, "start_date": "2040-01-01", "all_day": True}, headers=EDITOR).status_code == 400


def test_substitute_flow(client):
    # 편집자가 홍길동(1)에게 미래 근무 배정
    r = client.post(
        "/api/events",
        json={"title": "근무", "start_date": "2026-12-10", "start_time": "09:00", "end_time": "18:00", "user_id": 1},
        headers=EDITOR,
    )
    event_id = r.json()["id"]

    day = client.get("/api/calendar/days/2026-12-10", headers=VIEWER).json()
    assert day["events"][0]["can_request_substitute"] is True

    # 남의 일정, 지난 일정은 불가
    assert client.post(f"/api/events/{event_id}/substitute-requests", json={}, headers=EDITOR).status_code == 403
    past = client.get("/api/calendar/days/2026-09-09", headers=VIEWER).json()["events"][0]["id"]
    assert client.post(f"/api/events/{past}/substitute-requests", json={}, headers=VIEWER).status_code == 400

    r = client.post(f"/api/events/{event_id}/substitute-requests", json={"reason": "병원"}, headers=VIEWER)
    assert r.status_code == 201
    req_id = r.json()["id"]
    assert client.post(f"/api/events/{event_id}/substitute-requests", json={}, headers=VIEWER).status_code == 409

    day = client.get("/api/calendar/days/2026-12-10", headers=VIEWER).json()
    assert day["events"][0]["can_request_substitute"] is False  # 진행 중

    pending = client.get("/api/substitute-requests", headers=EDITOR).json()["items"]
    assert [p["id"] for p in pending] == [req_id]

    # 본인 요청은 수락 불가, 동료는 수락 가능 -> 일정 담당자가 넘어감
    assert client.patch(f"/api/substitute-requests/{req_id}", json={"action": "accept"}, headers=VIEWER).status_code == 403
    r = client.patch(f"/api/substitute-requests/{req_id}", json={"action": "accept"}, headers=EDITOR)
    assert r.status_code == 200 and r.json()["status"] == "accepted"
    assert client.get(f"/api/events/{event_id}", headers=VIEWER).json()["user"]["id"] == 2
    assert client.patch(f"/api/substitute-requests/{req_id}", json={"action": "cancel"}, headers=VIEWER).status_code == 409


def test_substitute_cancel(client):
    r = client.post(
        "/api/events",
        json={"title": "근무", "start_date": "2026-12-11", "start_time": "09:00", "end_time": "18:00", "user_id": 1},
        headers=EDITOR,
    )
    event_id = r.json()["id"]
    req_id = client.post(f"/api/events/{event_id}/substitute-requests", json={}, headers=VIEWER).json()["id"]
    assert client.patch(f"/api/substitute-requests/{req_id}", json={"action": "cancel"}, headers=EDITOR).status_code == 403
    r = client.patch(f"/api/substitute-requests/{req_id}", json={"action": "cancel"}, headers=VIEWER)
    assert r.json()["status"] == "cancelled"


def test_edit_permission_flow(client):
    assert client.get("/api/me", headers=VIEWER).json()["can_edit"] is False

    r = client.post("/api/edit-permission-requests", json={"reason": "일정 관리"}, headers=VIEWER)
    assert r.status_code == 201
    req_id = r.json()["id"]
    assert client.post("/api/edit-permission-requests", json={}, headers=VIEWER).status_code == 409

    assert client.patch(f"/api/edit-permission-requests/{req_id}", json={"status": "approved"}, headers=VIEWER).status_code == 403
    assert len(client.get("/api/edit-permission-requests", headers=EDITOR).json()["items"]) == 1

    r = client.patch(f"/api/edit-permission-requests/{req_id}", json={"status": "approved"}, headers=EDITOR)
    assert r.status_code == 200
    assert client.get("/api/me", headers=VIEWER).json()["can_edit"] is True
    assert client.post("/api/edit-permission-requests", json={}, headers=VIEWER).status_code == 409


def test_unknown_user(client):
    assert client.get("/api/me", headers={"X-User-Id": "999"}).status_code == 401


def test_workspace_isolation_and_persistence(client):
    workspace = client.post('/api/workspaces', json={'name':'별도 워크스페이스','type':'project'}, headers=EDITOR).json()
    assert workspace['type'] == 'project'
    scoped = {**EDITOR, 'X-Workspace-Id': workspace['id']}
    assert client.get('/api/me', headers={**VIEWER, 'X-Workspace-Id':workspace['id']}).status_code == 403
    event = client.post('/api/events', headers=scoped,
        json={'title':'다른 그룹 근무','start_date':'2026-12-10','start_time':'14:00','end_time':'22:00'}).json()
    assert event['workspace_id'] == workspace['id']
    eid = event['id']
    assert client.get(f'/api/events/{eid}', headers=EDITOR).status_code == 404
    assert client.patch(f'/api/events/{eid}', headers=EDITOR,json={'title':'x'}).status_code == 404
    assert client.delete(f'/api/events/{eid}', headers=EDITOR).status_code == 404
    assert client.get('/api/calendar/days/2026-12-10',headers=EDITOR).json()['events'] == []
    assert len(client.get('/api/calendar/days/2026-12-10',headers=scoped).json()['events']) == 1
    assert client.post('/api/events', headers=scoped,
        json={'title':'외부 멤버','start_date':'2026-12-10','all_day':True,'user_id':1}).status_code == 422
    import main
    main.init_db()
    conn = main.connect()
    assert conn.execute('SELECT workspace_id FROM events WHERE id=?',(eid,)).fetchone()[0] == workspace['id']
    assert conn.execute('SELECT name FROM workspaces WHERE id=?',(workspace['id'],)).fetchone()[0] == '별도 워크스페이스'
    conn.close()


def test_atomic_assignments_and_end_of_day(client):
    payload={'date':'2026-12-10','start':'18:00','end':'24:00','user_ids':[1,2]}
    assert client.post('/api/assignments',json=payload,headers=VIEWER).status_code == 403
    result=client.post('/api/assignments',json=payload,headers=EDITOR)
    assert result.status_code == 201
    assert len(result.json()['items']) == 2
    assert client.post('/api/assignments',json=payload,headers=EDITOR).status_code == 409
    # A failure after checking another selected user must not save a partial batch.
    assert len(client.get('/api/calendar/days/2026-12-10',headers=EDITOR).json()['events']) == 2
    bad={**payload,'date':'2026-12-11','user_ids':[1,999]}
    assert client.post('/api/assignments',json=bad,headers=EDITOR).status_code == 422
    assert client.get('/api/calendar/days/2026-12-11',headers=EDITOR).json()['events'] == []
    assert client.post('/api/assignments',json={**payload,'date':'2040-01-01'},headers=EDITOR).status_code == 422


def test_staffing_rules_persist_and_reject_invalid_updates(client):
    rule={'days':['월','수'],'start':'09:00','end':'18:00','min':3}
    assert client.put('/api/staffing-rules',headers=VIEWER,json={'items':[rule]}).status_code == 403
    assert client.put('/api/staffing-rules',headers=EDITOR,json={'items':[rule]}).status_code == 200
    assert client.get('/api/staffing-rules',headers=VIEWER).json()['items'][0]['min'] == 3
    assert client.put('/api/staffing-rules',headers=EDITOR,json={'items':[{**rule,'end':'08:00'}]}).status_code == 422
    assert len(client.get('/api/staffing-rules',headers=VIEWER).json()['items']) == 1
    wid=client.post('/api/workspaces',headers=EDITOR,json={'name':'새 팀'}).json()['id']
    assert client.get('/api/staffing-rules',headers={**EDITOR,'X-Workspace-Id':wid}).json()['items'] == []


def test_cross_workspace_substitute_and_permission(client):
    event=client.post('/api/events',headers=EDITOR,json={
        'title':'근무','start_date':'2026-12-20','start_time':'09:00','end_time':'18:00','user_id':1}).json()
    req=client.post(f"/api/events/{event['id']}/substitute-requests",headers=VIEWER,json={}).json()
    wid=client.post('/api/workspaces',headers=EDITOR,json={'name':'별도 팀'}).json()['id']
    scoped={**EDITOR,'X-Workspace-Id':wid}
    assert client.get('/api/substitute-requests?status=all',headers=scoped).json()['items'] == []
    assert client.patch(f"/api/substitute-requests/{req['id']}",headers=scoped,json={'action':'accept'}).status_code == 404
    permission=client.post('/api/edit-permission-requests',headers=VIEWER,json={}).json()
    assert client.patch(f"/api/edit-permission-requests/{permission['id']}",headers=scoped,json={'status':'approved'}).status_code == 404


def test_overnight_multiple_events_and_mine_filter(client):
    overnight={'title':'야간 근무','start_date':'2026-12-10','end_date':'2026-12-11',
               'start_time':'22:00','end_time':'06:00','user_id':1}
    assert client.post('/api/events',headers=EDITOR,json=overnight).status_code == 201
    assert client.post('/api/events',headers=EDITOR,json={'title':'종일','start_date':'2026-12-10','all_day':True}).status_code == 201
    assert len(client.get('/api/calendar/days/2026-12-10',headers=VIEWER).json()['events']) == 2
    assert len(client.get('/api/calendar/days/2026-12-10?mine=true',headers=VIEWER).json()['events']) == 1
    assert len(client.get('/api/calendar/days/2026-12-11',headers=VIEWER).json()['events']) == 1


def test_demo_identity_disabled_by_default(client, monkeypatch):
    monkeypatch.delenv('CALENDAR_DEMO_AUTH')
    assert client.get('/api/me',headers=EDITOR).status_code == 503


def test_build_refuses_existing_database(client):
    with pytest.raises(SystemExit):
        runpy.run_path(os.path.join(HERE,'build.py'))
    assert client.get('/api/calendar/days/2026-09-09',headers=VIEWER).json()['events']


def test_parallel_page_requests_use_request_scoped_connections(client):
    from concurrent.futures import ThreadPoolExecutor
    urls=['/api/me','/api/workspaces','/api/calendar?year=2026&month=9','/api/calendar/days/2026-09-09']*4
    with ThreadPoolExecutor(max_workers=8) as pool:
        results=list(pool.map(lambda url: client.get(url,headers=EDITOR).status_code, urls))
    assert results == [200]*len(urls)


def test_midnight_end_does_not_occupy_following_day(client):
    result=client.post('/api/events',headers=EDITOR,json={'title':'자정 종료','start_date':'2026-12-10',
        'end_date':'2026-12-11','start_time':'22:00','end_time':'00:00'})
    assert result.status_code == 201
    assert client.get('/api/calendar/days/2026-12-11',headers=EDITOR).json()['events'] == []
    month=client.get('/api/calendar?year=2026&month=12',headers=EDITOR).json()
    assert month['days'][9]['has_event'] is True
    assert month['days'][10]['has_event'] is False
