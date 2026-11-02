import Logo from '../common/Logo';
import AuthTabs from './AuthTabs';

// 로그인·회원가입이 같이 쓰는 틀: 로고 + 흰 카드 + 탭 (피그마: Page content, Authentication card)
export default function AuthLayout({ children }) {
  return (
    <main className="flex flex-col items-center px-4 py-6">
      <div className="flex w-full flex-col items-center gap-5">
        <Logo />
        <section className="w-full overflow-hidden rounded-2xl border border-line bg-white">
          <AuthTabs />
          <div className="px-5 py-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
