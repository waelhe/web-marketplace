import type { ReactNode } from "react";
import { problemMessage, type ProblemDetail } from "@/lib/problem";

/**
 * لوحات التحكم — the panels' shared furniture (slice N2): the honest
 * read-failure branch (the backend's own words — the 403s are data,
 * not exceptions), the empty state, and the panel page-head used by
 * every panel page. Extracted verbatim from the S6 console so every
 * panel keeps the same discipline its sections always had.
 */

export function ReadFailure({
  problem,
  status,
  what,
}: {
  problem: ProblemDetail | null;
  status: number;
  what: string;
}) {
  if (status === 0) {
    return (
      <p className="page-note" role="status">
        الخادم الخلفي غير متاح حالياً — لا يمكن قراءة {what} الآن.
      </p>
    );
  }
  return (
    <p className="page-note" role="status">
      {problemMessage(problem, `تعذّرت قراءة ${what} (رمز ${status}).`)}
    </p>
  );
}

export function EmptyState({ title }: { title: string }) {
  return (
    <p className="page-note" role="status">
      {title}
    </p>
  );
}

/** The panel page-head: the h1 + the honest note every panel carries. */
export function PanelHead({
  title,
  note,
}: {
  title: string;
  note: ReactNode;
}) {
  return (
    <header className="hy-adm-head">
      <h1>{title}</h1>
      <p className="page-note" role="note">
        {note}
      </p>
    </header>
  );
}
