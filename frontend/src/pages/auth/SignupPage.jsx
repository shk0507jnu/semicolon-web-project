import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import Button from '../../components/common/Button';
import Callout from '../../components/common/Callout';
import Checkbox from '../../components/common/Checkbox';
import PasswordField from '../../components/common/PasswordField';
import TextField from '../../components/common/TextField';
import { useUser } from '../../contexts/UserContext';
import { PASSWORD_MIN_LENGTH } from '../../db/localDb.mjs';
import { PATHS } from '../../routes/paths';

// 02 회원가입 (피그마: 02 회원가입 · 기존 디자인 통합, 1:61)
// 오프라인 로컬 DB에 users + auth_accounts(비밀번호는 해시) + 알림 설정을 저장하고 01 로그인으로 이동해.
// 이미 가입된 이메일이면 막고 로그인으로 안내. 비밀번호는 8자 이상 (형한테 규칙 확인 필요)
export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, signUp } = useUser();
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: location.state?.email ?? '',
    password: '',
    passwordConfirm: '',
    agreeTerms: false,
  });

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError(null);
  };

  // 비밀번호 확인이 다르면 브라우저 기본 안내창으로 가입을 막아줘. (에러 디자인 나오면 그걸로 바꾸기)
  // 비밀번호나 확인 칸 중 어느 쪽을 고쳐도 다시 검사하도록 useEffect로 처리.
  const confirmRef = useRef(null);
  useEffect(() => {
    const mismatch = form.passwordConfirm && form.passwordConfirm !== form.password;
    confirmRef.current?.setCustomValidity(mismatch ? '비밀번호가 일치하지 않아요.' : '');
  }, [form.password, form.passwordConfirm]);

  if (isLoggedIn) return <Navigate to={PATHS.workspaces} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    const result = await signUp({ name: form.name, email: form.email, password: form.password, termsAccepted: form.agreeTerms });
    setPending(false);
    if (!result.ok) {
      setError(result);
      return;
    }
    // 가입한 이메일을 로그인 칸에 미리 채워서 넘겨줘 (원래 가려던 화면 정보도 같이)
    navigate(PATHS.login, { replace: true, state: { ...location.state, signedUpEmail: result.user.email } });
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
          minLength={PASSWORD_MIN_LENGTH}
          title={`${PASSWORD_MIN_LENGTH}자 이상 입력해 주세요`}
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

        {error && (
          <Callout tone="danger">
            {error.message}
            {error.code === 'duplicate' && (
              <button type="button" className="ml-1 font-bold underline" onClick={() => navigate(PATHS.login, { replace: true, state: { ...location.state, signedUpEmail: undefined, prefillEmail: form.email } })}>
                로그인하기
              </button>
            )}
          </Callout>
        )}

        <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
          {pending ? '저장하는 중…' : '가입하기'}
        </Button>

        <div className="flex min-h-11 flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span className="text-xs leading-5 text-muted">이미 계정이 있나요?</span>
          <Link to={PATHS.login} replace state={location.state} className="inline-flex min-h-11 items-center text-sm leading-5 font-medium text-darkblue underline">
            로그인
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
