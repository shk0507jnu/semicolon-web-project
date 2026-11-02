// 아직 구현하지 않은 화면 자리표시용
export default function PlaceholderPage({ no, name }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="text-sm text-muted">{no}</p>
      <h1 className="text-lg font-bold text-ink">{name}</h1>
      <p className="text-sm text-muted">아직 구현 전인 화면이야.</p>
    </div>
  );
}
