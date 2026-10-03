import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getReviewerPublicProfile,
  getReviewsByReviewer,
} from "@/lib/api/reputation";
import {
  MY_REVIEWS_PAGE_SIZE,
  REVIEW_ORIGIN_LABELS,
  REVIEWER_BADGE_LABELS,
  type ReviewerBadge,
} from "@/lib/api/reputation-contract";
import { formatDate, formatDateTime } from "@/lib/format";
import { problemMessage } from "@/lib/problem";

// W4 (yelp-level plan §5 — G28/G29, #494): the PUBLIC REVIEWER PAGE —
// the click target every review row's own reviewerId carries
// («نقرة من مراجعة إلى صفحة المراجع تكشف نشاطه»). Two anonymous reads
// under the SAME key (users.id — no id-space seam): the identity block
// (`GET /users/{id}/public`: the pseudonym-honouring name, the join
// timestamp, the verified/organic published counters, the cumulative
// helpful-vote total, the DERIVED badges) and the activity block (the
// existing `GET /reviews/reviewer/{id}`: his PUBLISHED reviews, newest
// first, paged — the same public surface the provider pages link
// through).
//
// Honest limits stated on the page itself: the served review rows
// carry NO provider attribution (the ReviewResponse contract — the
// backend's own W4 design keeps the reviewer page provider-less), and
// a live account with no published reviews renders the honest zero
// profile (the counters at zero, no badges — never a fabricated
// activity). An unknown reviewer answers 404 — the page mirrors it.
//
// Crawler-visible: the endpoint has no auth gate (the SecurityConfig
// precise-wildcard line — the L36 precedent), so the page is the
// reputation domain's THIRD public surface (the provider page's twin
// for the reviewing side of the trust graph).

type ReviewerPageProps = PageProps<"/users/[id]">;

/** Parse ?page= (1-based for humans) into the backend's 0-based page. */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return parsed - 1;
}

export async function generateMetadata({
  params,
}: ReviewerPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getReviewerPublicProfile(id);

  if (!result.ok) {
    // Unknown reviewer: the page itself answers 404 — keep the URL out
    // of indexes meanwhile.
    return {
      title: "مراجع غير موجود",
      robots: { index: false },
    };
  }

  const reviewer = result.data;
  return {
    title: `${reviewer.displayName} — مراجع في السوق`,
    description: `${reviewer.displayName}: ${new Intl.NumberFormat("ar").format(
      reviewer.verifiedReviewCount,
    )} مراجعة موثّقة و${new Intl.NumberFormat("ar").format(
      reviewer.organicReviewCount,
    )} مراجعة عامة منشورة — نشاط المراجع في السوق.`,
    alternates: { canonical: `/users/${reviewer.reviewerId}` },
    openGraph: {
      title: `${reviewer.displayName} — مراجع في السوق`,
      type: "profile",
      url: `/users/${reviewer.reviewerId}`,
    },
  };
}

export default async function ReviewerPublicPage({
  params,
  searchParams,
}: ReviewerPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const page = parsePage(sp?.page);

  const profile = await getReviewerPublicProfile(id);
  if (!profile.ok) {
    if (profile.status === 404) {
      // The backend's own contract: unknown reviewer ids answer 404 on
      // the public profile read — the page mirrors it.
      notFound();
    }
    return (
      <main>
        <h1>صفحة المراجع</h1>
        {profile.status === 0 ? (
          <p className="page-note" role="status">
            الخادم الخلفي غير متاح حالياً — لا يمكن قراءة صفحة المراجع الآن.
          </p>
        ) : (
          <p className="page-note" role="status">
            {problemMessage(profile.problem, `تعذّرت قراءة صفحة المراجع (رمز ${profile.status}).`)}
          </p>
        )}
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const reviewer = profile.data;
  const activity = await getReviewsByReviewer(id, page, MY_REVIEWS_PAGE_SIZE);
  // The activity read degrades honestly (the N4 lesson): the identity
  // block stays authoritative — a failed reviews read renders the
  // profile with the honest unavailable note, never a crash.
  const reviews = activity.ok ? activity.data : null;

  return (
    <main>
      <p className="listing-crumb">
        <Link href="/">الرئيسية</Link> / <span>{reviewer.displayName}</span>
      </p>
      <h1>{reviewer.displayName}</h1>

      <section className="card" aria-label="ملف المراجع العام">
        <p className="listing-meta">
          <span>عضو منذ {formatDate(reviewer.joinedAt)}</span>
        </p>
        <p className="listing-meta">
          <span className="stat-value">
            {new Intl.NumberFormat("ar").format(reviewer.verifiedReviewCount)}
          </span>
          <span>مراجعة موثّقة</span>
          <span>·</span>
          <span className="stat-value">
            {new Intl.NumberFormat("ar").format(reviewer.organicReviewCount)}
          </span>
          <span>مراجعة عامة</span>
          <span>·</span>
          <span className="stat-value">
            {new Intl.NumberFormat("ar").format(reviewer.helpfulVoteCount)}
          </span>
          <span>صوت مفيد تلقّته مراجعاته</span>
        </p>
        {reviewer.badges.length > 0 ? (
          <p className="listing-meta" aria-label="أوسمة المراجع">
            {reviewer.badges.map((badge: ReviewerBadge, index: number) => (
              <span key={badge}>
                {index > 0 ? <span>·</span> : null}
                <span className="listing-category" data-badge={badge}>
                  {REVIEWER_BADGE_LABELS[badge] ?? badge}
                </span>
              </span>
            ))}
          </p>
        ) : (
          <p className="page-note">لا أوسمة بعد — تُشتق من نشاط المراجعة نفسه.</p>
        )}
      </section>

      <section className="card" aria-labelledby="reviewer-activity-heading">
        <h2 id="reviewer-activity-heading">نشاط المراجع</h2>
        {!reviews ? (
          <p className="page-note" role="status">
            تعذّرت قراءة مراجعات هذا العضو الآن — عد وحاول لاحقاً.
          </p>
        ) : reviews.content.length === 0 ? (
          <p className="page-note" role="status">
            لا مراجعات منشورة بعد لهذا العضو.
          </p>
        ) : (
          <>
            <p className="page-note">
              {new Intl.NumberFormat("ar").format(reviews.totalElements)} مراجعة منشورة —
              الصفحة {new Intl.NumberFormat("ar").format(reviews.pageNumber + 1)} من{" "}
              {new Intl.NumberFormat("ar").format(Math.max(reviews.totalPages, 1))}
            </p>
            <ul className="feed-list">
              {reviews.content.map((review) => (
                <li key={review.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="منشأ المراجعة">
                      {REVIEW_ORIGIN_LABELS[review.origin] ?? review.origin}
                    </span>
                    <span>·</span>
                    <span className="stat-value">
                      {new Intl.NumberFormat("ar").format(review.rating)}
                    </span>
                    <span>من ٥</span>
                    <span>·</span>
                    <span>{formatDateTime(review.createdAt)}</span>
                  </p>
                  {review.comment ? (
                    <p className="listing-description">{review.comment}</p>
                  ) : null}
                  <p className="page-note">
                    {new Intl.NumberFormat("ar").format(review.helpfulCount)} صوت مفيد
                  </p>
                </li>
              ))}
            </ul>
            <nav className="listing-pager" aria-label="تصفّح نشاط المراجع">
              {reviews.pageNumber > 0 ? (
                <Link className="button" href={`/users/${reviewer.reviewerId}?page=${reviews.pageNumber}`}>
                  مراجعات أحدث
                </Link>
              ) : null}
              {!reviews.last ? (
                <Link className="button" href={`/users/${reviewer.reviewerId}?page=${reviews.pageNumber + 2}`}>
                  مراجعات أقدم
                </Link>
              ) : null}
            </nav>
          </>
        )}
        <p className="page-note">
          تعرض هذه الصفحة المراجعات المنشورة فقط كما يخدمها العقد العام —
          وتُعرض صفوف المراجع نفسه (بكل حالات الاعتدال) في «مراجعاتي» على
          صفحته الخاصة.
        </p>
      </section>

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
