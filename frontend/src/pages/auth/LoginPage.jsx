import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import Button from '../../components/common/Button';
import Callout from '../../components/common/Callout';
import Checkbox from '../../components/common/Checkbox';
import Divider from '../../components/common/Divider';
import TextField from '../../components/common/TextField';
import { FIGMA_ASSETS } from '../../assets';
import { useUser } from '../../contexts/UserContext';
import { PATHS } from '../../routes/paths';

const SOCIAL_PROVIDERS = [
  { id: 'google', label: 'Google로 계속하기', icon: FIGMA_ASSETS.googleLogo },
  { id: 'github', label: 'GitHub로 계속하기', icon: FIGMA_ASSETS.githubLogo },
  { id: 'apple', label: 'Apple로 계속하기', icon: FIGMA_ASSETS.appleLogo },
];

// 01 로그인 (피그마: 01 로그인 · 기존 디자인 통합, 1:4)
// 오프라인 로컬 DB(src/db/localDb.mjs)에 가입된 이메일·비밀번호와 맞을 때만 들어가져.
//  - 가입 안 된 이메일 → '가입되지 않은 이메일이에요' + 회원가입 버튼 안내
//  - 비밀번호 틀림     → '비밀번호가 맞지 않아요'
// 에러 문구 디자인이 없어서 공통 Callout(빨간 안내 박스)으로 임시 처리
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, logIn } = useUser();
  // 02 회원가입을 마치고 오면 이메일을 미리 채워주고 완료 안내를 보여줘
  const signedUp = location.state?.signedUpEmail;
  const [form, setForm] = useState({ email: signedUp ?? location.state?.prefillEmail ?? '', password: '', remember: false });
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  // 로그인 후에는 원래 가려던 화면(예: 10 초대 링크)으로, 없으면 03 워크스페이스 선택으로
  const from = location.state?.from;
  const nextPath = from?.pathname && from.pathname !== PATHS.login ? `${from.pathname}${from.search ?? ''}` : PATHS.workspaces;

  if (isLoggedIn && !pending) return <Navigate to={nextPath} replace />;

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    const result = await logIn(form);
    setPending(false);
    if (result.ok) navigate(nextPath, { replace: true });
    else setError(result);
  };

  const handleSocialLogin = (providerId) => {
    // TODO: 백엔드와 소셜 로그인(OAuth) 방식 정해지면 연결
    console.log('소셜 로그인', providerId);
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
        <TextField
          label="비밀번호"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호를 입력하세요"
          value={form.password}
          onChange={handleChange}
          required
        />

        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <Checkbox label="로그인 유지" name="remember" checked={form.remember} onChange={handleChange} />
          {/* TODO: 비밀번호 찾기 화면은 사이트맵에 없어서 형한테 확인 필요 */}
          <button type="button" className="min-h-11 shrink-0 text-xs leading-5 font-medium text-darkblue underline">
            비밀번호 찾기
          </button>
        </div>

        {signedUp && !error && <Callout>가입이 완료됐어요. 비밀번호를 입력해서 로그인해 주세요.</Callout>}
        {error && (
          <Callout tone="danger">
            {error.message}
            {error.code === 'not_found' && (
              <button type="button" className="ml-1 font-bold underline" onClick={() => navigate(PATHS.signup, { state: { ...location.state, email: form.email } })}>
                회원가입하기
              </button>
            )}
          </Callout>
        )}

        <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
          {pending ? '확인하는 중…' : '이메일로 로그인'}
        </Button>

        <Divider>간편 로그인</Divider>

        <div className="flex flex-col gap-2">
          {SOCIAL_PROVIDERS.map((provider) => (
            <Button
              key={provider.id}
              variant="social"
              icon={provider.icon}
              onClick={() => handleSocialLogin(provider.id)}
            >
              {provider.label}
            </Button>
          ))}
        </div>

        <Button variant="outline" onClick={() => navigate(PATHS.signup, { state: location.state })}>
          회원가입
        </Button>
      </form>
    </AuthLayout>
  );
}
