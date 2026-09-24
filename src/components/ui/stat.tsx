import type { ReactNode } from "react";

export function Stat({ label, value }: {
  label: string; value: ReactNode;
}) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
