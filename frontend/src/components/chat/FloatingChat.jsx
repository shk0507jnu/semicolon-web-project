import { useEffect, useId, useRef, useState } from 'react';
import { Link, generatePath, useLocation, useNavigate } from 'react-router-dom';
import { calendarApiEnabled, calendarRequest } from '../../api/calendar';
import { useChat } from '../../contexts/ChatContext';
import { useNotices } from '../../contexts/NoticeContext';
import { useUser } from '../../contexts/UserContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { MOCK_MEMBERS } from '../../mocks/data';
import { PATHS } from '../../routes/paths';
import { getToday } from '../../utils/date';
import { actualToday } from '../../utils/calendarModel.mjs';
import { formatChatDay, formatChatTime, parseNoticeSchedule } from '../../utils/chatSchedule.mjs';
import { BellIcon, ChatIcon, ChevronLeftIcon, CloseIcon, SendIcon } from '../common/Icons';
import ChatRoomList from './ChatRoomList';
import ScheduleCard from './ScheduleCard';
import ParsedNoticeCard from './ParsedNoticeCard';

// 채팅방 선택은 페이지의 워크스페이스 선택과 독립적이다.
// 방을 바꾸거나 페이지를 이동해도 ChatContext의 대화·초안은 유지한다.
export default function FloatingChat({ publicPage = false }) {
  const { pathname } = useLocation();
  const { workspaces, loading, error, reload } = useWorkspace();
  const { user } = useUser();
  const { open, setOpen, selectedRoomId, setSelectedRoomId, rooms, updateRoom } = useChat();
  const [showRooms, setShowRooms] = useState(true);
  const workspace = workspaces.find(ws => String(ws.id) === String(selectedRoomId)) ?? null;
  const workspaceId = workspace ? String(workspace.id) : '';
  const room = rooms[workspaceId] ?? { messages: [], unread: 0, draft: '', noticeMode: false };
  const unread = publicPage ? 0 : workspaces.reduce((sum, ws) => sum + (rooms[ws.id]?.unread ?? 0), 0);
  const panelId = useId();
  const panelRef = useRef(null);
  const launcherRef = useRef(null);

  // Page actions can open the selected workspace room directly.
  useEffect(() => {
    if (open && selectedRoomId) setShowRooms(false);
  }, [open, selectedRoomId]);

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus({ preventScroll: true }));
  };
  const selectRoom = id => {
    setSelectedRoomId(String(id));
    setShowRooms(false);
  };
  const toggle = () => {
    if (open) return close();
    const routeId = pathname.match(/^\/w\/([^/]+)\//)?.[1];
    const preferred = workspace ?? workspaces.find(ws => String(ws.id) === routeId);
    if (preferred) selectRoom(preferred.id);
    else setShowRooms(true);
    setOpen(true);
  };

  // Esc 로 닫고, 닫으면 포커스를 버튼으로 돌려줘
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') {
        setOpen(false);
        requestAnimationFrame(() => launcherRef.current?.focus({ preventScroll: true }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (open && !publicPage && !showRooms && workspaceId && room.unread) updateRoom(workspaceId, { unread: 0 });
  }, [open, publicPage, showRooms, room.unread, workspaceId, updateRoom]);
  useEffect(() => {
    if (open && (showRooms || publicPage || !workspace)) panelRef.current?.focus();
  }, [open, showRooms, publicPage, workspace]);
  useEffect(() => {
    if (publicPage) setOpen(false);
  }, [publicPage, setOpen]);

  const label = open
    ? '팀 채팅 닫기'
    : `팀 채팅 열기${unread ? ` (안 읽은 메시지 ${unread}개)` : ''}`;

  return (
    <div data-open={open} className="chat-shell pointer-events-none absolute inset-x-0 bottom-0 z-50 mx-auto h-0 w-full max-w-[393px]">
      {open && (
        <section
          id={panelId}
          ref={panelRef}
          role="dialog"
          tabIndex={-1}
          aria-label={!publicPage && workspace && !showRooms ? `${workspace.name} 팀 채팅` : '채팅방 목록'}
          className="chat-panel pointer-events-auto absolute inset-x-4 flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_32px_rgba(7,7,7,0.16)] outline-none"
        >
          {publicPage ? (
            <>
              <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2">
                <h2 className="font-bold">팀 채팅</h2>
                <button type="button" className="chat-action" aria-label="채팅창 닫기" onClick={close}><CloseIcon /></button>
              </header>
              <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
                <ChatIcon size={36} className="text-darkblue" />
                <p className="text-sm leading-6">로그인하고 동료와 대화를 시작하세요.<br />참여 중인 워크스페이스의 채팅방을 선택할 수 있어요.</p>
                <Link to={PATHS.login} onClick={close} className="rounded-xl bg-darkblue px-5 py-3 text-sm font-bold text-white">로그인하기</Link>
              </div>
            </>
          ) : showRooms || !workspace ? (
            <ChatRoomList workspaces={workspaces} rooms={rooms} selectedRoomId={selectedRoomId} loading={loading} error={error} reload={reload} onSelect={selectRoom} onClose={close} />
          ) : (
            <ChatPanel key={workspaceId} workspaceId={workspaceId} workspace={workspace} user={user} room={room} updateRoom={updateRoom} onClose={close} onShowRooms={() => setShowRooms(true)} />
          )}
        </section>
      )}
      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={`chat-launcher pointer-events-auto absolute right-4 flex size-14 items-center justify-center rounded-[28px] shadow-[0_6px_16px_rgba(23,101,143,0.25)] transition active:scale-95 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darkblue ${
          open ? 'bg-darkblue text-white' : 'bg-primary text-ink-strong'
        }`}
      >
        {open ? <CloseIcon size={24} /> : <ChatIcon size={24} />}
        {!open && unread > 0 && (
          <span className="absolute top-[-2px] right-[-2px] flex size-5 items-center justify-center rounded-[10px] bg-darkblue text-[10px] leading-[15px] font-medium text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}

function ChatPanel({ workspaceId, workspace, user, room, updateRoom, onClose, onShowRooms }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotice } = useNotices(workspaceId);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const followLatestRef = useRef(true);
  const [composing, setComposing] = useState(false);
  const parsingRef = useRef(false);
  const [parserStatus, setParserStatus] = useState(null);
  const isAdmin = workspace.role === '관리자';
  const noticeMode = isAdmin && room.noticeMode;
  const memberNames = calendarApiEnabled ? [] : MOCK_MEMBERS.map(m => m.name);
  const pending = room.messages.some(message => ['loading', 'saving'].includes(message.parser?.status));
  const canSend = room.draft.trim().length > 0 && !pending;
  const today = calendarApiEnabled ? actualToday() : getToday();
  const routeDate = location.pathname === generatePath(PATHS.calendar, { workspaceId })
    ? new URLSearchParams(location.search).get('date') : null;
  const referenceDate = /^\d{4}-\d{2}-\d{2}$/.test(routeDate ?? '') ? routeDate : today;
  const last = room.messages[room.messages.length - 1];
  const showNoticeHint = noticeMode && last?.kind !== 'notice';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!calendarApiEnabled) return undefined;
    const controller = new AbortController();
    calendarRequest('/notice-parser/status', { workspaceId, signal: controller.signal })
      .then(setParserStatus).catch(() => {});
    return () => controller.abort();
  }, [workspaceId]);
  // 새 메시지·카드가 생기면 맨 아래로
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      followLatestRef.current = true;
      el.scrollTop = el.scrollHeight;
    }
  }, [room.messages.length, showNoticeHint, last?.schedule?.status, last?.parser?.status]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => {
      if (followLatestRef.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const updateParser = (messageId, patch) => updateRoom(workspaceId, r => ({
    messages: r.messages.map(m => m.id === messageId ? { ...m, parser: { ...m.parser, ...patch } } : m),
  }));

  const analyze = async (messageId, text, baseDate) => {
    if (parsingRef.current) return;
    parsingRef.current = true;
    updateParser(messageId, { status: 'loading', referenceDate: baseDate, result: null, error: null });
    try {
      const result = await calendarRequest('/notice-parser/preview', {
        workspaceId, method: 'POST', body: { text, reference_date: baseDate },
      });
      updateParser(messageId, { status: 'review', result });
    } catch (error) {
      updateParser(messageId, { status: 'error', error: error.message });
    } finally {
      parsingRef.current = false;
    }
  };

  const confirm = async message => {
    if (parsingRef.current || pending) return;
    parsingRef.current = true;
    updateParser(message.id, { status: 'saving', error: null });
    try {
      const saved = await calendarRequest(`/notice-parser/previews/${message.parser.result.id}/confirm`, { workspaceId, method: 'POST', body: {revision: message.parser.result.revision ?? 0} });
      updateParser(message.id, { status: 'saved', result: {...message.parser.result, ...saved} });
      window.dispatchEvent(new CustomEvent('shiftlink:calendar-updated', { detail: { workspaceId } }));
    } catch (error) {
      updateParser(message.id, { status: 'review', error: error.message });
    } finally {
      parsingRef.current = false;
    }
  };

  const send = () => {
    const text = room.draft.trim();
    if (!text || pending || parsingRef.current) return;
    const base = { id: `c-${crypto.randomUUID()}`, author: user.name, mine: true, time: formatChatTime(), text };
    if (!noticeMode) {
      updateRoom(workspaceId, r => ({ messages: [...r.messages, { ...base, kind: 'text' }], draft: '' }));
      return;
    }
    if (calendarApiEnabled) {
      updateRoom(workspaceId, r => ({ messages: [...r.messages, { ...base, kind: 'notice', parser: { status: 'loading', referenceDate } }], draft: '' }));
      analyze(base.id, text, referenceDate);
      return;
    }
    const parsed = parseNoticeSchedule(text, { today: getToday(), memberNames, fallbackName: user.name });
    const schedule = parsed.error
      ? { status: 'unparsed', reason: parsed.error, date: parsed.date ?? getToday(), start: '14:00', end: '22:00', memberName: user.name }
      : { status: 'review', ...parsed };
    updateRoom(workspaceId, r => ({ messages: [...r.messages, { ...base, kind: 'notice', schedule }], draft: '' }));
    // 예시 모드에서는 13 공지 목록·05 최근 공지에도 같이 올려 (API 모드는 공지 저장 API가 생기면 연결)
    if (!calendarApiEnabled) {
      const firstLine = text.split('\n')[0];
      addNotice({ title: firstLine.length > 30 ? `${firstLine.slice(0, 30)}…` : firstLine, body: text, pinned: false });
    }
  };

  const updateSchedule = (messageId, patch) =>
    updateRoom(workspaceId, r => ({
      messages: r.messages.map(m => (m.id === messageId ? { ...m, schedule: { ...m.schedule, ...patch } } : m)),
    }));

  const openCalendar = date => {
    onClose();
    navigate(`${generatePath(PATHS.calendar, { workspaceId })}?date=${date}`);
  };

  return (
    <>
      <header className="chat-room-header flex min-h-16 shrink-0 items-center gap-1 border-b border-line px-2 py-2">
        <button type="button" onClick={onShowRooms} className="chat-action shrink-0" aria-label="채팅방 선택"><ChevronLeftIcon /></button>
        <button type="button" onClick={onShowRooms} className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-darkblue" aria-label={`채팅방 변경 · 현재 ${workspace.name}`}>
          <h2 className="truncate text-base leading-6 font-bold text-ink-strong">{workspace.name}</h2>
          <p className="text-xs leading-[18px] text-muted">멤버 {workspace.memberCount ?? workspace.member_count ?? '-'}명 · 채팅방 변경</p>
        </button>
        <button type="button" onClick={onClose} className="chat-action shrink-0" aria-label="채팅창 닫기"><CloseIcon size={20} /></button>
      </header>

      {/* 대화 (2:867) — 이 영역만 스크롤 */}
      <div ref={scrollRef} onScroll={e => {
        const el = e.currentTarget;
        followLatestRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
      }} className="chat-messages flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4" aria-live="polite">
        <p className="text-center text-[10px] leading-[15px] font-medium text-muted">{formatChatDay(today)}</p>
        {room.messages.length === 0 && (
          <p className="py-6 text-center text-sm leading-[21px] text-muted">
            아직 대화가 없어요.<br />동료에게 첫 메시지를 보내 보세요.
          </p>
        )}
        {room.messages.map(message => (
          <div key={message.id} className="min-w-0 shrink-0 flex flex-col gap-3">
            <Message message={message} />
            {message.parser && <ParsedNoticeCard
              parser={message.parser}
              workspaceName={workspace.name}
              onRetry={() => { if (!pending) analyze(message.id, message.text, message.parser.referenceDate); }}
              onEdit={() => {
                updateRoom(workspaceId, { draft: message.text, noticeMode: true });
                inputRef.current?.focus();
              }}
              onConfirm={() => confirm(message)}
              onReview={() => { onClose(); navigate(generatePath(PATHS.noticeReview, {workspaceId, previewId: message.parser.result.id})); }}
              onOpenConditions={() => { onClose(); navigate(generatePath(PATHS.workConditions, {workspaceId})); }}
              onOpenCalendar={openCalendar}
            />}
            {message.schedule && (
              <ScheduleCard
                schedule={message.schedule}
                workspaceId={workspaceId}
                workspaceName={workspace.name}
                memberNames={memberNames.length ? memberNames : [user.name]}
                onChange={patch => updateSchedule(message.id, patch)}
                onOpenCalendar={openCalendar}
              />
            )}
          </div>
        ))}
        {showNoticeHint && (
          <div className="flex flex-col gap-1 rounded-2xl border border-line bg-primary-soft p-3">
            <p className="text-sm leading-[21px] font-medium text-darkblue">공지에서 일정을 정리해 드려요</p>
            <p className="text-xs leading-[18px] text-muted">날짜, 근무자, 시간을 함께 적어 주세요.</p>
            {calendarApiEnabled && <>
              <p className="text-xs leading-[18px] text-muted">예) 김수진 내일 13시~15시 근무<br />김수진 내일 종일 근무 제외<br />이민수 23일부터 29일까지 최대 3회<br />한 줄에 한 명, 한 조건씩 입력해 주세요.</p>
              <p className="text-xs leading-[18px] text-muted">{parserStatus?.gemini_available ? '자유로운 문장은 Gemini로 분석합니다.' : '위 형식의 일정·조건은 API 키 없이도 분석합니다. 자유로운 문장·휴가 분석은 API 키가 필요해요.'}</p>
            </>}
          </div>
        )}
      </div>

      {/* 입력 (2:888 일반 / 2:924 공지) */}
      <form
        className="chat-composer flex shrink-0 flex-col gap-2 border-t border-line p-3"
        onSubmit={e => {
          e.preventDefault();
          send();
        }}
      >
        <label className={`flex min-h-11 items-center gap-2 ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
          <input
            type="checkbox"
            className="size-5 shrink-0 cursor-inherit accent-darkblue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darkblue"
            checked={noticeMode}
            disabled={!isAdmin}
            onChange={e => updateRoom(workspaceId, { noticeMode: e.target.checked })}
          />
          <span className={`text-sm leading-[21px] font-medium ${noticeMode ? 'text-darkblue' : 'text-ink-strong'}`}>공지로 보내기</span>
        </label>
        <p className="chat-composer-hint text-xs leading-[18px] text-muted">
          {!isAdmin ? '공지는 관리자만 보낼 수 있어요.' : noticeMode ? `분석 후 확인해서 저장 · 기준일 ${referenceDate}` : '일반 메시지로 전송해요.'}
        </p>
        <div className="chat-input-row flex min-w-0 items-end gap-2 rounded-xl border border-line bg-canvas p-2 focus-within:border-darkblue">
          <textarea
            ref={inputRef}
            rows={1}
            maxLength={2000}
            value={room.draft}
            aria-label={noticeMode ? '공지 내용' : '메시지'}
            placeholder={noticeMode ? '공지 내용을 입력해 주세요' : '동료에게 메시지를 보내세요'}
            onChange={e => updateRoom(workspaceId, { draft: e.target.value })}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onKeyDown={e => {
              // Enter = 보내기, Shift+Enter = 줄바꿈. 한글 조합 중 Enter 는 글자 확정이라 보내지 않아.
              if (e.key === 'Enter' && !e.shiftKey && !composing && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            className="field-sizing-content max-h-24 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-base leading-6 text-ink-strong outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label={noticeMode ? '공지 보내기' : '메시지 보내기'}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-ink-strong transition active:scale-95 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darkblue disabled:cursor-not-allowed disabled:bg-track disabled:text-muted disabled:hover:brightness-100"
          >
            <SendIcon size={18} />
          </button>
        </div>
      </form>
    </>
  );
}

// 말풍선 (팀: 왼쪽 회색 287px / 나: 오른쪽 연하늘 277px / 공지: 오른쪽 연하늘 + 종 배지)
function Message({ message }) {
  const { mine, kind } = message;
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      <div className="flex max-w-full items-baseline gap-2 text-muted">
        <span className="min-w-0 text-xs leading-[18px]">
          {message.author}
          {message.role === '관리자' ? ' · 관리자' : ''}
        </span>
        <span className="shrink-0 text-[10px] leading-[15px] font-medium">{message.time}</span>
      </div>
      <div
        className={`flex max-w-full flex-col gap-2 rounded-xl p-3 ${mine ? 'bg-primary-soft' : 'bg-canvas'} ${
          mine && kind !== 'notice' ? 'w-[277px]' : 'w-[287px]'
        }`}
      >
        {kind === 'notice' && (
          <span className="flex items-center gap-1.5 text-xs leading-[18px] text-darkblue">
            <BellIcon size={14} />
            공지
          </span>
        )}
        <p className="text-sm leading-[21px] break-words whitespace-pre-wrap text-ink-strong">{message.text}</p>
      </div>
    </div>
  );
}
