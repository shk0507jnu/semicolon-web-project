import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import Button from '../../components/common/Button';
import Checkbox from '../../components/common/Checkbox';
import Divider from '../../components/common/Divider';
import TextField from '../../components/common/TextField';
import { FIGMA_ASSETS } from '../../assets';
import { PATHS } from '../../routes/paths';

const SOCIAL_PROVIDERS = [
  { id: 'google', label: 'Google로 계속하기', icon: FIGMA_ASSETS.googleLogo },
  { id: 'github', label: 'GitHub로 계속하기', icon: FIGMA_ASSETS.githubLogo },
  { id: 'apple', label: 'Apple로 계속하기', icon: FIGMA_ASSETS.appleLogo },
];

// 01 로그인 (피그마: 01 로그인 · 기존 디자인 통합, 1:4)
export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember: false });

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: 백엔드 로그인 API 연결 후, 성공하면 워크스페이스 선택 화면으로 이동
    console.log('로그인 요청', form);
    navigate(PATHS.workspaces);
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

        <div className="flex h-11 items-center justify-between">
          <Checkbox label="로그인 유지" name="remember" checked={form.remember} onChange={handleChange} />
          {/* TODO: 비밀번호 찾기 화면은 사이트맵에 없어서 형한테 확인 필요 */}
          <button type="button" className="text-xs leading-5 font-medium text-darkblue underline">
            비밀번호 찾기
          </button>
        </div>

        <Button type="submit" variant="primary">
          이메일로 로그인
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

        <Button variant="outline" onClick={() => navigate(PATHS.signup)}>
          회원가입
        </Button>
      </form>
    </AuthLayout>
  );
}
