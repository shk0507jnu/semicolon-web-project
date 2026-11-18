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

### 공지 파서 임시 연결 (2026-11-18)

관리자 계정의 플로팅 채팅에서 **공지로 보내기 → 분석 결과 확인 → 달력에 추가** 순서로 사용한다.
`홍길동 11월 29일 13시~15시 근무` 같은 명시적인 시간 일정은 로컬 규칙 파서로 분석한다. 여러 일정은 한 줄에 한 명씩 적는다.
생략한 연·월은 화면에 표시한 기준일을 사용한다. 해당 채팅방의 달력 화면에서는 선택 날짜, 다른 화면에서는 오늘이 기준일이다.

`shiftoptbackend_11_18.zip`의 `llm_parser.py`를 `notice_llm.py`로 가져왔다. 모델·프롬프트는 유지하고, 서버 `.env` 경로·30초 제한·횟수의 정수 검증을 추가했다.
휴가·선호·제외·최대/최소 횟수 분석은 서버 환경 변수 또는 로컬 `backend/calendar_api/.env`에 `GOOGLE_API_KEY`를 설정한 후 백엔드를 재시작하면 활성화된다. ENV 파일은 커밋하지 않으며, 키를 프런트엔드에 넣지 않는다.
Gemini의 날짜 생략·월 경계 추론은 원본 파서 동작을 따른다. 시간 일정 파서는 단일 날짜만 지원하며 자정 넘는 근무는 날짜별로 나눠 입력한다.

시간 근무와 종일 휴가는 확인 후 달력에 저장한다. 선호·제외·횟수 조건은 **결과 확인만** 지원하고 최적화 엔진/`shiftopt.db`에는 저장하지 않는다.
기존 일정 변경·취소, 반차는 직접 달력에서 처리한다. 직원 이름이 없거나 동명이인이면 자동 추측하지 않는다.
서버의 `notice_parser_drafts`에 미리보기 결과를 보관하고, 소유자·워크스페이스·충돌을 재확인해 한 번만 저장한다. 미저장 결과의 유효 시간은 1시간이다.
일반 채팅 및 공지 목록 동기화는 여전히 미연동이며, 채팅 말풍선은 새로고침하면 사라진다. 확인해서 저장한 달력 일정은 DB에 유지된다.

### 기존 API 범위

- 달력 범위는 원본과 같은 2026–2030년이다. 공휴일은 원본 예시값이며 최신 공식 휴일 자료와의 동기화는 별도 작업이다.
- `repeat_rule`은 원본처럼 저장만 한다. 반복 일정 자동 전개는 아직 없다.
- 급여·공지 API는 미연동이다. DB 모드에서는 급여와 공지를 각각 별도 카드로 표시하고, 금액·목록은 연결 준비 상태로 안내한다. 예시 데이터를 실제 DB 데이터처럼 표시하지 않는다.
- 홈의 급여 카드에서 16 이번 달 급여(`/w/:workspaceId/payroll`)와 18 월별 내역(`/w/:workspaceId/payroll/history`)으로, 공지 카드에서 13 공지 목록(`/w/:workspaceId/notices`)으로 이동한다. 월별 내역의 연도와 월 상세 선택은 URL에 유지된다.
- `VITE_DATA_SOURCE=mock`으로 실행하면 피그마 화면 확인용 예시 급여·공지를 볼 수 있다. 예시 날짜는 기존 달력과 같은 2026년 9월이며, 카페 워크스페이스에만 표시한다.
- 실제 로그인·회원가입·초대·연락처/시급 수정은 미연동이다. 해당 화면은 예시임을 표시한다.
- 자동 배치 최적화 제약조건은 `shiftopt.db`와의 명시적 직원 ID 매핑이 필요하다. 종일 휴가의 달력 표시는 가능하지만 최적화 DB는 합치지 않았다.
- DB 명세 비교: [notion-db-compatibility.md](../../docs/notion-db-compatibility.md)

## 검증

저장소 루트:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/calendar_api -q
cd frontend
node --test src/utils/calendarModel.test.mjs src/utils/payrollModel.test.mjs
npm run build -- --configLoader native
```

테스트는 임시 DB를 새로 만들며 실행 중인 `calendar.db`를 변경하지 않는다.
18개 API 테스트: 기존 기능, 워크스페이스 격리, 권한, 저장 지속성, 일괄 저장 실패 시 롤백, 동시 요청, 자정 경계 등.
11개 프런트 테스트: 달력 변환 5개와 급여 집계·지급 완료 합계·연도 필터·DB/워크스페이스 격리·야간 시간·월 URL 검증 6개.

참고한 공식 문서: [FastAPI SQL 데이터베이스](https://fastapi.tiangolo.com/tutorial/sql-databases/), [Vite 프록시](https://vite.dev/config/server-options#server-proxy).
