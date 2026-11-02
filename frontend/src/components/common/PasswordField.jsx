import { useState } from 'react';
import { FIGMA_ASSETS } from '../../assets';
import TextField from './TextField';

// 눈 아이콘으로 비밀번호 보기/숨기기 (피그마: 회원가입 비밀번호 입력창의 eye, 1:84)
// 피그마에는 '숨김' 아이콘(눈에 사선)만 있어서, 보이는 상태일 때는 아이콘을 흐리게 처리했어. (형한테 '보기' 아이콘 확인 필요)
export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
          aria-pressed={visible}
          className="flex items-center justify-center"
        >
          <img
            src={FIGMA_ASSETS.eye}
            alt=""
            className={`h-[18.066px] w-[21.288px] shrink-0 transition ${visible ? 'opacity-40' : ''}`}
          />
        </button>
      }
    />
  );
}
