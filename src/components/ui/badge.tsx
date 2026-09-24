import type { ReactNode } from "react";

type Tone = "featured" | "new" | "active" | "muted";

export function Badge({ tone = "muted", children }: {
  tone?: Tone; children: ReactNode;
}) {
  return (
    <span className={`badge badge-${tone}`}>
      {children}
    </span>
  );
}
