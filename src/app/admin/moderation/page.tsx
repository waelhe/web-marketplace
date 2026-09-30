import type { Metadata } from "next";
import Link from "next/link";
import { getModerationQueue } from "@/lib/api/admin";
import {
  MODERATION_QUEUE_PAGE_SIZE,
  REPORT_STATUS_LABELS,
  type ReportStatusFilter,
} from "@/lib/api/admin-contract";
import {
  REPORT_REASON_LABELS,
  type ReportReason,
} from "@/lib/api/community-contract";
import { formatDateTime, formatDate } from "@/lib/format";
import { EmptyState, PanelHead, ReadFailure } from "../panel-parts";
import { ResolveReportForm } from "../forms";

/**
 * لوحة البلاغات (slice N2): the moderation queue — the S6 console's
 * first section on its own deep-linked panel, Nextdoor's
 * moderation-first signature. The queue read + the resolve action ride
 * the same admin contract verbatim (`GET /admin/reports` + `POST
 * /admin/reports/{id}/resolve`): FIFO oldest-first, the status axis on
 * the backend's own vocabulary, a closed report's second resolve
 * answers 409 with the backend's own words.
 */

export const metadata: Metadata = {
  title: "بلاغات الإشراف",
  robots: { index: false },
};

/** The status axis chip — OPEN/RESOLVED/DISMISSED on the backend's own vocabulary. */
function statusLabel(status: string): string {
  return REPORT_STATUS_LABELS[status as ReportStatusFilter] ?? status;
}

export default async function ModerationPanelPage() {
  const queue = await getModerationQueue(undefined, 0, MODERATION_QUEUE_PAGE_SIZE);

  return (
    <main className="hy-adm-panel">
      <PanelHead
        title="بلاغات الإشراف"
        note={
          <>
            طابور FIFO كامل (الأقدم أولاً) — محور الحالة: مفتوح / محسوم /
            مستبعد. التسوية على بلاغ مغلق تُجيب 409 بكلمات الخلفي. التسوية
            نفسها أمر إداري واحد: استبعاد (إغلاق بلا لمس) أو إخفاء المحتوى
            (قلب الحالة + تنبيه صاحبه + إغلاق — معاملة واحدة).
          </>
        }
      />

      <section className="card hy-adm-section" aria-labelledby="moderation-heading">
        <h2 id="moderation-heading">الطابور</h2>
        {queue.ok ? (
          queue.data.content.length === 0 ? (
            <EmptyState title="لا بلاغات في الطابور" />
          ) : (
            <ul className="feed-list">
              {queue.data.content.map((report) => (
                <li key={report.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="حالة البلاغ">
                      {statusLabel(report.status)}
                    </span>
                    <span>·</span>
                    <span aria-label="نوع الهدف">{report.targetType}</span>
                    <span>·</span>
                    <span aria-label="سبب الإبلاغ">
                      {REPORT_REASON_LABELS[report.reason as ReportReason] ??
                        report.reason}
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(report.createdAt)}</span>
                  </p>
                  <p className="listing-meta" dir="ltr">
                    <span>target: {report.targetId}</span>
                  </p>
                  {report.resolutionNote ? (
                    <p className="post-body">ملاحظة التسوية: {report.resolutionNote}</p>
                  ) : null}
                  {report.status === "OPEN" ? (
                    <ResolveReportForm reportId={report.id} />
                  ) : (
                    <p className="page-note" role="status">
                      أُغلق البلاغ
                      {report.resolvedAt ? ` — ${formatDate(report.resolvedAt)}` : ""}.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={queue.problem} status={queue.status} what="الطابور" />
        )}
      </section>

      <p>
        <Link href="/admin">النظرة العامة ←</Link>
      </p>
    </main>
  );
}
