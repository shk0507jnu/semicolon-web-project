import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createLocalDb } from '../db/localDb.mjs';

// 로그인한 사용자 정보를 앱 전체에서 공유해.
// 회원·로그인 정보는 오프라인 로컬 DB(src/db/localDb.mjs, 브라우저 localStorage)에 저장돼.
//  - isLoggedIn / user{id,name,email,phone} : 지금 로그인한 사람 (로그아웃 상태면 user 는 빈 값)
//  - signUp / logIn / logOut                : 01·02 화면에서 사용
//  - updateUser / changePassword / notificationSettings : 17 내 정보에서 사용
// 로그인 유지 출입증(토큰)은
//  - '로그인 유지' 체크 → localStorage (브라우저를 껐다 켜도 30일 유지)
//  - 체크 안 함        → sessionStorage (이 탭을 닫으면 로그아웃, 최대 12시간)
// 서버가 생기면 localDb 함수만 API 호출로 바꾸면 되고, 화면 쪽 사용법은 그대로야.
const UserContext = createContext(null);
const TOKEN_KEY = 'shiftlink.sessionToken';
const GUEST = { id: null, name: '', email: '', phone: '' };

function safeStorage(kind) {
  try {
    const s = window[kind];
    const probe = '__shiftlink_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null; // 사생활 보호 모드 등 저장소를 못 쓰는 환경
  }
}

const local = safeStorage('localStorage');
const session = safeStorage('sessionStorage');
export const localDb = createLocalDb(local);

const readToken = () => session?.getItem(TOKEN_KEY) || local?.getItem(TOKEN_KEY) || null;
function storeToken(token, remember) {
  session?.removeItem(TOKEN_KEY);
  local?.removeItem(TOKEN_KEY);
  if (token) (remember ? local : session)?.setItem(TOKEN_KEY, token);
}

export function UserProvider({ children }) {
  // 새로고침해도 출입증이 살아 있으면 바로 로그인 상태로 시작
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(() => localDb.userForToken(readToken()));

  const logIn = useCallback(async ({ email, password, remember }) => {
    const result = await localDb.logIn({ email, password, remember });
    if (result.ok) {
      storeToken(result.token, remember);
      setToken(result.token);
      setUser(result.user);
    }
    return result;
  }, []);

  const signUp = useCallback((form) => localDb.signUp(form), []);

  const logOut = useCallback(() => {
    localDb.logOut(token);
    storeToken(null);
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('shiftlink.currentWorkspaceId');
    } catch {
      // 저장소를 못 쓰는 환경이면 무시
    }
  }, [token]);

  // 17 기본 정보 저장 → DB에 쓰고, 성공하면 상단바·인사말에도 바로 반영
  const updateUser = useCallback((changes) => {
    if (!user) return { ok: false, message: '다시 로그인해 주세요.' };
    const result = localDb.updateProfile(user.id, { name: changes.name ?? user.name, phone: changes.phone ?? user.phone });
    if (result.ok) setUser(result.user);
    return result;
  }, [user]);

  const value = useMemo(() => ({
    isLoggedIn: Boolean(user),
    user: user ?? GUEST,
    signUp,
    logIn,
    logOut,
    logout: logOut, // 예전 이름도 그대로 쓸 수 있게
    updateUser,
    changePassword: (form) => localDb.changePassword(user?.id, { ...form, keepToken: token }),
    getNotificationSettings: () => localDb.getNotificationSettings(user?.id),
    updateNotificationSettings: (settings) => localDb.updateNotificationSettings(user?.id, settings),
  }), [user, token, signUp, logIn, logOut, updateUser]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser는 UserProvider 안에서만 쓸 수 있어');
  return ctx;
}
