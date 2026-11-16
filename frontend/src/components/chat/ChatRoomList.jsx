import { Link } from 'react-router-dom';
import { PATHS } from '../../routes/paths';
import { ChatIcon, ChevronRightIcon, CloseIcon } from '../common/Icons';

export default function ChatRoomList({ workspaces, rooms, selectedRoomId, loading, error, reload, onSelect, onClose }) {
  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2">
        <div>
          <h2 className="text-base font-bold text-ink-strong">채팅방</h2>
          <p className="text-xs text-muted">내 워크스페이스 {workspaces.length}개</p>
        </div>
        <button type="button" className="chat-action" aria-label="채팅창 닫기" onClick={onClose}><CloseIcon size={20} /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {loading ? <p role="status" className="p-6 text-center text-sm text-muted">채팅방을 불러오고 있어요.</p>
          : error ? <div role="alert" className="flex flex-col items-center gap-3 p-6 text-center text-sm">
            <p>채팅방을 불러오지 못했어요.</p>
            <button type="button" onClick={reload} className="chat-action px-4 font-bold">다시 시도</button>
          </div>
            : !workspaces.length ? <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
              <ChatIcon size={36} className="text-darkblue" />
              <p className="text-sm leading-6 text-muted">아직 참여 중인 채팅방이 없어요.<br />워크스페이스를 만들거나 초대로 참여하세요.</p>
              <Link to={PATHS.workspaces} onClick={onClose} className="rounded-xl bg-primary-soft px-4 py-3 text-sm font-bold text-darkblue">워크스페이스로 이동</Link>
            </div>
              : <ul className="flex flex-col gap-1">
                {workspaces.map(ws => {
                  const room = rooms[ws.id];
                  const last = room?.messages.at(-1);
                  const selected = String(ws.id) === String(selectedRoomId);
                  return (
                    <li key={ws.id}>
                      <button type="button" onClick={() => onSelect(ws.id)} aria-label={`${ws.name} 채팅방 열기`} className={`flex min-h-24 w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-primary-soft active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-darkblue ${selected ? 'bg-primary-soft' : 'bg-white'}`}>
                        <span aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-base font-bold ${selected ? 'bg-darkblue text-white' : 'bg-track text-darkblue'}`}>{ws.name.slice(0, 1)}</span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex items-center gap-1.5"><span className="truncate text-sm font-bold">{ws.name}</span><span className="shrink-0 text-[10px] text-muted">{ws.memberCount ?? ws.member_count ?? '-'}명</span></span>
                          <span className="truncate text-xs text-muted">{room?.draft ? <><span className="font-medium text-darkblue">작성 중 · </span>{room.draft}</> : last?.text ?? '첫 대화를 시작해 보세요'}</span>
                          <span className="text-[10px] text-muted">{ws.role}{selected ? ' · 최근 대화' : ''}</span>
                        </span>
                        {room?.unread > 0 ? <span aria-label={`안 읽은 메시지 ${room.unread}개`} className="flex min-w-5 items-center justify-center rounded-full bg-darkblue px-1.5 py-0.5 text-[10px] font-bold text-white">{room.unread > 99 ? '99+' : room.unread}</span> : <ChevronRightIcon size={16} className="text-muted" />}
                      </button>
                    </li>
                  );
                })}
              </ul>}
      </div>
      <p className="shrink-0 border-t border-line px-4 py-3 text-xs leading-5 text-muted">페이지를 이동해도 대화와 작성 중인 메시지가 유지돼요.</p>
    </>
  );
}
