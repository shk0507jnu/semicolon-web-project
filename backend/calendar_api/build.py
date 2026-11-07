import sqlite3, datetime as dt
import os
from pathlib import Path

DB = os.environ.get("CALENDAR_DB", str(Path(__file__).with_name("calendar.db")))
if Path(DB).exists():
    raise SystemExit("기존 DB를 보존했습니다. 새 DB는 CALENDAR_DB에 새 경로를 지정하세요.")
con = sqlite3.connect(DB)
cur = con.cursor()
cur.executescript("""
PRAGMA foreign_keys = ON;

CREATE TABLE calendar (
  date        TEXT PRIMARY KEY,          -- YYYY-MM-DD
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  day         INTEGER NOT NULL,
  weekday     INTEGER NOT NULL,          -- 0=월 ... 6=일
  weekday_kr  TEXT NOT NULL,
  iso_week    INTEGER NOT NULL,
  quarter     INTEGER NOT NULL,
  is_weekend  INTEGER NOT NULL,
  is_holiday  INTEGER NOT NULL DEFAULT 0,
  holiday_name TEXT
);

CREATE TABLE categories (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#4F8EF7'
);

CREATE TABLE events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  description  TEXT,
  location     TEXT,
  start_date   TEXT NOT NULL REFERENCES calendar(date),
  end_date     TEXT NOT NULL REFERENCES calendar(date),
  start_time   TEXT,                     -- HH:MM (NULL이면 종일)
  end_time     TEXT,
  all_day      INTEGER NOT NULL DEFAULT 0,
  category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  repeat_rule  TEXT,                     -- 예: DAILY / WEEKLY / MONTHLY / YEARLY
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  CHECK (end_date >= start_date)
);
CREATE INDEX idx_events_start ON events(start_date);
CREATE INDEX idx_events_category ON events(category_id);
""")

# 고정 공휴일 (양력)
fixed = {
 (1,1):"신정",(3,1):"삼일절",(5,5):"어린이날",(6,6):"현충일",
 (8,15):"광복절",(10,3):"개천절",(10,9):"한글날",(12,25):"성탄절",
}
# 음력 기반/대체공휴일 등 (2026~2030 주요 날짜)
variable = {
 "2026-02-16":"설날 연휴","2026-02-17":"설날","2026-02-18":"설날 연휴",
 "2026-05-24":"부처님오신날","2026-05-25":"대체공휴일(부처님오신날)",
 "2026-08-17":"대체공휴일(광복절)",
 "2026-09-24":"추석 연휴","2026-09-25":"추석","2026-09-26":"추석 연휴",
 "2026-10-05":"대체공휴일(개천절)",
 "2027-02-06":"설날 연휴","2027-02-07":"설날","2027-02-08":"설날 연휴","2027-02-09":"대체공휴일(설날)",
 "2027-05-13":"부처님오신날",
 "2027-09-14":"추석 연휴","2027-09-15":"추석","2027-09-16":"추석 연휴",
 "2028-01-26":"설날 연휴","2028-01-27":"설날","2028-01-28":"설날 연휴",
 "2028-05-02":"부처님오신날",
 "2028-10-02":"추석 연휴","2028-10-03":"개천절·추석 연휴","2028-10-04":"추석",
 "2029-02-12":"설날 연휴","2029-02-13":"설날","2029-02-14":"설날 연휴",
 "2029-05-20":"부처님오신날",
 "2029-09-21":"추석 연휴","2029-09-22":"추석","2029-09-23":"추석 연휴",
 "2030-02-02":"설날 연휴","2030-02-03":"설날","2030-02-04":"설날 연휴",
 "2030-05-09":"부처님오신날",
 "2030-09-11":"추석 연휴","2030-09-12":"추석","2030-09-13":"추석 연휴",
}
kr = ["월","화","수","목","금","토","일"]
rows=[]
d = dt.date(2026,1,1)
while d <= dt.date(2030,12,31):
    s = d.isoformat()
    name = variable.get(s) or fixed.get((d.month,d.day))
    rows.append((s,d.year,d.month,d.day,d.weekday(),kr[d.weekday()],
                 d.isocalendar()[1],(d.month-1)//3+1,
                 1 if d.weekday()>=5 else 0, 1 if name else 0, name))
    d += dt.timedelta(days=1)
cur.executemany("INSERT INTO calendar VALUES (?,?,?,?,?,?,?,?,?,?,?)", rows)

cur.executemany("INSERT INTO categories(name,color) VALUES (?,?)",
  [("업무","#4F8EF7"),("개인","#34C759"),("약속","#FF9500"),("기념일","#FF2D55"),("공부","#AF52DE")])

cur.executemany("""INSERT INTO events(title,description,location,start_date,end_date,start_time,end_time,all_day,category_id,repeat_rule)
VALUES (?,?,?,?,?,?,?,?,?,?)""", [
 ("주간 회의","팀 주간 진행상황 공유","회의실 A","2026-11-09","2026-11-09","10:00","11:00",0,1,"WEEKLY"),
 ("친구 저녁 약속",None,"광주 상무지구","2026-11-07","2026-11-07","18:30","20:30",0,3,None),
 ("생일 (예시)","샘플 기념일",None,"2026-12-01","2026-12-01",None,None,1,4,"YEARLY"),
])
con.commit()

# 검증
print("calendar rows:", cur.execute("SELECT COUNT(*) FROM calendar").fetchone()[0])
print("holidays 2026:", cur.execute("SELECT COUNT(*) FROM calendar WHERE year=2026 AND is_holiday=1").fetchone()[0])
print(cur.execute("SELECT date,weekday_kr,holiday_name FROM calendar WHERE date='2026-11-03'").fetchone())
print(cur.execute("""SELECT e.start_date,e.title,c.name FROM events e JOIN categories c ON c.id=e.category_id ORDER BY e.start_date""").fetchall())
con.close()
