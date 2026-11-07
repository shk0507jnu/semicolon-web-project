"""시안(2026년 9월)과 같은 날짜에 점이 찍히도록 데모 근무 일정을 넣습니다. 여러 번 실행해도 안전합니다.

사용: python seed_demo.py
"""
from main import connect, init_db

DOT_DAYS = [2, 4, 5, 9, 10, 11, 12, 14, 15, 17, 18, 22, 24, 25, 26, 28, 29, 30]
SHIFTS = [("09:00", "18:00"), ("10:00", "19:00"), ("13:00", "22:00")]


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
    print(f"데모 일정 {seed(conn)}건 추가 완료")
    conn.close()
