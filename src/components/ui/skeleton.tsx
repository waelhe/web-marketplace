export function Skeleton({ lines = 3 }: {
  lines?: number;
}) {
  const count = Math.max(1, Math.floor(lines));
  return (
    <div className="skeleton" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-line" aria-hidden="true" />
      ))}
    </div>
  );
}
