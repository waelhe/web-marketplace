import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { problemMessage } from "@/lib/problem";
import {
  getMyFeed,
  getMyMembership,
} from "@/lib/api/community";
import { getMyBackendUser } from "@/lib/api/inbox";
import {
  CATEGORY_LABELS,
  FEED_PAGE_SIZE,
  POST_CATEGORIES,
  type PostCategory,
} from "@/lib/api/community-contract";
import { findGeoNodeById } from "@/lib/api/geo";
import { CreatePostForm, DeletePostButton, LeaveForm, MessageNeighborButton } from "./forms";
import { CommentsSection, ReportContentForm } from "./comments";

/**
 * حارتي — the authenticated neighborhood home (roadmap stage 2's
 * consumer surface for L41 membership + L42 feed). The privacy model is
 * the backend's own contract, measured live: every community endpoint
 * answers 401 AUTHN-001 to anonymous callers, and the feed is
 * membership-scoped with no location parameter ("one membership, one
 * feed" — G-N1/G-N3). This page renders that model faithfully:
 *
 * - anonymous → the sign-in gate (never a feed fetch that would 401);
 * - signed-in without membership → the picker entry (join first);
 * - member → the membership card + the feed + the composer.
 *
 * The page is a private surface — `noindex` is the honest robots
 * contract for session-scoped content.
 */
export const metadata: Metadata = {
  title: "حارتي",
  description: "مجتمع جيرانك — منشورات حارتك",
  robots: { index: false },
};

type NeighborhoodPageProps = PageProps<"/neighborhood">;

/** Parse ?category= against the backend vocabulary — invalid values drop to null (no invented filters). */
function parseCategory(raw: string | string[] | undefined): PostCategory | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return POST_CATEGORIES.includes(value as PostCategory) ? (value as PostCategory) : null;
}

/** Parse ?page= (1-based for humans) into the backend's 0-based page. */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return parsed - 1;
}

export default async function NeighborhoodPage({ searchParams }: NeighborhoodPageProps) {
  const sp = await searchParams;
  const category = parseCategory(sp?.category);
  const page = parsePage(sp?.page);

  const session = await getSession();
  if (!session) {
    // The Nextdoor privacy gate: nothing community is public (measured
    // 401 contract) — the honest anonymous render is the gate itself.
    return (
      <main>
        <h1>حارتي</h1>
        <p className="page-note" role="status">
          هذا القسم لأعضاء الحارات — محتواه خاص بالجيران المسجّلين.
        </p>
        <SignInButton callbackURL="/neighborhood" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const membership = await getMyMembership();
  if (!membership.ok) {
    if (membership.status === 404) {
      // The backend's own state machine: no active membership — the
      // picker is the entry (join first; the feed would answer 403).
      return (
        <main>
          <h1>حارتي</h1>
          <p className="page-note" role="status">
            لم تنتمِ إلى حارة بعد — العضوية هي مفتاح تغذية الحارة.
          </p>
          <p>
            <Link className="button" data-variant="primary" href="/neighborhoods">
              اختر حارتك
            </Link>
          </p>
          <p>
            <Link href="/">الرئيسية</Link>
          </p>
        </main>
      );
    }
    return (
      <main>
        <h1>حارتي</h1>
        <p className="page-note" role="status">
          {membership.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(
                membership.problem,
                `تعذّر قراءة عضويتك (رمز ${membership.status}).`,
              )}
        </p>
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  // Resolve the neighborhood's display name through the public geo
  // surface — the backend's projection discipline keeps views
  // locationId-only; names are geo's concern (one memoized walk).
  const node = await findGeoNodeById(membership.data.locationId);
  const neighborhoodName = node?.nameAr ?? null;

  const [feed, me] = await Promise.all([
    getMyFeed(page, FEED_PAGE_SIZE, category),
    // My backend user id (the /me projection) — powers the feed's
    // self-message suppression; on failure every post keeps its button
    // and the backend's own 400-self guard answers honestly.
    getMyBackendUser(),
  ]);
  const myBackendId = me.ok ? me.id : null;

  return (
    <main>
      <h1 className="hood-title">حارتي{neighborhoodName ? ` — ${neighborhoodName}` : ""}</h1>

      <div className="hood-layout">
        <aside className="hood-side">
          <section className="card member-card">
            <h2>عضويتك</h2>
            <p className="listing-meta">
              <span className="listing-category">{neighborhoodName ?? "حارة غير معروفة"}</span>
              <span>·</span>
              <span>عضو منذ {formatDate(membership.data.memberSince)}</span>
            </p>
            <p className="page-note">
              {/* SELF_DECLARED is the measured verificationState — the
                  verification method itself is a pending backend product gate. */}
              {membership.data.verificationState === "SELF_DECLARED"
                ? "عضوية معلَنة ذاتياً — التحقق من السكان بوابة منتج لاحقة."
                : `حالة التحقق: ${membership.data.verificationState}`}
            </p>
            <LeaveForm />
          </section>

          <nav className="category-filter" aria-label="تصفية الفئات">
            <Link
              href="/neighborhood"
              className={category === null ? "button" : "button"}
              data-variant={category === null ? "primary" : undefined}
            >
              الكل
            </Link>
            {POST_CATEGORIES.map((value) => (
              <Link
                key={value}
                href={`/neighborhood?category=${value}`}
                className="button"
                data-variant={category === value ? "primary" : undefined}
              >
                {CATEGORY_LABELS[value]}
              </Link>
            ))}
          </nav>

          <section className="post-composer-section">
            <h2>انشر في حارتك</h2>
            <CreatePostForm locationId={membership.data.locationId} />
          </section>
        </aside>

        <section className="hood-main">
          <section>
            <h2>تغذية الحارة</h2>
            {feed.ok ? (
              feed.data.content.length === 0 ? (
                page > 0 && feed.data.totalElements > 0 ? (
                  <p className="page-note" role="status">
                    لا منشورات في هذه الصفحة.{" "}
                    <Link href="/neighborhood">العودة إلى الأولى</Link>
                  </p>
                ) : (
                  <p className="page-note" role="status">
                    لا منشورات في حارتك بعد — كن أول من يكتب لجيرانه من نموذج النشر.
                  </p>
                )
              ) : (
                <>
                  <p className="page-note">
                    {new Intl.NumberFormat("ar").format(feed.data.totalElements)} منشوراً —
                    الصفحة {new Intl.NumberFormat("ar").format(feed.data.pageNumber + 1)} من{" "}
                    {new Intl.NumberFormat("ar").format(Math.max(feed.data.totalPages, 1))}
                  </p>
                  <ul className="feed-list">
                    {feed.data.content.map((post) => (
                      <li key={post.id} className="hood-post">
                        <h3>{post.title}</h3>
                        <p className="hood-post-meta">
                          {/* The author is an opaque UUID by the backend's
                              projection contract — the avatar shows the first
                              two characters, the only identity signal that
                              contract carries. No invented name, no "user"
                              label (the contract carries none). */}
                          <span className="hood-avatar" aria-hidden="true">
                            {post.authorId.slice(0, 2).toUpperCase()}
                          </span>
                          <span className={`hood-cat hood-cat-${post.category.toLowerCase()}`}>
                            {CATEGORY_LABELS[post.category]}
                          </span>
                          <span>{formatDate(post.createdAt)}</span>
                        </p>
                        <p className="post-body">{post.body}</p>
                        {/* L42's conversational layer (batch-2 spec §1): the
                            comments disclosure — an on-demand read, so a closed
                            post costs the feed render nothing. */}
                        <CommentsSection postId={post.id} />
                        <div className="post-actions">
                          {/* L44 entry: message the author (hidden on my own
                              posts via the measured /me identity chain — the
                              backend's 400-self guard remains the authority). */}
                          {myBackendId === null || post.authorId !== myBackendId ? (
                            <MessageNeighborButton authorId={post.authorId} />
                          ) : (
                            <DeletePostButton postId={post.id} />
                          )}
                          {/* L45 entry: report this content (authenticated; no
                              membership condition — the backend's own gate). */}
                          <ReportContentForm targetType="POST" targetId={post.id} />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <nav className="listing-pager" aria-label="تصفّح الصفحات">
                    {feed.data.pageNumber > 0 ? (
                      <Link
                        className="button"
                        href={`/neighborhood?${category ? `category=${category}&` : ""}page=${feed.data.pageNumber}`}
                      >
                        الصفحة السابقة
                      </Link>
                    ) : null}
                    {!feed.data.last ? (
                      <Link
                        className="button"
                        href={`/neighborhood?${category ? `category=${category}&` : ""}page=${feed.data.pageNumber + 2}`}
                      >
                        الصفحة التالية
                      </Link>
                    ) : null}
                  </nav>
                </>
              )
            ) : feed.status === 403 ? (
              <p className="page-note" role="status">
                عضويتك لم تعد فعّالة — غادِر ثم انضم من جديد إلى حارتك.
              </p>
            ) : (
              <p className="page-note" role="status">
                {feed.unauthenticated
                  ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
                  : problemMessage(feed.problem, `تعذّر قراءة التغذية (رمز ${feed.status}).`)}
              </p>
            )}
          </section>
        </section>
      </div>

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
