import type { Metadata } from "next";
import Link from "next/link";
import { getReviewModerationQueue } from "@/lib/api/admin";
import {
  REVIEW_FLAG_LABELS,
  REVIEW_MODERATION_PAGE_SIZE,
  REVIEW_MODERATION_STATE_LABELS,
  type ReviewModerationState,
} from "@/lib/api/admin-contract";
import { REVIEW_ORIGIN_LABELS } from "@/lib/api/reputation-contract";
import { formatDateTime } from "@/lib/format";
import { EmptyState, PanelHead, ReadFailure } from "../panel-parts";
import { ModerateReviewForm } from "../forms";

/**
 * لوحة إشراف المراجعات (W1 yelp plan §4.5 — طابور الإشراف): the
 * first-N moderation queue the anti-abuse gates feed — the complete
 * FIFO drain order (oldest first: createdAt, id), each row carrying its
 * internal fraud signals. The decision contract is the entity's own
 * state machine: APPROVE publishes (the stored provider averages
 * recompute with the row — the existing creation event, AFTER_COMMIT),
 * REJECT hides (they recompute without it); any other stored state
 * answers 409 with the backend's own words.
 *
 * The default view is the PENDING queue — the worklist. The status axis
 * (?state=) also reads PUBLISHED / HIDDEN_BY_MODERATOR (the decision
 * trail) through the backend's own filter.
 */

export const metadata: Metadata = {
  title: "إشراف المراجعات",
  robots: { index: false },
};

function stateLabel(state: string): string {
  return (
    REVIEW_MODERATION_STATE_LABELS[state as ReviewModerationState] ?? state
  );
}

function originLabel(origin: string): string {
  return REVIEW_ORIGIN_LABELS[origin as "BOOKING" | "ORGANIC"] ?? origin;
}

type ReviewsPanelProps = PageProps<"/admin/reviews">;

export default async function ReviewsModerationPanelPage({
  searchParams,
}: ReviewsPanelProps) {
  const sp = await searchParams;
  const state = Array.isArray(sp?.state) ? sp.state[0] : sp?.state;
  const queue = await getReviewModerationQueue(
    state === "PUBLISHED" || state === "HIDDEN_BY_MODERATOR"
      ? state
      : "PENDING_REVIEW",
    0,
    REVIEW_MODERATION_PAGE_SIZE,
  );
  const activeState: ReviewModerationState =
    state === "PUBLISHED" || state === "HIDDEN_BY_MODERATOR"
      ? state
      : "PENDING_REVIEW";

  return (
    <main className="hy-adm-panel">
      <PanelHead
        title="إشراف المراجعات"
        note={
          <>
            طابور المراجعات العامة الأولى (الأقدم أولًا — ساعة الطابور نفسها).
            القبول ينشر المراجعة ويحدّث متوسط المزوّد بها؛ الرفض يخفيها
            ويُعيد الحساب بدونها. إشارات مكافحة الإساءة المسجّلة تظهر مع كل
            صف — أدلة المشغّل، لا أحكامًا مسبقة.
          </>
        }
      />

      <nav className="listing-pager" aria-label="محور حالة الطابور">
        {(["PENDING_REVIEW", "PUBLISHED", "HIDDEN_BY_MODERATOR"] as const).map(
          (value) => (
            <Link
              key={value}
              className="button"
              href={value === "PENDING_REVIEW" ? "/admin/reviews" : `/admin/reviews?state=${value}`}
              aria-current={value === activeState ? "page" : undefined}
            >
              {stateLabel(value)}
            </Link>
          ),
        )}
      </nav>

      <section className="card hy-adm-section" aria-labelledby="reviews-queue-heading">
        <h2 id="reviews-queue-heading">{stateLabel(activeState)}</h2>
        {queue.ok ? (
          queue.data.content.length === 0 ? (
            <EmptyState title={`لا مراجعات ${stateLabel(activeState)}`} />
          ) : (
            <ul className="feed-list">
              {queue.data.content.map((item) => (
                <li key={item.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="منشأ المراجعة">
                      {originLabel(item.origin)}
                    </span>
                    <span>·</span>
                    <span className="stat-value">
                      {new Intl.NumberFormat("ar").format(item.rating ?? 0)}
                    </span>
                    <span>من ٥</span>
                    <span>·</span>
                    <span>{formatDateTime(item.createdAt)}</span>
                  </p>
                  {item.comment ? (
                    <p className="listing-description">{item.comment}</p>
                  ) : null}
                  <p className="listing-meta" dir="ltr">
                    <span>reviewer: {item.reviewerId}</span>
                    <span>·</span>
                    <span>provider: {item.providerId}</span>
                  </p>
                  {item.flags.length > 0 ? (
                    <ul className="listing-meta" aria-label="إشارات مكافحة الإساءة">
                      {item.flags.map((flag) => (
                        <li key={flag} className="listing-category">
                          {REVIEW_FLAG_LABELS[flag] ?? flag}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {activeState === "PENDING_REVIEW" ? (
                    <ModerateReviewForm reviewId={item.id} />
                  ) : (
                    <p className="page-note" role="status">
                      حُسمت — هذا صف قرار في مساره.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={queue.problem} status={queue.status} what="طابور المراجعات" />
        )}
      </section>

      <p>
        <Link href="/admin">النظرة العامة ←</Link>
      </p>
    </main>
  );
}
