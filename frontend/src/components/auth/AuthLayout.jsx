import AuthTabs from './AuthTabs';

// 로그인·회원가입 공통 카드. 로고는 모든 페이지의 고정 상단바에서 제공한다.
export default function AuthLayout({ children }) {
  return (
    <main className="page-scroll flex flex-col items-center px-4 pt-6 pb-6">
      <div className="flex w-full min-w-0 shrink-0 flex-col items-center gap-5">
        <section className="w-full overflow-hidden rounded-2xl border border-line bg-white">
          <AuthTabs />
          <div className="px-5 py-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
