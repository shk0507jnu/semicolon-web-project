import { useEffect, useId, useRef, useState } from 'react';
import { generatePath, useLocation, useNavigate } from 'react-router-dom';
import { calendarApiEnabled } from '../../api/calendar';
import { useChat } from '../../contexts/ChatContext';
import { useNotices } from '../../contexts/NoticeContext';
import { useUser } from '../../contexts/UserContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { MOCK_MEMBERS } from '../../mocks/data';
import { PATHS } from '../../routes/paths';
import { getToday } from '../../utils/date';
import { formatChatDay, formatChatTime, parseNoticeSchedule } from '../../utils/chatSchedule.mjs';
import { BellIcon, ChatIcon, CheckIcon, CloseIcon, SendIcon } from '../common/Icons';
import ScheduleCard from './ScheduleCard';

// 19 플로팅 채팅 (피그마: 19 플로팅 채팅 · 공지 일정 등록, 2:59 ~ 2:709)
// 워크스페이스 화면(/w/:id/...) 오른쪽 아래 56px 버튼 → 누르면 팀 채팅 패널이 열려.
//  - 일반: '공지로 보내기' 끔 → 대화만 보내 (02)
//  - 공지: 켬 → 공지 배지로 보내고, 메시지에서 일정을 찾아 확인 카드를 띄워 (03 → 04)
//          '일정에 추가'를 눌러야 달력에 저장돼 (05). '달력에서 보기' → 05 달력 해당 날짜 (06)
// 위치: 오른쪽 16px, 하단 메뉴(64px) 위 16px. 패널은 버튼 위 12px, 좌우 16px.
const NAV_HEIGHT = 64;
const LAUNCHER_BOTTOM = NAV_HEIGHT + 16; // 80
const PANEL_BOTTOM = LAUNCHER_BOTTOM + 56 + 12; // 148

export default function FloatingChat() {
  // 공통 틀(AppLayout)에서 그려서, 주소(/w/:workspaceId/...)에서 직접 워크스페이스를 꺼내
  const { pathname } = useLocation();
  const workspaceId = decodeURIComponent(pathname.match(/^\/w\/([^/]+)/)?.[1] ?? '');
  const { workspaces } = useWorkspace();
  const workspace = workspaces.find(ws => String(ws.id) === workspaceId) ?? null;
  const { user } = useUser();
  const { open, setOpen, rooms, updateRoom } = useChat();
  const room = rooms[workspaceId] ?? { messages: [], unread: 0, draft: '', noticeMode: false };
  const panelId = useId();
  const launcherRef = useRef(null);

  const toggle = () => {
    if (!open) updateRoom(workspaceId, { unread: 0 });
    setOpen(!open);
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

  // 패널이 열린 채로 다른 워크스페이스에 들어가면 그 방도 읽음 처리
  useEffect(() => {
    if (open && room.unread) updateRoom(workspaceId, { unread: 0 });
  }, [open, room.unread, workspaceId, updateRoom]);

  if (!workspace) return null;

  const label = open
    ? '팀 채팅 닫기'
    : `팀 채팅 열기${room.unread ? ` (안 읽은 메시지 ${room.unread}개)` : ''}`;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto h-0 w-full max-w-[393px]">
      {open && (
        <ChatPanel
          id={panelId}
          workspaceId={workspaceId}
          workspace={workspace}
          user={user}
          room={room}
          updateRoom={updateRoom}
          onClose={() => setOpen(false)}
        />
      )}
      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        style={{ bottom: LAUNCHER_BOTTOM }}
        className={`pointer-events-auto absolute right-4 flex size-14 items-center justify-center rounded-[28px] shadow-[0_6px_16px_rgba(23,101,143,0.25)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darkblue ${
          open ? 'bg-darkblue text-white' : 'bg-primary text-ink-strong'
        }`}
      >
        {open ? <CloseIcon size={24} /> : <ChatIcon size={24} />}
        {!open && room.unread > 0 && (
          <span className="absolute top-[-2px] left-[38px] flex size-5 items-center justify-center rounded-[10px] bg-darkblue text-[10px] leading-[15px] font-medium text-white">
            {room.unread > 9 ? '9+' : room.unread}
          </span>
        )}
      </button>
    </div>
  );
}

function ChatPanel({ id, workspaceId, workspace, user, room, updateRoom, onClose }) {
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
    <section
      id={id}
      role="dialog"
      aria-label={`${workspace.name} 팀 채팅`}
      style={{ bottom: PANEL_BOTTOM, maxHeight: `calc(100dvh - ${PANEL_BOTTOM + 64 + 16}px)` }}
      className="pointer-events-auto absolute inset-x-4 flex h-[568px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_32px_rgba(7,7,7,0.12)]"
    >
      {/* 채팅 헤더 (2:860) */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line p-4">
        <ChatIcon size={22} className="text-darkblue" />
        <div className="min-w-0">
          <h2 className="truncate text-base leading-6 font-bold text-ink-strong">{workspace.name}</h2>
          <p className="text-xs leading-[18px] text-muted">팀 채팅 · 멤버 {workspace.memberCount ?? workspace.member_count ?? '-'}명</p>
        </div>
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
        <label className={`flex h-6 items-center gap-2 ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={noticeMode}
            disabled={!isAdmin}
            onChange={e => updateRoom(workspaceId, { noticeMode: e.target.checked })}
          />
          <span
            aria-hidden="true"
            className={`flex size-5 items-center justify-center rounded-lg border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-darkblue ${
              noticeMode ? 'border-darkblue bg-darkblue text-white' : 'border-line bg-white'
            }`}
          >
            {noticeMode && <CheckIcon size={14} />}
          </span>
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
            className="flex size-9 shrink-0 items-center justify-center rounded-[18px] bg-primary text-ink-strong transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-track disabled:text-muted disabled:hover:brightness-100"
          >
            <SendIcon size={18} />
          </button>
        </div>
      </form>
    </section>
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
