"""달력 API (FastAPI + SQLite)

화면 구성과 API 대응
- 월간 달력(날짜별 일정 점, 이전/다음 달 화살표) -> GET /api/calendar
- 날짜 선택 시 하단 상세("9월 9일 (수)", 타임라인, [대타 요청]) -> GET /api/calendar/days/{date}
- [대타 요청] 버튼 -> POST /api/events/{id}/substitute-requests
- [편집 권한 요청] 버튼 -> POST /api/edit-permission-requests

실행: uvicorn main:app --reload   (문서: http://localhost:8000/docs)
인증: 데모용으로 X-User-Id 헤더(기본 1)를 사용합니다. 실제 서비스에서는 JWT 등으로 교체하세요.
"""
import os
import sqlite3
import json
import uuid
from contextlib import asynccontextmanager
from datetime import date
from typing import Literal, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response
from pydantic import BaseModel, Field
from workspaces import migrate_workspaces

DB_PATH = os.environ.get(
    "CALENDAR_DB",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "calendar.db"),
)
TIME_RE = r"^([01]\d|2[0-3]):[0-5]\d$"  # HH:MM
END_TIME_RE = r"^(([01]\d|2[0-3]):[0-5]\d|24:00)$"


# ───────────────────────── DB ─────────────────────────
def connect() -> sqlite3.Connection:
    # FastAPI may run dependency setup, endpoint and cleanup on different workers.
    # Each request still owns its own connection (get_conn closes it afterwards).
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_conn():
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()  # commit 하지 않은 변경은 자동으로 버려집니다


def init_db() -> None:
    """build.py 로 만든 DB 위에 사용자/대타/권한 요청 테이블을 추가합니다. 여러 번 실행해도 안전합니다."""
    conn = connect()
    try:
        has_calendar = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='calendar'"
        ).fetchone()
        if not has_calendar:
            raise RuntimeError("calendar 테이블이 없습니다. 먼저 `python build.py` 로 DB를 만드세요.")
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id   INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer','editor'))
            );
            INSERT OR IGNORE INTO users(id, name, role) VALUES (1, '홍길동', 'viewer');
            INSERT OR IGNORE INTO users(id, name, role) VALUES (2, '관리자', 'editor');

            CREATE TABLE IF NOT EXISTS substitute_requests (
              id            INTEGER PRIMARY KEY AUTOINCREMENT,
              event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
              requester_id  INTEGER NOT NULL REFERENCES users(id),
              substitute_id INTEGER REFERENCES users(id),
              reason        TEXT,
              status        TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','accepted','rejected','cancelled')),
              created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
              resolved_at   TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_sub_event ON substitute_requests(event_id);

            CREATE TABLE IF NOT EXISTS edit_permission_requests (
              id          INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id     INTEGER NOT NULL REFERENCES users(id),
              reason      TEXT,
              status      TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected')),
              created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
              resolved_at TEXT
            );
            """
        )
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(events)")}
        if "user_id" not in cols:  # 일정 담당자
            conn.execute("ALTER TABLE events ADD COLUMN user_id INTEGER REFERENCES users(id)")
        conn.commit()
        migrate_workspaces(conn)
    finally:
        conn.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="달력 API", version="1.0.0", lifespan=lifespan)


@app.get('/api/health')
def health(conn=Depends(get_conn)):
    conn.execute('SELECT 1 FROM calendar LIMIT 1').fetchone()
    return {'status': 'ok', 'mode': 'local-demo'}


# ───────────────────────── 의존성 ─────────────────────────
def current_user(
    x_user_id: int = Header(1, alias="X-User-Id", description="데모용 사용자 ID"),
    conn: sqlite3.Connection = Depends(get_conn),
):
    if os.environ.get("CALENDAR_DEMO_AUTH") != "1":
        raise HTTPException(503, "로컬 데모 인증이 꺼져 있습니다. 실제 서비스 인증을 연결하세요.")
    user = conn.execute("SELECT * FROM users WHERE id = ?", (x_user_id,)).fetchone()
    if not user:
        raise HTTPException(401, "알 수 없는 사용자입니다.")
    return user


def current_member(
    x_workspace_id: str = Header("cafe", alias="X-Workspace-Id"),
    user=Depends(current_user), conn=Depends(get_conn),
):
    member = conn.execute(
        "SELECT role FROM workspace_members WHERE workspace_id=? AND user_id=?",
        (x_workspace_id, user["id"]),
    ).fetchone()
    if not member:
        raise HTTPException(403, "이 워크스페이스에 접근할 수 없습니다.")
    return {**dict(user), "role": member["role"], "workspace_id": x_workspace_id}


def require_editor(user=Depends(current_member)):
    if user["role"] != "editor":
        raise HTTPException(403, "편집 권한이 필요합니다. 편집 권한을 요청해 주세요.")
    return user


def get_today() -> date:  # 테스트에서 덮어쓸 수 있도록 의존성으로 분리
    return date.today()


# ───────────────────────── 스키마 ─────────────────────────
class EventIn(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    location: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None  # 생략하면 start_date
    start_time: Optional[str] = Field(None, pattern=TIME_RE)
    end_time: Optional[str] = Field(None, pattern=END_TIME_RE)
    all_day: bool = False
    category_id: Optional[int] = None
    user_id: Optional[int] = None  # 담당자. 생략하면 요청한 사용자
    repeat_rule: Optional[Literal["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]] = None


class EventPatch(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[str] = Field(None, pattern=TIME_RE)
    end_time: Optional[str] = Field(None, pattern=END_TIME_RE)
    all_day: Optional[bool] = None
    category_id: Optional[int] = None
    user_id: Optional[int] = None
    repeat_rule: Optional[Literal["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]] = None


class ReasonIn(BaseModel):
    reason: Optional[str] = Field(None, max_length=200)


class SubstituteAction(BaseModel):
    action: Literal["accept", "reject", "cancel"]


class PermissionDecision(BaseModel):
    status: Literal["approved", "rejected"]


PATCH_COLS = [
    "title", "description", "location", "start_date", "end_date", "start_time",
    "end_time", "all_day", "category_id", "user_id", "repeat_rule",
]


# ───────────────────────── 헬퍼 ─────────────────────────
EVENT_SELECT = """
    SELECT e.*, c.name AS category_name, c.color AS category_color, u.name AS user_name
    FROM events e
    LEFT JOIN categories c ON c.id = e.category_id
    LEFT JOIN users u ON u.id = e.user_id
"""


def serialize_event(conn: sqlite3.Connection, r: sqlite3.Row) -> dict:
    last = conn.execute(
        "SELECT id, status, reason FROM substitute_requests WHERE event_id = ? ORDER BY id DESC LIMIT 1",
        (r["id"],),
    ).fetchone()
    return {
        "workspace_id": r["workspace_id"],
        "id": r["id"],
        "title": r["title"],
        "description": r["description"],
        "location": r["location"],
        "start_date": r["start_date"],
        "end_date": r["end_date"],
        "start_time": r["start_time"],
        "end_time": r["end_time"],
        "all_day": bool(r["all_day"]),
        "repeat_rule": r["repeat_rule"],
        "category": (
            {"id": r["category_id"], "name": r["category_name"], "color": r["category_color"]}
            if r["category_id"] else None
        ),
        "user": {"id": r["user_id"], "name": r["user_name"]} if r["user_id"] else None,
        "substitute_request": dict(last) if last else None,
    }


def get_event_row(conn: sqlite3.Connection, event_id: int, workspace_id: str) -> sqlite3.Row:
    row = conn.execute(EVENT_SELECT + " WHERE e.id = ? AND e.workspace_id = ?", (event_id, workspace_id)).fetchone()
    if not row:
        raise HTTPException(404, "일정을 찾을 수 없습니다.")
    return row


def validate_event(v: dict) -> None:
    if not v['title'].strip():
        raise HTTPException(422, '일정 제목을 입력하세요.')
    if v["end_date"] < v["start_date"]:
        raise HTTPException(422, "종료일은 시작일보다 빠를 수 없습니다.")
    if v["all_day"]:
        v["start_time"] = v["end_time"] = None
        return
    if not v["start_time"] or not v["end_time"]:
        raise HTTPException(422, "종일 일정이 아니면 시작/종료 시간이 필요합니다.")
    if v["end_date"] == v["start_date"] and v["end_time"] <= v["start_time"]:
        raise HTTPException(422, "종료 시간은 시작 시간보다 늦어야 합니다.")


def validate_assignee(conn, user_id, workspace_id):
    if user_id is not None and not conn.execute(
        'SELECT 1 FROM workspace_members WHERE workspace_id=? AND user_id=?',
        (workspace_id, user_id),
    ).fetchone():
        raise HTTPException(422, '워크스페이스에 소속된 근무자를 선택하세요.')


def month_exists(conn: sqlite3.Connection, year: int, month: int) -> bool:
    return conn.execute(
        "SELECT 1 FROM calendar WHERE year = ? AND month = ? LIMIT 1", (year, month)
    ).fetchone() is not None


def shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    idx = year * 12 + (month - 1) + delta
    return idx // 12, idx % 12 + 1


# ───────────────────────── 내 정보 / 카테고리 ─────────────────────────
@app.get('/api/identity', tags=['사용자'])
def identity(user=Depends(current_user)):
    return dict(user)


@app.get("/api/me", tags=["사용자"])
def me(user=Depends(current_member)):
    return {"id": user["id"], "name": user["name"], "role": user["role"], "can_edit": user["role"] == "editor"}


@app.get("/api/categories", tags=["달력"])
def categories(conn=Depends(get_conn)):
    return {"items": [dict(r) for r in conn.execute("SELECT id, name, color FROM categories ORDER BY id")]}


# ───────────────────────── 월간 달력 / 날짜 상세 ─────────────────────────
@app.get("/api/calendar", tags=["달력"], summary="월간 달력 (날짜별 일정 점 표시용)")
def month_view(
    year: int = Query(..., ge=1900, le=2200),
    month: int = Query(..., ge=1, le=12),
    mine: bool = Query(False, description="true면 내게 배정된 일정만 집계"),
    user=Depends(current_member),
    conn=Depends(get_conn),
):
    rows = conn.execute(
        """
        SELECT c.date, c.day, c.weekday, c.is_weekend, c.is_holiday, c.holiday_name,
               COUNT(e.id) AS event_count
        FROM calendar c
        LEFT JOIN events e
               ON e.start_date <= c.date AND e.end_date >= c.date
              AND (e.all_day=1 OR e.end_date > c.date OR e.end_time > '00:00')
              AND e.workspace_id = :workspace
              AND (:uid IS NULL OR e.user_id = :uid)
        WHERE c.year = :y AND c.month = :m
        GROUP BY c.date
        ORDER BY c.date
        """,
        {"uid": user["id"] if mine else None, "y": year, "m": month, "workspace": user["workspace_id"]},
    ).fetchall()
    if not rows:
        raise HTTPException(404, "달력 데이터가 없는 기간입니다.")

    def neighbor(delta: int):
        y, m = shift_month(year, month, delta)
        return {"year": y, "month": m} if month_exists(conn, y, m) else None

    return {
        "year": year,
        "month": month,
        "title": f"{year}년 {month}월",
        "first_weekday": rows[0]["weekday"],  # 0=월 … 6=일. 1일 앞의 빈 칸 수와 같음
        "prev": neighbor(-1),
        "next": neighbor(1),
        "days": [
            {
                "date": r["date"],
                "day": r["day"],
                "weekday": r["weekday"],
                "is_weekend": bool(r["is_weekend"]),
                "is_holiday": bool(r["is_holiday"]),
                "holiday_name": r["holiday_name"],
                "event_count": r["event_count"],
                "has_event": r["event_count"] > 0,
            }
            for r in rows
        ],
    }


@app.get("/api/calendar/days/{day}", tags=["달력"], summary="날짜 상세 (타임라인 + 대타 요청 가능 여부)")
def day_view(
    day: date,
    mine: bool = Query(False),
    user=Depends(current_member),
    conn=Depends(get_conn),
    today: date = Depends(get_today),
):
    cal = conn.execute("SELECT * FROM calendar WHERE date = ?", (day.isoformat(),)).fetchone()
    if not cal:
        raise HTTPException(404, "달력 데이터가 없는 날짜입니다.")
    sql = EVENT_SELECT + " WHERE e.start_date <= :d AND e.end_date >= :d AND e.workspace_id = :workspace AND (e.all_day=1 OR e.end_date > :d OR e.end_time > '00:00')"
    params: dict = {"d": day.isoformat(), "workspace": user["workspace_id"]}
    if mine:
        sql += " AND e.user_id = :uid"
        params["uid"] = user["id"]
    sql += " ORDER BY e.all_day DESC, e.start_time, e.id"

    events = []
    for r in conn.execute(sql, params).fetchall():
        ev = serialize_event(conn, r)
        pending = ev["substitute_request"] and ev["substitute_request"]["status"] == "pending"
        ev["can_request_substitute"] = bool(
            r["user_id"] == user["id"] and r["start_date"] >= today.isoformat() and not pending
        )
        events.append(ev)

    return {
        "date": cal["date"],
        "label": f"{day.month}월 {day.day}일 ({cal['weekday_kr']})",
        "is_holiday": bool(cal["is_holiday"]),
        "holiday_name": cal["holiday_name"],
        "events": events,
    }


# ───────────────────────── 일정 CRUD (편집 권한 필요) ─────────────────────────
@app.post("/api/events", status_code=201, tags=["일정"])
def create_event(body: EventIn, user=Depends(require_editor), conn=Depends(get_conn)):
    v = body.model_dump()
    v["start_date"] = body.start_date.isoformat()
    v["end_date"] = (body.end_date or body.start_date).isoformat()
    v["user_id"] = body.user_id or user["id"]
    v["workspace_id"] = user["workspace_id"]
    validate_assignee(conn, v["user_id"], user["workspace_id"])
    validate_event(v)
    v["all_day"] = int(v["all_day"])
    try:
        cur = conn.execute(
            """INSERT INTO events(title, description, location, start_date, end_date, start_time,
                                  end_time, all_day, category_id, user_id, repeat_rule, workspace_id)
               VALUES (:title, :description, :location, :start_date, :end_date, :start_time,
                       :end_time, :all_day, :category_id, :user_id, :repeat_rule, :workspace_id)""",
            v,
        )
    except sqlite3.IntegrityError:
        raise HTTPException(400, "날짜 범위, 카테고리, 담당자 값을 확인해 주세요.")
    conn.commit()
    return serialize_event(conn, get_event_row(conn, cur.lastrowid, user["workspace_id"]))


@app.get("/api/events/{event_id}", tags=["일정"])
def read_event(event_id: int, user=Depends(current_member), conn=Depends(get_conn)):
    return serialize_event(conn, get_event_row(conn, event_id, user["workspace_id"]))


@app.patch("/api/events/{event_id}", tags=["일정"])
def update_event(event_id: int, body: EventPatch, user=Depends(require_editor), conn=Depends(get_conn)):
    row = get_event_row(conn, event_id, user["workspace_id"])
    if not row:
        raise HTTPException(404, "일정을 찾을 수 없습니다.")
    v = dict(row)
    for key, val in body.model_dump(exclude_unset=True).items():
        if isinstance(val, date):
            val = val.isoformat()
        if val is None and key in ("title", "start_date", "end_date", "all_day"):
            continue  # 필수 값은 null 로 지울 수 없음
        v[key] = val
    validate_assignee(conn, v["user_id"], user["workspace_id"])
    v["all_day"] = bool(v["all_day"])
    validate_event(v)
    v["all_day"] = int(v["all_day"])
    sets = ", ".join(f"{c} = :{c}" for c in PATCH_COLS)
    try:
        conn.execute(f"UPDATE events SET {sets} WHERE id = :id", v)
    except sqlite3.IntegrityError:
        raise HTTPException(400, "날짜 범위, 카테고리, 담당자 값을 확인해 주세요.")
    conn.commit()
    return serialize_event(conn, get_event_row(conn, event_id, user["workspace_id"]))


@app.delete("/api/events/{event_id}", status_code=204, tags=["일정"])
def delete_event(event_id: int, user=Depends(require_editor), conn=Depends(get_conn)):
    cur = conn.execute("DELETE FROM events WHERE id = ? AND workspace_id = ?", (event_id, user["workspace_id"]))
    if cur.rowcount == 0:
        raise HTTPException(404, "일정을 찾을 수 없습니다.")
    conn.commit()
    return Response(status_code=204)


# ───────────────────────── 대타 요청 ─────────────────────────
@app.post("/api/events/{event_id}/substitute-requests", status_code=201, tags=["대타 요청"],
          summary="[대타 요청] 버튼")
def request_substitute(
    event_id: int,
    body: ReasonIn,
    user=Depends(current_member),
    conn=Depends(get_conn),
    today: date = Depends(get_today),
):
    ev = get_event_row(conn, event_id, user["workspace_id"])
    if ev["user_id"] != user["id"]:
        raise HTTPException(403, "본인에게 배정된 일정만 대타를 요청할 수 있습니다.")
    if ev["start_date"] < today.isoformat():
        raise HTTPException(400, "지난 일정은 대타를 요청할 수 없습니다.")
    conn.execute("BEGIN IMMEDIATE")
    if conn.execute(
        "SELECT 1 FROM substitute_requests WHERE event_id = ? AND status = 'pending'", (event_id,)
    ).fetchone():
        raise HTTPException(409, "이미 진행 중인 대타 요청이 있습니다.")
    cur = conn.execute(
        "INSERT INTO substitute_requests(event_id, requester_id, reason) VALUES (?, ?, ?)",
        (event_id, user["id"], body.reason),
    )
    conn.commit()
    return dict(conn.execute("SELECT * FROM substitute_requests WHERE id = ?", (cur.lastrowid,)).fetchone())


@app.get("/api/substitute-requests", tags=["대타 요청"], summary="대타 요청 목록 (동료가 수락할 대상)")
def list_substitute_requests(
    status: Optional[Literal["pending", "accepted", "rejected", "cancelled", "all"]] = "pending",
    mine: bool = Query(False, description="true면 내가 올린 요청만"),
    user=Depends(current_member),
    conn=Depends(get_conn),
):
    sql = """
        SELECT r.*, e.title, e.start_date, e.end_date, e.start_time, e.end_time, u.name AS requester_name
        FROM substitute_requests r
        JOIN events e ON e.id = r.event_id
        JOIN users u ON u.id = r.requester_id
        WHERE e.workspace_id = ?
    """
    params: list = [user["workspace_id"]]
    if status and status != 'all':
        sql += " AND r.status = ?"
        params.append(status)
    if mine:
        sql += " AND r.requester_id = ?"
        params.append(user["id"])
    sql += " ORDER BY e.start_date, e.start_time, r.id"
    return {"items": [dict(r) for r in conn.execute(sql, params)]}


@app.patch("/api/substitute-requests/{request_id}", tags=["대타 요청"],
           summary="수락(accept) / 거절(reject, 편집 권한) / 취소(cancel, 요청자)")
def act_on_substitute_request(
    request_id: int,
    body: SubstituteAction,
    user=Depends(current_member),
    conn=Depends(get_conn),
    today: date = Depends(get_today),
):
    conn.execute("BEGIN IMMEDIATE")
    req = conn.execute("SELECT * FROM substitute_requests WHERE id = ?", (request_id,)).fetchone()
    if not req:
        raise HTTPException(404, "대타 요청을 찾을 수 없습니다.")
    event = get_event_row(conn, req["event_id"], user["workspace_id"])
    if req["status"] != "pending":
        raise HTTPException(409, "이미 처리된 요청입니다.")

    if body.action == "cancel":
        if req["requester_id"] != user["id"]:
            raise HTTPException(403, "요청자만 취소할 수 있습니다.")
        conn.execute(
            "UPDATE substitute_requests SET status='cancelled', resolved_at=datetime('now','localtime') WHERE id=?",
            (request_id,),
        )
    elif body.action == "reject":
        if user["role"] != "editor":
            raise HTTPException(403, "거절은 편집 권한이 필요합니다.")
        conn.execute(
            "UPDATE substitute_requests SET status='rejected', resolved_at=datetime('now','localtime') WHERE id=?",
            (request_id,),
        )
    else:  # accept: 근무를 수락한 사람에게 일정이 넘어감
        if event['start_date'] < today.isoformat():
            raise HTTPException(400, '지난 일정은 수락할 수 없습니다.')
        if event['user_id'] != req['requester_id']:
            raise HTTPException(409, '담당자가 변경된 요청입니다.')
        if req["requester_id"] == user["id"]:
            raise HTTPException(403, "본인의 요청은 수락할 수 없습니다.")
        conn.execute(
            """UPDATE substitute_requests
               SET status='accepted', substitute_id=?, resolved_at=datetime('now','localtime') WHERE id=?""",
            (user["id"], request_id),
        )
        conn.execute("UPDATE events SET user_id = ? WHERE id = ?", (user["id"], req["event_id"]))
    conn.commit()
    return dict(conn.execute("SELECT * FROM substitute_requests WHERE id = ?", (request_id,)).fetchone())


# ───────────────────────── 편집 권한 요청 ─────────────────────────
@app.post("/api/edit-permission-requests", status_code=201, tags=["편집 권한"],
          summary="[편집 권한 요청] 버튼")
def request_edit_permission(body: ReasonIn, user=Depends(current_member), conn=Depends(get_conn)):
    if user["role"] == "editor":
        raise HTTPException(409, "이미 편집 권한이 있습니다.")
    if conn.execute(
        "SELECT 1 FROM edit_permission_requests WHERE user_id = ? AND workspace_id = ? AND status = 'pending'", (user["id"], user["workspace_id"])
    ).fetchone():
        raise HTTPException(409, "이미 승인 대기 중인 요청이 있습니다.")
    cur = conn.execute(
        "INSERT INTO edit_permission_requests(user_id, reason, workspace_id) VALUES (?, ?, ?)", (user["id"], body.reason, user["workspace_id"])
    )
    conn.commit()
    return dict(conn.execute("SELECT * FROM edit_permission_requests WHERE id = ?", (cur.lastrowid,)).fetchone())


@app.get("/api/edit-permission-requests", tags=["편집 권한"],
         summary="편집 권한 요청 목록 (편집자는 전체, 그 외는 본인 것만)")
def list_edit_permission_requests(
    status: Optional[Literal["pending", "approved", "rejected"]] = None,
    user=Depends(current_member),
    conn=Depends(get_conn),
):
    sql = """SELECT r.*, u.name AS user_name FROM edit_permission_requests r
             JOIN users u ON u.id = r.user_id WHERE r.workspace_id = ?"""
    params: list = [user["workspace_id"]]
    if user["role"] != "editor":
        sql += " AND r.user_id = ?"
        params.append(user["id"])
    if status:
        sql += " AND r.status = ?"
        params.append(status)
    sql += " ORDER BY r.id DESC"
    return {"items": [dict(r) for r in conn.execute(sql, params)]}


@app.patch("/api/edit-permission-requests/{request_id}", tags=["편집 권한"], summary="승인/거절 (편집자 전용)")
def decide_edit_permission(
    request_id: int,
    body: PermissionDecision,
    user=Depends(require_editor),
    conn=Depends(get_conn),
):
    req = conn.execute("SELECT * FROM edit_permission_requests WHERE id = ? AND workspace_id = ?", (request_id, user["workspace_id"])).fetchone()
    if not req:
        raise HTTPException(404, "요청을 찾을 수 없습니다.")
    if req["status"] != "pending":
        raise HTTPException(409, "이미 처리된 요청입니다.")
    conn.execute(
        "UPDATE edit_permission_requests SET status = ?, resolved_at = datetime('now','localtime') WHERE id = ?",
        (body.status, request_id),
    )
    if body.status == "approved":
        conn.execute("UPDATE workspace_members SET role = 'editor' WHERE user_id = ? AND workspace_id = ?", (req["user_id"], user["workspace_id"]))
    conn.commit()
    return dict(conn.execute("SELECT * FROM edit_permission_requests WHERE id = ? AND workspace_id = ?", (request_id, user["workspace_id"])).fetchone())


# React workspace routes use the original API contract plus this scope header.
class WorkspaceIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: str = Field('', max_length=50)
    description: str = Field('', max_length=500)


def workspace_payload(row):
    return {**dict(row), 'role': '관리자' if row['role'] == 'editor' else '근무자',
            'scheduleSummary': '달력에서 근무 일정을 확인하세요.'}


@app.get('/api/workspaces')
def list_workspaces(user=Depends(current_user), conn=Depends(get_conn)):
    rows = conn.execute('''SELECT w.*, m.role,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id=w.id) AS memberCount
        FROM workspaces w JOIN workspace_members m ON m.workspace_id=w.id
        WHERE m.user_id=? ORDER BY w.rowid''', (user['id'],)).fetchall()
    return {'items': [workspace_payload(r) for r in rows]}


@app.post('/api/workspaces', status_code=201)
def create_workspace(body: WorkspaceIn, user=Depends(current_user), conn=Depends(get_conn)):
    if not body.name.strip():
        raise HTTPException(422, '워크스페이스 이름을 입력하세요.')
    wid = uuid.uuid4().hex
    conn.execute('INSERT INTO workspaces(id,name,description,type) VALUES (?,?,?,?)',
                 (wid, body.name.strip(), body.description, body.type))
    conn.execute("INSERT INTO workspace_members VALUES (?,?,'editor')", (wid, user['id']))
    conn.commit()
    return {'id': wid, 'name': body.name.strip(), 'description': body.description, 'type': body.type,
            'role': '관리자', 'memberCount': 1, 'scheduleSummary': '등록된 근무 없음'}


@app.get('/api/members')
def list_members(user=Depends(current_member), conn=Depends(get_conn)):
    rows = conn.execute('''SELECT u.id, u.name, m.role FROM users u
        JOIN workspace_members m ON m.user_id=u.id WHERE m.workspace_id=? ORDER BY u.id''',
        (user['workspace_id'],)).fetchall()
    return {'items': [dict(r) for r in rows]}


class StaffingRule(BaseModel):
    days: list[Literal['월', '화', '수', '목', '금', '토', '일']] = Field(min_length=1, max_length=7)
    start: str = Field(pattern=TIME_RE)
    end: str = Field(pattern=r'^(([01]\d|2[0-3]):[0-5]\d|24:00)$')
    min: int = Field(ge=1, le=100)


class StaffingRulesIn(BaseModel):
    items: list[StaffingRule] = Field(max_length=100)


@app.get('/api/staffing-rules')
def list_staffing_rules(user=Depends(current_member), conn=Depends(get_conn)):
    rows = conn.execute('SELECT * FROM staffing_rules WHERE workspace_id=? ORDER BY id',
                        (user['workspace_id'],)).fetchall()
    return {'items': [{**dict(r), 'days': json.loads(r['days'])} for r in rows]}


@app.put('/api/staffing-rules')
def save_staffing_rules(body: StaffingRulesIn, user=Depends(require_editor), conn=Depends(get_conn)):
    for rule in body.items:
        if rule.end <= rule.start or len(set(rule.days)) != len(rule.days):
            raise HTTPException(422, '중복 요일과 시작·종료 시간을 확인하세요.')
    with conn:
        conn.execute('DELETE FROM staffing_rules WHERE workspace_id=?', (user['workspace_id'],))
        conn.executemany('INSERT INTO staffing_rules(workspace_id,days,start,end,min) VALUES (?,?,?,?,?)',
            [(user['workspace_id'], json.dumps(r.days), r.start, r.end, r.min) for r in body.items])
    return list_staffing_rules(user, conn)


class AssignmentsIn(BaseModel):
    date: date
    start: str = Field(pattern=TIME_RE)
    end: str = Field(pattern=END_TIME_RE)
    user_ids: list[int] = Field(min_length=1, max_length=100)
    title: str = Field('근무', min_length=1, max_length=100)


@app.post('/api/assignments', status_code=201)
def add_assignments(body: AssignmentsIn, user=Depends(require_editor), conn=Depends(get_conn)):
    if body.end <= body.start or not body.title.strip():
        raise HTTPException(422, '제목과 시작·종료 시간을 확인하세요.')
    if not conn.execute('SELECT 1 FROM calendar WHERE date=?', (body.date.isoformat(),)).fetchone():
        raise HTTPException(422, '달력 데이터가 없는 날짜입니다.')
    ids = list(dict.fromkeys(body.user_ids))
    for uid in ids:
        validate_assignee(conn, uid, user['workspace_id'])
    created = []
    with conn:
        conn.execute('BEGIN IMMEDIATE')
        for uid in ids:
            conflict = conn.execute('''SELECT 1 FROM events WHERE workspace_id=? AND user_id=?
                AND start_date <= ? AND end_date >= ?
                AND (all_day=1 OR
                    ((start_date < ? OR start_time < ?) AND (end_date > ? OR end_time > ?)))''',
                (user['workspace_id'], uid, str(body.date), str(body.date), str(body.date), body.end,
                 str(body.date), body.start)).fetchone()
            if conflict:
                raise HTTPException(409, '선택한 근무자에게 겹치는 일정이 있습니다.')
        category = conn.execute("SELECT id FROM categories WHERE name='근무'").fetchone()
        if not category:
            cid = conn.execute("INSERT INTO categories(name,color) VALUES ('근무','#5BB5F0')").lastrowid
        else:
            cid = category['id']
        for uid in ids:
            eid = conn.execute('''INSERT INTO events(title,start_date,end_date,start_time,end_time,
                all_day,category_id,user_id,workspace_id) VALUES (?,?,?,?,?,0,?,?,?)''',
                (body.title.strip(), str(body.date), str(body.date), body.start, body.end,
                 cid, uid, user['workspace_id'])).lastrowid
            created.append(eid)
    return {'items': [serialize_event(conn, get_event_row(conn, eid, user['workspace_id'])) for eid in created]}
