import { useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import TextField from '../common/TextField';
import { PATHS } from '../../routes/paths';

// 붙여넣은 값에서 초대 코드만 꺼내줘
// 'https://shiftlink.app/invite/CAFE24' → 'CAFE24', 'cafe24' → 'CAFE24'
function extractInviteCode(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/\/invite\/([^/?#\s]+)/);
  return (match ? match[1] : trimmed).toUpperCase();
}

// 03 '초대받으셨나요?' 카드 (피그마: 1:82)
// 피그마에는 안내 문구만 있어서, 카드를 누르면 초대 링크/코드 입력칸이 펼쳐지게 임시로 만들었어. (형한테 확인 필요)
export default function InviteJoinCard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = extractInviteCode(value);
    if (code) navigate(generatePath(PATHS.invite, { inviteCode: code }));
  };

  return (
    <section className="flex w-full flex-col gap-3 rounded-2xl border border-line bg-primary-soft p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex flex-col gap-3 text-left"
      >
        <h2 className="text-base leading-6 font-bold text-ink-strong">초대받으셨나요?</h2>
        <p className="text-sm leading-[21px] text-muted">초대 링크를 열어 동료의 워크스페이스에 참여할 수 있어요.</p>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField
            label="초대 링크 또는 코드"
            labelSize="sm"
            placeholder="예) CAFE24"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            required
          />
          <Button type="submit" variant="primary">
            초대 확인하기
          </Button>
        </form>
      )}
    </section>
  );
}
