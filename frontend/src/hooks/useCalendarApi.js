import { useEffect, useState } from 'react';
import { calendarRequest } from '../api/calendar';

// A changed workspace/date hides the old result immediately; late requests are aborted.
export function useCalendarApi(workspaceId, paths) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([workspaceId, paths, revision]);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    const [wid, urls] = JSON.parse(key);
    Promise.all(urls.map(path => calendarRequest(path, { workspaceId: wid, signal: controller.signal })))
      .then(data => { if (!controller.signal.aborted) setResult({ key, data, error: null }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key, data: null, error: error.message }); });
    return () => controller.abort();
  }, [key]);
  const current = result.key === key;
  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: !current,
    reload: () => setRevision(v => v + 1),
  };
}
