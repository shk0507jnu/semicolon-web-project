import { useEffect, useId, useRef, useState } from 'react';
import { Link, generatePath, useLocation, useNavigate } from 'react-router-dom';
import { calendarApiEnabled } from '../../api/calendar';
import { useChat } from '../../contexts/ChatContext';
import { useNotices } from '../../contexts/NoticeContext';
import { useUser } from '../../contexts/UserContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { MOCK_MEMBERS } from '../../mocks/data';
import { PATHS } from '../../routes/paths';
import { getToday } from '../../utils/date';
import { formatChatDay, formatChatTime, parseNoticeSchedule } from '../../utils/chatSchedule.mjs';
import { BellIcon, ChatIcon, ChevronLeftIcon, CloseIcon, SendIcon } from '../common/Icons';
import ChatRoomList from './ChatRoomList';
import ScheduleCard from './ScheduleCard';

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

  const close = () => {
    setOpen(false);
    launcherRef.current?.focus();
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
        launcherRef.current?.focus();
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
    <div data-open={open} className="chat-shell pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto h-0 w-full max-w-[393px]">
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
          <span className="absolute top-[-2px] left-[38px] flex size-5 items-center justify-center rounded-[10px] bg-darkblue text-[10px] leading-[15px] font-medium text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}

function ChatPanel({ workspaceId, workspace, user, room, updateRoom, onClose, onShowRooms }) {
  const navigate = useNavigate();
  const { addNotice } = useNotices(workspaceId);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const [composing, setComposing] = useState(false);
  const isAdmin = workspace.role === '관리자';
  const noticeMode = isAdmin && room.noticeMode;
  const memberNames = calendarApiEnabled ? [] : MOCK_MEMBERS.map(m => m.name);
  const canSend = room.draft.trim().length > 0;
  const last = room.messages[room.messages.length - 1];
  const showNoticeHint = noticeMode && last?.kind !== 'notice';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  // 새 메시지·카드가 생기면 맨 아래로
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [room.messages.length, showNoticeHint, last?.schedule?.status]);

  const send = () => {
    const text = room.draft.trim();
    if (!text) return;
    const base = { id: `c-${Date.now()}`, author: user.name, mine: true, time: formatChatTime(), text };
    if (!noticeMode) {
      updateRoom(workspaceId, r => ({ messages: [...r.messages, { ...base, kind: 'text' }], draft: '' }));
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
      <header className="flex min-h-16 shrink-0 items-center gap-1 border-b border-line px-2 py-2">
        <button type="button" onClick={onShowRooms} className="chat-action shrink-0" aria-label="채팅방 선택"><ChevronLeftIcon /></button>
        <button type="button" onClick={onShowRooms} className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-darkblue" aria-label={`채팅방 변경 · 현재 ${workspace.name}`}>
          <h2 className="truncate text-base leading-6 font-bold text-ink-strong">{workspace.name}</h2>
          <p className="text-xs leading-[18px] text-muted">멤버 {workspace.memberCount ?? workspace.member_count ?? '-'}명 · 채팅방 변경</p>
        </button>
        <button type="button" onClick={onClose} className="chat-action shrink-0" aria-label="채팅창 닫기"><CloseIcon size={20} /></button>
      </header>

      {/* 대화 (2:867) — 이 영역만 스크롤 */}
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        <p className="text-center text-[10px] leading-[15px] font-medium text-muted">{formatChatDay(getToday())}</p>
        {room.messages.length === 0 && (
          <p className="py-6 text-center text-sm leading-[21px] text-muted">
            아직 대화가 없어요.<br />동료에게 첫 메시지를 보내 보세요.
          </p>
        )}
        {room.messages.map(message => (
          <div key={message.id} className="flex flex-col gap-3">
            <Message message={message} />
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
          </div>
        )}
      </div>

      {/* 입력 (2:888 일반 / 2:924 공지) */}
      <form
        className="flex shrink-0 flex-col gap-2 border-t border-line p-4"
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
        <p className="text-xs leading-[18px] text-muted">
          {!isAdmin ? '공지는 관리자만 보낼 수 있어요.' : noticeMode ? '공지 메시지에서 근무 일정을 찾아요.' : '일반 메시지로 전송해요.'}
        </p>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-3 focus-within:border-darkblue">
          <textarea
            ref={inputRef}
            rows={1}
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
            className="field-sizing-content max-h-24 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-[11px] text-xs leading-[18px] text-ink-strong outline-none placeholder:text-muted"
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
    <div className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2 text-muted">
        <span className="text-xs leading-[18px]">
          {message.author}
          {message.role === '관리자' ? ' · 관리자' : ''}
        </span>
        <span className="text-[10px] leading-[15px] font-medium">{message.time}</span>
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
