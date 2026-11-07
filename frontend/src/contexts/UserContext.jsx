import { calendarApiEnabled, calendarRequest } from '../api/calendar';
import { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_USER } from '../mocks/data';

// 로그인한 사용자 정보를 앱 전체에서 공유해.
// 17 내 정보에서 이름을 바꾸면 상단바·달력 인사말에도 바로 반영돼.
//
// TODO: 로그인 API 연결 후
//  - 로그인 성공 시 서버가 준 사용자 정보로 setUser
//  - 로그인 상태 확인 → 로그인 안 했으면 로그인 화면으로 보내는 라우트 가드
//  - logout 에서 토큰 삭제 + 서버 로그아웃 호출
const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(calendarApiEnabled ? {name:'로컬 데모',email:'',phone:''} : MOCK_USER);

  useEffect(() => {
    if (!calendarApiEnabled) return;
    const controller = new AbortController();
    calendarRequest('/identity',{signal:controller.signal})
      .then(me => { if (!controller.signal.aborted) setUser({...me,email:'',phone:''}); })
      .catch(() => {}); // Calendar/workspace views expose the actionable connection error.
    return () => controller.abort();
  }, []);

  const updateUser = (changes) => setUser((prev) => ({ ...prev, ...changes }));

  const logout = () => {
    try {
      localStorage.removeItem('shiftlink.currentWorkspaceId');
    } catch {
      // 저장소를 못 쓰는 환경이면 무시
    }
  };

  return <UserContext.Provider value={{ user, updateUser, logout }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser는 UserProvider 안에서만 쓸 수 있어');
  return ctx;
}
