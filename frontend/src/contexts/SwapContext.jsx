import { createContext, useContext, useState } from 'react';
import { MOCK_SWAP_REQUESTS } from '../mocks/data';
import { useUser } from './UserContext';

// 대타 요청을 앱 전체에서 공유해. (12에서 등록 → 11 목록에 바로 보이게)
// TODO: 백엔드 연결 후 목록 조회·등록·지원을 API 호출로 바꾸기. 지금은 새로고침하면 처음 상태로 돌아가.
const SwapContext = createContext(null);

export function SwapProvider({ children }) {
  const { user } = useUser();
  const [requests, setRequests] = useState(MOCK_SWAP_REQUESTS);

  // 새 대타 요청 등록 (요청자는 지금 로그인한 사람)
  const addRequest = ({ date, start, end, label, reason }) => {
    const request = {
      id: `s-${Date.now()}`,
      date,
      start,
      end,
      label,
      reason,
      requesterName: user.name,
      status: 'open',
    };
    setRequests((prev) => [request, ...prev]);
    return request;
  };

  // 모집 중인 요청에 지원
  const applyToRequest = (id) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id && r.status === 'open' ? { ...r, status: 'applied', applicantName: user.name } : r)),
    );
  };

  return <SwapContext.Provider value={{ requests, addRequest, applyToRequest }}>{children}</SwapContext.Provider>;
}

export function useSwaps() {
  const ctx = useContext(SwapContext);
  if (!ctx) throw new Error('useSwaps는 SwapProvider 안에서만 쓸 수 있어');
  return ctx;
}
