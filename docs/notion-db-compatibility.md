# 노션 DB 명세 적용 결과

참조: [정지운 · 백엔드 DB](https://app.notion.com/p/3dd91152e1e180fb99c6f47003c51220)
확인일: 2026-11-07. 첨부 `shiftopt.db`와 `calendar_api.zip`을 읽고 비교했다.

## 결론

달력 DB는 기존 React의 월간 달력/날짜 상세/대타 기능에 적용 가능해 로컬 연결을 완료했다.
최적화 DB는 달력 DB와 사용자/워크스페이스 키가 공유되지 않아 그대로 합칠 수 없다.
원본 첨부파일은 보존하고 별도 작업 브랜치의 DB 복사본만 사용했다.

| 자료 | 실제 테이블/필드 | 기존 React와의 대응 | 처리 |
|---|---|---|---|
| calendar.db | calendar: date, year, month, weekday, 공휴일 | 월간 달력 | 실제 API 조회, 월→일 요일 인덱스 변환 |
| calendar.db | events: id, start/end_date, start/end_time, all_day | 날짜별 근무, 24시간 막대 | 여러 일정/야간/종일을 구분해 연결 |
| calendar.db | users / events.user_id | 담당자, 내 일정 | 숫자 ID로 연결; 이름 비교 제거 |
| calendar.db | substitute_requests | 대타 요청 | 등록·수락·취소 후 DB 담당자 변경 |
| calendar.db | edit_permission_requests | 편집 권한 | 요청과 승인 API 유지, 그룹 단위 권한으로 제한 |
| 신규 확장 | workspaces / workspace_members / events.workspace_id | 워크스페이스 선택 | 기존 cafe 매핑 및 다른 그룹 데이터 격리 |
| 신규 확장 | staffing_rules: workspace_id, days, start, end, min | 최소 인원 설정 | DB 저장 및 시간대별 동시 인원 계산 |
| shiftopt.db | department / employee | 워크스페이스 / 멤버 | 개념은 대응하나 동일 ID가 아님. 아직 미연결 |
| shiftopt.db | employee_leave | 휴가 | 휴가 UI·API 및 사용자 매핑 추가 필요 |
| shiftopt.db | employee_constraint | 자동 배치 제약 | 근무 종류와 실제 시간대의 매핑 추가 필요 |

## shiftopt.db에서 확인한 실제 스키마

모든 도메인 테이블의 행 수는 0이었다. 외래키/열만 정의된 빈 DB이다.

- `department(department_id PK, name UNIQUE)`
- `employee(employee_id PK, name, department_id FK)`
- `employee_leave(leave_id PK, employee_id FK, start_date, end_date)`
- `employee_constraint(constraint_id PK, employee_id FK nullable, constraint_type, shift_type, start_date, end_date, value)`

노션 표의 제약 종류: LEAVE, FORBIDDEN_SHIFT, PREFERRED_SHIFT, MAX_SHIFT, MIN_SHIFT, MIN_STAFF, MAX_CONSECUTIVE, MIN_REST.
이름만 같다는 이유로 `employee_id`를 달력 `users.id`에 연결할 수는 없다.
또한 MIN_STAFF는 원본에서 `shift_type`/`value`만 표현하고, 현재 React는 요일/시작시간/종료시간/인원을 사용한다.
따라서 이번 최소 인원 연결은 달력 DB의 `staffing_rules` 확장으로 구현했고 최적화 DB에 쓰지 않았다.

향후 최적화 통합 시 필요한 항목:

1. employee ↔ user + workspace_members를 연결하는 명시적 매핑.
2. department ↔ workspace 연결 및 전역 제약의 워크스페이스 범위.
3. shift_type ↔ 실제 시작/종료시간 및 요일 정의.
4. 휴가/선호/금지/연속근무 제약을 읽는 최적화 API와 결과를 events에 저장하는 계약.
5. 실제 로그인 인증 및 관리자 권한 검증.

## 검증된 로컬 예시

원본 DB 복사본에 `[연동 확인] 오후 근무`(2026-11-08 14:00–22:00)를 브라우저에서 저장했다.
새로고침 후 유지됐고 일요일 최소 2명 규칙 대비 1명 부족이 표시됐다.
홍길동 계정으로 대타를 요청하고 관리자 계정으로 수락한 뒤, 달력 담당자가 관리자로 바뀐 것을 확인했다.
이 데이터는 로컬 시연용이며 원본 노션 DB나 운영 서버에는 전송되지 않았다.
