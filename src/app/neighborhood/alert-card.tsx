"use client";

/**
 * The pinned alert card — the featured zone's «تنبيه عاجل ومثبت» (the
 * owner-supplied design: urgent committee news above the feed, with the
 * «أكد العلم» acknowledgment). The acknowledgment is a DISPLAY
 * interaction by contract discipline: the demo alert carries the
 * «بيانات عرض» badge and the ack rides client state only — never a
 * fake write. When the backend serves the NeighborhoodAlert contract,
 * the same card goes real (a server-counted ack) with zero visual
 * changes.
 */

import { useState } from "react";
import type { NeighborhoodAlert } from "@/lib/neighborhood-product";

const count = (n: number) => new Intl.NumberFormat("ar").format(n);

export function AlertCard({ alert }: { alert: NeighborhoodAlert }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const acks = alert.acknowledgments + (acknowledged ? 1 : 0);

  return (
    <article className="alert-card" data-severity={alert.severity.toLowerCase()}>
      <header className="alert-head">
        <span className="alert-badge">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="currentColor"
              d="M12 2 1 21h22L12 2Zm0 4.7 7.5 12.8h-15L12 6.7ZM11 10v4h2v-4h-2Zm0 6v2h2v-2h-2Z"
            />
          </svg>
          تنبيه عاجل · مثبّت
        </span>
        <span className="badge badge-muted">بيانات عرض</span>
      </header>
      <h3 className="alert-title">{alert.title}</h3>
      <p className="alert-body">{alert.body}</p>
      <footer className="alert-foot">
        <span className="listing-meta">{alert.issuer}</span>
        <button
          type="button"
          className="button"
          data-variant={acknowledged ? "primary" : undefined}
          onClick={() => setAcknowledged(true)}
          disabled={acknowledged}
        >
          {acknowledged ? `تم تأكيد العلم — شكرًا (${count(acks)} جارًا)` : `أكّد علمك (${count(acks)} جارًا أكّدوا)`}
        </button>
      </footer>
    </article>
  );
}
