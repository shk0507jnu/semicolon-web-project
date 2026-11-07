# 시프트링크 로컬 달력 API

노션 정지운 페이지의 `calendar_api.zip`(2026-11-03)을 기반으로 React에 연결했다.
원본 API와 SQLite 구조를 유지하면서 워크스페이스 범위, 최소 인원 규칙, 일괄 근무 배치를 추가했다.
DB 파일은 Git에 올리지 않는다. 기존 DB를 사용할 때는 복사본을 `calendar.db`로 두거나 `CALENDAR_DB`에 복사본 경로를 지정한다.

## 최초 준비 (저장소 루트, PowerShell)

Python 3.10 이상과 Node.js/Vite 호환 버전이 필요하다.

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/calendar_api/requirements.txt
.\.venv\Scripts\python.exe backend/calendar_api/setup_local.py --demo
Copy-Item frontend/.env.example frontend/.env.local
cd frontend
npm install
```

`setup_local.py`는 DB가 없을 때만 만들고, 기존 DB에는 테이블/열을 추가한다.
`--demo`는 누락된 2026년 9월 예시 근무만 추가한다. 기존 근무를 지우거나 덮어쓰지 않는다.
`build.py`를 직접 실행해도 기존 DB가 있으면 중단한다.

## 실행 (터미널 2개)

저장소 루트의 첫 번째 터미널:

```powershell
$env:CALENDAR_DEMO_AUTH='1'
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend/calendar_api --host 127.0.0.1 --port 8000
```

두 번째 터미널:

```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173 --configLoader native
```

- 화면: http://127.0.0.1:5173/workspaces
- 예시 달력: http://127.0.0.1:5173/w/cafe/calendar?date=2026-09-09
- Swagger: http://127.0.0.1:8000/docs
- 종료: 각 터미널에서 Ctrl+C
- 백엔드 포트를 바꾸면 `frontend/.env.local`의 `CALENDAR_API_TARGET`도 변경한다.

상단의 **로컬 데모 계정** 선택기로 관리자(2) / 홍길동 근무자(1)를 전환한다.
이는 원본 API의 `X-User-Id` 시연 방식이다. 실제 로그인 인증이 아니므로 외부에 배포할 때 JWT/세션 인증으로 교체해야 한다.
`CALENDAR_DEMO_AUTH=1`을 설정하지 않으면 사용자 API는 503으로 차단된다.
Vite의 `/api` 프록시를 사용하므로 개발용 전체 허용 CORS 설정은 필요하지 않다.

## 연결된 기능

- 워크스페이스 목록/생성, 소속 멤버 조회
- 월간 일정 점, 이전/다음 달, 월 선택, 전체/내 일정
- 날짜 상세, 여러 일정, 종일 일정, 자정 넘는 일정의 날짜별 0–24시 막대
- 여러 근무자 배치의 트랜잭션 저장, 일정 수정, 중복 배치 검증
- 요일/시간대별 최소 인원 규칙 저장, 동시 근무자 수 기준 부족 인원 계산
- 대타 요청/목록/수락/취소와 담당자 변경
- 편집 권한 요청 (승인 API는 Swagger에서 관리자 계정으로 호출 가능)

`X-Workspace-Id` 헤더(기본 `cafe`)로 범위를 전달한다. 서버가 소속 여부와 편집 권한을 검사한다.
기존 원본 일정은 최초 마이그레이션에서만 `cafe`에 연결한다. 새 워크스페이스에는 다른 그룹 일정이 표시되지 않는다.

## 원본과의 차이 및 남은 범위

- 달력 범위는 원본과 같은 2026–2030년이다. 공휴일은 원본 예시값이며 최신 공식 휴일 자료와의 동기화는 별도 작업이다.
- `repeat_rule`은 원본처럼 저장만 한다. 반복 일정 자동 전개는 아직 없다.
- 급여·공지·실제 로그인·회원가입·초대·연락처/시급 수정은 미연동이다. 해당 화면은 예시임을 표시한다.
- 자동 배치 최적화/휴가 제약조건은 `shiftopt.db`와의 명시적 직원 ID 매핑이 필요하다. 이번 작업에서 그 DB를 임의로 합치지 않았다.
- DB 명세 비교: [notion-db-compatibility.md](../../docs/notion-db-compatibility.md)

## 검증

저장소 루트:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/calendar_api -q
cd frontend
node --test src/utils/calendarModel.test.mjs
npm run build -- --configLoader native
```

테스트는 임시 DB를 새로 만들며 실행 중인 `calendar.db`를 변경하지 않는다.
18개 API 테스트: 기존 기능, 워크스페이스 격리, 권한, 저장 지속성, 일괄 저장 실패 시 롤백, 동시 요청, 자정 경계 등.
5개 프런트 변환 테스트: 요일 시작, 야간/종일 일정, 날짜 경계, 중복 근무자, 시간대 중간 인원 공백.

참고한 공식 문서: [FastAPI SQL 데이터베이스](https://fastapi.tiangolo.com/tutorial/sql-databases/), [Vite 프록시](https://vite.dev/config/server-options#server-proxy).
