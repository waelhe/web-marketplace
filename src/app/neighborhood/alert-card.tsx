"use client";

/**
 * The pinned alert card — the design's «تنبيه حيوي مثبت»: committee
 * infrastructure news above the feed, with the works-map snippet, the
 * movement guidelines, the temporary-parking note, and the
 * acknowledgment counter (the owner-supplied design, S10 skin).
 *
 * The acknowledgment stays a DISPLAY interaction by contract
 * discipline (inherited from S8): the demo alert carries the
 * «بيانات عرض» badge and the ack rides client state only — never a
 * fake write. When the backend serves the NeighborhoodAlert contract,
 * the same card goes real (a server-counted ack) with zero visual
 * changes.
 */

import { useId, useState } from "react";
import type { OwnerAlert } from "@/lib/neighborhood-design";
import { ownerCount } from "@/lib/neighborhood-design";

export function AlertCard({ alert }: { alert: OwnerAlert }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const acks = alert.acknowledgments + (acknowledged ? 1 : 0);
  const id = useId();

  return (
    <article className="hy-card hy-post" aria-labelledby={`${id}-title`}>
      {/* The design's gradient edge — the pinned-urgent signal. */}
      <span className="hy-alert-edge" aria-hidden="true" />
      <header className="hy-post-head">
        <div className="hy-post-id">
          <span className="hy-post-name-row">
            <span className="material-symbols-outlined" aria-hidden="true">
              campaign
            </span>
            <span className="hy-post-name">{alert.issuer}</span>
            <span className="hy-post-chip" data-tone="secondary">
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.75rem" }}>
                push_pin
              </span>
              {alert.badge}
            </span>
          </span>
          <span className="hy-post-meta">{alert.when}</span>
        </div>
        <span className="hy-badge-demo">بيانات عرض</span>
      </header>
      <h3 id={`${id}-title`} className="hy-post-title">
        {alert.title}
      </h3>
      <p className="hy-post-body hy-post-body-muted">{alert.body}</p>

      {/* The works-map snippet + the movement guidelines — the design's
          two-column block under the alert body. */}
      <div className="hy-alert-grid">
        <div className="hy-alert-map" aria-hidden="true">
          <span className="hy-alert-map-label">
            <span className="material-symbols-outlined" style={{ fontSize: "0.875rem" }}>
              route
            </span>
            {alert.mapLabel}
          </span>
        </div>
        <div>
          <p className="hy-alert-guides-head">
            <span className="material-symbols-outlined" aria-hidden="true">
              alt_route
            </span>
            توجيهات الحركة أثناء الأعمال
          </p>
          <ul className="hy-alert-guides">
            {alert.guidelines.map((guideline) => (
              <li key={guideline}>{guideline}</li>
            ))}
          </ul>
          <div className="hy-alert-parking">
            <span className="hy-alert-parking-note">
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.875rem" }}>
                local_parking
              </span>
              {alert.parkingNote}
            </span>
            {/* A display affordance — the interactive route map rides a
                real maps contract that does not exist yet (honest gate). */}
            <button
              type="button"
              className="hy-btn hy-btn-soft"
              disabled
              title="قريبًا — المسار التفاعلي بانتظار عقد الخرائط لدى الباك اند"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                map
              </span>
              {alert.routeDetailLabel}
            </button>
          </div>
        </div>
      </div>

      <footer className="hy-post-foot">
        <span className="hy-post-foot-meta">
          <span className="hy-metric-primary">
            <span className="material-symbols-outlined" aria-hidden="true">
              visibility
            </span>
            {ownerCount(alert.views)} مشاهدة
          </span>
        </span>
        <button
          type="button"
          className="hy-btn hy-btn-primary"
          onClick={() => setAcknowledged(true)}
          disabled={acknowledged}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {acknowledged ? "task_alt" : "notifications_active"}
          </span>
          {acknowledged
            ? `تم تأكيد العلم — شكرًا (${ownerCount(acks)} جارًا)`
            : `${alert.ackLabel} (${ownerCount(acks)} جارًا)`}
        </button>
      </footer>
    </article>
  );
}
