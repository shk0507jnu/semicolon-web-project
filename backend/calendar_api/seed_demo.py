"""시안(2026년 9월)과 같은 날짜에 점이 찍히도록 데모 근무 일정을 넣습니다. 여러 번 실행해도 안전합니다.

사용: python seed_demo.py
"""
from main import connect, init_db

DOT_DAYS = [2, 4, 5, 9, 10, 11, 12, 14, 15, 17, 18, 22, 24, 25, 26, 28, 29, 30]
SHIFTS = [("09:00", "18:00"), ("10:00", "19:00"), ("13:00", "22:00")]


def seed_members(conn):
    """Update the two legacy demo identities, preserving IDs and existing events.

    Only explicitly invoked by setup_local --demo; never rename real/custom users
    during app startup or remove any existing member.
    """
    for user_id, old, new in [(1, '홍길동', '김수진'), (2, '관리자', '이민수')]:
        conn.execute('UPDATE users SET name=? WHERE id=? AND name=?', (new, user_id, old))
    for name in ('박서연', '정우진'):
        row = conn.execute('SELECT id FROM users WHERE name=? ORDER BY id', (name,)).fetchone()
        uid = row['id'] if row else conn.execute("INSERT INTO users(name,role) VALUES (?,'viewer')", (name,)).lastrowid
        conn.execute("INSERT OR IGNORE INTO workspace_members(workspace_id,user_id,role) VALUES ('cafe',?,'viewer')", (uid,))
    if not conn.execute("SELECT 1 FROM staffing_rules WHERE workspace_id='cafe'").fetchone():
        conn.execute('''INSERT INTO staffing_rules(workspace_id,days,start,end,min)
            VALUES ('cafe','["월","화","수","목","금","토","일"]','14:00','22:00',2)''')
    conn.commit()
    return [dict(r) for r in conn.execute('''SELECT u.id,u.name,m.role FROM users u
        JOIN workspace_members m ON m.user_id=u.id WHERE m.workspace_id='cafe' ORDER BY u.id''')]


def seed(conn) -> int:
    row = conn.execute("SELECT id FROM categories WHERE name = '근무'").fetchone()
    if row:
        category_id = row["id"]
    else:
        category_id = conn.execute(
            "INSERT INTO categories(name, color) VALUES ('근무', '#5BB5F0')"
        ).lastrowid

    added = 0
    for i, day in enumerate(DOT_DAYS):
        start, end = ("09:00", "18:00") if day == 9 else SHIFTS[i % len(SHIFTS)]
        date_str = f"2026-09-{day:02d}"
        if conn.execute("SELECT 1 FROM events WHERE description='[demo]' AND start_date=? AND workspace_id='cafe'", (date_str,)).fetchone():
            continue
        conn.execute(
            """INSERT INTO events(title, description, start_date, end_date, start_time, end_time,
                                  all_day, category_id, user_id, workspace_id)
               VALUES ('근무', '[demo]', ?, ?, ?, ?, 0, ?, 1, 'cafe')""",
            (date_str, date_str, start, end, category_id),
        )
        added += 1
    conn.commit()
    return added


if __name__ == "__main__":
    init_db()
    conn = connect()
    seed_members(conn)
    print(f"데모 일정 {seed(conn)}건 추가 완료")
    conn.close()
