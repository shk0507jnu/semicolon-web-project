import { NavLink } from 'react-router-dom';
import { FIGMA_ASSETS } from '../../assets';
import { PATHS } from '../../routes/paths';

const TABS = [
  { label: '로그인', to: PATHS.login },
  { label: '회원가입', to: PATHS.signup },
];

// 로그인 / 회원가입 탭 (피그마: Authentication tabs, 1:11)
export default function AuthTabs() {
  return (
    <nav className="flex h-[58px] w-full border-b border-line-soft">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          replace
          className={({ isActive }) =>
            `relative flex min-w-px flex-1 items-center justify-center text-sm leading-5 font-medium text-darkblue ${
              isActive ? 'bg-primary-soft' : 'bg-white'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0">
                  <span className="absolute inset-[-2px_0_0_0]">
                    <img src={FIGMA_ASSETS.activeIndicator} alt="" className="block size-full max-w-none" />
                  </span>
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
