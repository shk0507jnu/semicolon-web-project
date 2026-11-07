import Button from '../common/Button';

export default function ApiState({ loading, error, reload }) {
  if (loading) return <p role="status" className="p-4 text-sm text-muted">일정을 불러오는 중…</p>;
  if (error) return <div className="flex flex-col gap-3 p-4"><p role="alert" className="text-sm text-red-700">{error}</p><Button variant="soft" onClick={reload}>다시 시도</Button></div>;
  return null;
}
