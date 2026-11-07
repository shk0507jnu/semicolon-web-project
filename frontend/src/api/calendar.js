export const calendarApiEnabled = import.meta.env.VITE_DATA_SOURCE === 'api';

export function demoUserId() {
  try { return localStorage.getItem('shiftlink.demoUserId') || import.meta.env.VITE_CALENDAR_DEMO_USER_ID || '2'; }
  catch { return import.meta.env.VITE_CALENDAR_DEMO_USER_ID || '2'; }
}

export async function calendarRequest(path, { workspaceId, signal, method = 'GET', body } = {}) {
  const headers = { 'X-User-Id': demoUserId() };
  if (workspaceId) headers['X-Workspace-Id'] = workspaceId;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method, headers, signal, body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('서버에 연결할 수 없습니다. 로컬 백엔드를 실행한 뒤 다시 시도해주세요.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = typeof payload.detail === 'string' ? payload.detail : response.status >= 500
      ? '서버에서 일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
      : '입력값을 확인해주세요.';
    throw new Error(detail);
  }
  if (response.status === 204) return null;
  return response.json();
}
