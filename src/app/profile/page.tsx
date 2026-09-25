import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getSession } from "@/lib/dal";
import { backendGet } from "@/lib/api/server";
import { problemMessage } from "@/lib/problem";
import { formatDate } from "@/lib/format";
import { getMyBackendUser } from "@/lib/api/inbox";
import {
  getReviewsByReviewer,
  getReviewsOfConsumer,
} from "@/lib/api/reputation";
import {
  MY_REVIEWS_PAGE_SIZE,
  REVIEW_DIRECTION_LABELS,
  type ReviewView,
} from "@/lib/api/reputation-contract";
import { SignOutButton } from "../auth-buttons";
import { ReviewEditForm } from "./forms";

// Profile: DAL session + DIRECT backend fetch (no self HTTP round trip —
// official BFF guide). The /me payload shape is intentionally loose until
// the typed API layer lands with the OpenAPI export (recorded debt: exact
// DTO types come from the backend contract, not invention).
type MePayload = Record<string, unknown>;

// Private surface — `noindex` is the honest robots contract for
// session-scoped content (the one private route that was missing it;
// surfaced by the production battery's anonymous-privacy probe, 2026-09-22).
export const metadata: Metadata = {
  title: "الملف الشخصي",
  description: "جلستك الحالية وبيانات حسابك من الخادم",
  robots: { index: false },
};

/** One review row — rating, comment, reply, direction label, dates.
 *  Optional children (the edit form) render INSIDE the row's <li>: a
 *  <ul> may only hold <li> directly, and the row IS the <li> — wrapping
 *  it in another <li> is invalid HTML and fails hydration (measured in
 *  the dev log, fixed 2026-09-25). */
function ReviewRow({
  review,
  children,
}: {
  review: ReviewView;
  children?: ReactNode;
}) {
  return (
    <li className="card post-card">
      <p className="listing-meta">
        <span className="listing-category" aria-label="التقييم">
          {new Intl.NumberFormat("ar").format(review.rating)} / ٥
        </span>
        <span>·</span>
        <span>{REVIEW_DIRECTION_LABELS[review.direction] ?? review.direction}</span>
        <span>·</span>
        <span>{formatDate(review.createdAt)}</span>
      </p>
      {review.comment ? <p className="post-body">{review.comment}</p> : null}
      {review.reply ? (
        <p className="listing-meta">
          <span>ردّ المزوّد:</span>
          <span> </span>
          <span>{review.reply}</span>
        </p>
      ) : null}
      {children}
    </li>
  );
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>الملف الشخصي</h1>
        <p className="page-note">
          لم تسجّل الدخول. <Link href="/">تسجيل الدخول</Link>
        </p>
      </main>
    );
  }

  const [me, backendUser] = await Promise.all([
    backendGet<MePayload>("/api/v1/users/me"),
    // The ME chain — the caller's backend user id powers the two
    // my-reviews reads (never a client-sent id).
    getMyBackendUser(),
  ]);

  // The my-reviews pair rides the public reviews reads keyed by the
  // caller's own user id (batch-2 spec §3): what I wrote (both
  // directions) + what providers said about me (the trust view).
  const [written, aboutMe] = backendUser.ok
    ? await Promise.all([
        getReviewsByReviewer(backendUser.id, 0, MY_REVIEWS_PAGE_SIZE),
        getReviewsOfConsumer(backendUser.id, 0, MY_REVIEWS_PAGE_SIZE),
      ])
    : [null, null];

  return (
    <main>
      <h1>الملف الشخصي</h1>
      <p>مسجّل الدخول باسم: {session.name || session.email}</p>

      {me.ok ? (
        <section className="card" aria-label="بيانات الحساب من الخادم">
          <h2>
            <code>GET /api/v1/users/me</code>
          </h2>
          <pre dir="ltr">{JSON.stringify(me.data, null, 2)}</pre>
          {/* GDPR Art. 20 (batch-2 spec §3): the data-subject export —
              a native browser download served by the app's own
              authenticated endpoint (the backend's document verbatim). */}
          <p>
            <a className="button" href="/api/account/export" download>
              صدّر بياناتي (JSON)
            </a>
          </p>
        </section>
      ) : me.status === 0 ? (
        <p className="page-note" role="status">
          الخادم الخلفي غير متاح حالياً — لا يمكن قراءة البيانات الآن.
        </p>
      ) : (
        <p className="page-note" role="status">
          {problemMessage(me.problem, `تعذّر قراءة البيانات (رمز ${me.status}).`)}
        </p>
      )}

      {written !== null ? (
        <section className="card" aria-labelledby="written-reviews-heading">
          <h2 id="written-reviews-heading">مراجعاتي</h2>
          {written.ok ? (
            written.data.content.length === 0 ? (
              <p className="page-note" role="status">
                لم تكتب مراجعات بعد — تُفتح بعد إتمام حجوزاتك.
              </p>
            ) : (
              <ul className="feed-list">
                {written.data.content.map((review) => (
                  <ReviewRow key={review.id} review={review}>
                    {/* The edit (PUT /reviews/{id}) — the original reviewer
                        alone; the backend's own 403 is the authority. */}
                    <ReviewEditForm
                      reviewId={review.id}
                      rating={review.rating}
                      comment={review.comment}
                    />
                  </ReviewRow>
                ))}
              </ul>
            )
          ) : (
            <p className="page-note" role="status">
              {problemMessage(written.problem, `تعذّرت قراءة مراجعاتك (رمز ${written.status}).`)}
            </p>
          )}
        </section>
      ) : (
        <p className="page-note" role="status">
          تعذّر تحديد هوية حسابك الخلفي — سجّل الدخول من جديد لقراءة مراجعاتك.
        </p>
      )}

      {aboutMe !== null ? (
        <section className="card" aria-labelledby="about-me-reviews-heading">
          <h2 id="about-me-reviews-heading">ما قاله المزوّدون عني</h2>
          {aboutMe.ok ? (
            aboutMe.data.content.length === 0 ? (
              <p className="page-note" role="status">
                لا مراجعات عنك بعد — تظهر هنا بعد حجوزاتك المكتملة.
              </p>
            ) : (
              <ul className="feed-list">
                {aboutMe.data.content.map((review) => (
                  <ReviewRow key={review.id} review={review} />
                ))}
              </ul>
            )
          ) : (
            <p className="page-note" role="status">
              {problemMessage(
                aboutMe.problem,
                `تعذّرت قراءة المراجعات عنك (رمز ${aboutMe.status}).`,
              )}
            </p>
          )}
        </section>
      ) : null}

      <p>
        <Link href="/">الرئيسية</Link> <SignOutButton />
      </p>
    </main>
  );
}
