import { CalendarIcon, CheckIcon } from '../common/Icons';

const LABELS = { SHIFT: '근무', LEAVE: '휴가', FORBIDDEN_SHIFT: '근무 제외', PREFERRED_SHIFT: '근무 선호', MAX_SHIFT: '최대 근무 횟수', MIN_SHIFT: '최소 근무 횟수' };
const SHIFTS = { DAY: '주간', EVENING: '저녁', NIGHT: '야간' };
const BUTTON = 'min-h-11 w-full rounded-xl px-3 py-2 text-sm font-medium transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darkblue disabled:cursor-not-allowed disabled:opacity-50';

export default function ParsedNoticeCard({ parser, workspaceName, onRetry, onEdit, onConfirm, onOpenCalendar }) {
  const { status, result, error } = parser;
  const busy = status === 'loading' || status === 'saving';
  const saved = status === 'saved';
  const title = status === 'loading' ? '공지 내용을 분석하고 있어요'
    : saved ? '달력에 추가했어요' : error || result?.errors?.length ? '내용을 확인해 주세요'
      : result?.calendar_count ? `일정 ${result.calendar_count}건을 찾았어요` : '근무 조건을 추출했어요';
  const firstDate = result?.items.find(item => item.calendar_eligible)?.start_date;

  return (
    <section aria-label="공지 분석 결과" aria-busy={busy} className={`flex min-w-0 flex-col gap-3 rounded-2xl border border-line p-3 ${saved ? 'bg-success-bg' : 'bg-primary-soft'}`}>
      <p className="flex items-start gap-2 text-sm font-bold text-darkblue">
        {saved ? <CheckIcon size={18} className="shrink-0" /> : <CalendarIcon size={18} className="shrink-0" />}
        <span>{title}</span>
      </p>
      <p className="text-xs leading-[18px] text-muted">
        {workspaceName} · 기준일 {result?.reference_date ?? parser.referenceDate}
        {result && <><br />{result.engine === 'gemini' ? 'Gemini · 첨부 파서' : '날짜·시간 규칙 파서'}</>}
      </p>
      {result?.items.map((item, index) => (
        <div key={index} className="min-w-0 rounded-xl bg-white p-3 text-sm leading-[21px]">
          <p className="font-medium text-ink-strong">{item.employee_name || '이름 확인 필요'} · {LABELS[item.kind] ?? '조건 확인 필요'}</p>
          <p className="mt-1 text-xs text-muted">{item.start_date ?? '시작일 미정'}{item.end_date !== item.start_date ? ` ~ ${item.end_date ?? '종료일 미정'}` : ''}</p>
          <p className="text-xs text-muted">{item.kind === 'SHIFT' ? `${item.start_time}–${item.end_time}` : item.kind === 'LEAVE' ? '종일' : `${SHIFTS[item.shift] ?? '근무 종류 미정'}${item.value != null ? ` · ${item.value}회` : ''}`}</p>
          {!item.calendar_eligible && <p className="mt-1 text-xs text-darkblue">조건 확인용 · 달력에 저장하지 않아요</p>}
        </div>
      ))}
      {error && <p role="alert" className="text-xs leading-[18px] text-danger">{error}</p>}
      {!saved && result?.errors.map((message, index) => <p key={index} className="text-xs leading-[18px] text-danger">{message}</p>)}
      {!!result?.preview_only_count && <p className="text-xs leading-[18px] text-muted">선호·제외·횟수 조건은 자동 배치에 아직 적용되지 않습니다.</p>}
      {saved ? (
        <button type="button" className={`${BUTTON} border border-line bg-white text-darkblue`} onClick={() => onOpenCalendar(firstDate)}>달력에서 보기</button>
      ) : (
        <>
          {result?.can_confirm && <button type="button" disabled={busy} className={`${BUTTON} bg-primary text-ink-strong`} onClick={onConfirm}>
            {status === 'saving' ? '저장 중…' : `확인한 일정 ${result.calendar_count}건 달력에 추가`}
          </button>}
          {!busy && <div className="flex flex-wrap gap-2">
            <button type="button" className={`${BUTTON} flex-1 border border-line bg-white text-darkblue`} onClick={onEdit}>내용 수정</button>
            <button type="button" className={`${BUTTON} flex-1 border border-line bg-white text-darkblue`} onClick={onRetry}>다시 분석</button>
          </div>}
          {result?.can_confirm && <p className="text-xs leading-[18px] text-muted">이름과 날짜를 확인해 주세요. 버튼을 눌러야 저장됩니다.</p>}
        </>
      )}
    </section>
  );
}
