import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import Button from '../../components/common/Button';
import Checkbox from '../../components/common/Checkbox';
import PasswordField from '../../components/common/PasswordField';
import TextField from '../../components/common/TextField';
import { PATHS } from '../../routes/paths';

// 02 회원가입 (피그마: 02 회원가입 · 기존 디자인 통합, 1:61)
export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    agreeTerms: false,
  });

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // 비밀번호 확인이 다르면 브라우저 기본 안내창으로 가입을 막아줘. (에러 디자인 나오면 그걸로 바꾸기)
  // 비밀번호나 확인 칸 중 어느 쪽을 고쳐도 다시 검사하도록 useEffect로 처리.
  const confirmRef = useRef(null);
  useEffect(() => {
    const mismatch = form.passwordConfirm && form.passwordConfirm !== form.password;
    confirmRef.current?.setCustomValidity(mismatch ? '비밀번호가 일치하지 않아요.' : '');
  }, [form.password, form.passwordConfirm]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: 백엔드 회원가입 API 연결 후, 성공하면 로그인 화면(또는 워크스페이스 선택)으로 이동
    console.log('회원가입 요청', { ...form, password: '(숨김)', passwordConfirm: '(숨김)' });
    navigate(PATHS.login);
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <h1 className="text-center text-base leading-6 font-bold text-ink">시프트링크 시작하기</h1>

        <TextField
          label="이름"
          name="name"
          autoComplete="name"
          placeholder="이름을 입력하세요"
          value={form.name}
          onChange={handleChange}
          required
        />
        <TextField
          label="이메일"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="이메일 주소를 입력하세요"
          value={form.email}
          onChange={handleChange}
          required
        />
        <PasswordField
          label="비밀번호"
          name="password"
          autoComplete="new-password"
          placeholder="비밀번호를 입력하세요"
          value={form.password}
          onChange={handleChange}
          required
        />
        <PasswordField
          label="비밀번호 확인"
          name="passwordConfirm"
          autoComplete="new-password"
          placeholder="비밀번호를 입력하세요"
          value={form.passwordConfirm}
          ref={confirmRef}
          onChange={handleChange}
          required
        />

        <Checkbox
          label="이용약관 및 개인정보 처리방침 동의 (필수)"
          name="agreeTerms"
          checked={form.agreeTerms}
          onChange={handleChange}
          required
        />

        <Button type="submit" variant="primary">
          가입하기
        </Button>

        <div className="flex h-11 items-center justify-center gap-2">
          <span className="text-xs leading-5 text-muted">이미 계정이 있나요?</span>
          <Link to={PATHS.login} replace className="text-sm leading-5 font-medium text-darkblue underline">
            로그인
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
