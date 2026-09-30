import type { Metadata } from "next";
import Link from "next/link";
import { getVerificationQueue } from "@/lib/api/admin";
import {
  VERIFICATION_QUEUE_PAGE_SIZE,
  VERIFICATION_QUEUE_STATE_LABELS,
  type VerificationQueueState,
} from "@/lib/api/admin-contract";
import { findGeoNodeById } from "@/lib/api/geo";
import { formatDateTime } from "@/lib/format";
import { EmptyState, PanelHead, ReadFailure } from "../panel-parts";
import { ReviewVerificationForm } from "../forms";

/**
 * لوحة توثيق السكن (the verification lifecycle's review surface, PR
 * #483): the PENDING queue — the manual-first verifier D-N3 documents.
 * The queue read + the review action ride the same admin contract
 * verbatim (`GET /admin/neighborhood-memberships?state=` + `POST
 * /admin/neighborhood-memberships/{id}/verification?decision=`): the
 * state's own drain clock (updatedAt ASC — the request's transition is
 * the row's last write), the four-value state axis, a non-PENDING
 * review answers 409 with the backend's own words. The neighborhood's
 * display name resolves through the public geo surface (the view's own
 * projection discipline — the user stays an opaque UUID; identity
 * seams own resolution).
 */

export const metadata: Metadata = {
  title: "توثيق السكن",
  robots: { index: false },
};

/** The state axis chip — the backend's own vocabulary with Arabic labels. */
function stateLabel(state: string): string {
  return VERIFICATION_QUEUE_STATE_LABELS[state as VerificationQueueState] ?? state;
}

export default async function VerificationPanelPage() {
  const queue = await getVerificationQueue(
    "PENDING",
    0,
    VERIFICATION_QUEUE_PAGE_SIZE,
  );

  // The hood names resolve through the public geo surface — one read per
  // DISTINCT location on the page (the queue is one neighborhood's trial
  // district; the map stays tiny by construction).
  const hoodNames = new Map<string, string>();
  if (queue.ok) {
    for (const row of queue.data.content) {
      if (!hoodNames.has(row.locationId)) {
        const node = await findGeoNodeById(row.locationId);
        hoodNames.set(row.locationId, node?.nameAr ?? row.locationId);
      }
    }
  }

  return (
    <main className="hy-adm-panel">
      <PanelHead
        title="توثيق السكن"
        note={
          <>
            طابور الطلبات قيد المراجعة (الأقدم أولاً — ساعة الحالة نفسها).
            القبول يمنح علامة «جار موثق»؛ الرفض يعطّل نشر العضو ورسائله
            الجديدة مع بقاء قراءته كاملة (فصل D-N3). المراجعة على عضوية
            غير معلّقة تُجيب 409 بكلمات الخلفي.
          </>
        }
      />

      <section className="card hy-adm-section" aria-labelledby="verification-heading">
        <h2 id="verification-heading">الطلبات المعلّقة</h2>
        {queue.ok ? (
          queue.data.content.length === 0 ? (
            <EmptyState title="لا طلبات توثيق معلّقة" />
          ) : (
            <ul className="feed-list">
              {queue.data.content.map((membership) => (
                <li key={membership.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="حالة التوثيق">
                      {stateLabel(membership.verificationState)}
                    </span>
                    <span>·</span>
                    <span aria-label="الحارة">
                      {hoodNames.get(membership.locationId) ?? membership.locationId}
                    </span>
                    <span>·</span>
                    <span>عضو منذ {formatDateTime(membership.memberSince)}</span>
                    <span>·</span>
                    <span>آخر تحديث {formatDateTime(membership.updatedAt)}</span>
                  </p>
                  <p className="listing-meta" dir="ltr">
                    <span>member: {membership.userId}</span>
                  </p>
                  {membership.verificationState === "PENDING" ? (
                    <ReviewVerificationForm membershipId={membership.id} />
                  ) : (
                    <p className="page-note" role="status">
                      حُسم التوثيق — هذا صف قرار في مساره.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={queue.problem} status={queue.status} what="طابور التوثيق" />
        )}
      </section>

      <p>
        <Link href="/admin">النظرة العامة ←</Link>
      </p>
    </main>
  );
}
