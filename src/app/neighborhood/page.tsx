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
import { searchListings } from "@/lib/api/public";
import {
  CATEGORY_LABELS,
  FEED_PAGE_SIZE,
  POST_CATEGORIES,
  type PostCategory,
} from "@/lib/api/community-contract";
import { findGeoNodeById } from "@/lib/api/geo";
import { ListingCard } from "@/components/ui/card";
import {
  BUSINESS_RAIL_SIZE,
  DEMO_BUSINESSES,
  DEMO_PULSE,
  formatRating,
  neighborhoodDemoEnabled,
} from "@/lib/neighborhood-product";
import { CreatePostForm, DeletePostButton, LeaveForm, MessageNeighborButton } from "./forms";
import { CommentsSection, ReportContentForm } from "./comments";

/**
 * حارتي — the authenticated neighborhood home, rebuilt as the
 * INTEGRATED community+business product surface (slice S7, the
 * methodology reversal's first embodiment — owner directive
 * 2026-09-29: product-first, the frontend defines and the backend will
 * serve). Three layers in ONE screen, the Nextdoor + Business shape:
 *
 * 1. THE PLACE (the pulse band) — the neighborhood's identity and
 *    aliveness: members / weekly posts / local businesses. A
 *    product-defined contract (`NeighborhoodPulse`), display-labeled
 *    until the backend serves the aggregate — then the same band goes
 *    real with zero surface changes.
 * 2. THE BUSINESS LAYER (أعمال حارتك) — the neighborhood's local
 *    businesses with the trust vocabulary (rating/verified/offerings)
 *    — display-labeled today (the `NeighborhoodBusiness` contract the
 *    backend will serve), never linked (demo ids are not UUIDs).
 * 3. THE MARKETPLACE BRIDGE (إعلانات في حارتك) — REAL, live, today:
 *    the location-scoped public search read (`GET /search?locationId=`
 *    — measured live 2026-09-29, geo self+descendants resolution),
 *    real listing cards with real detail links. The community and the
 *    marketplace meet in one screen.
 *
 * The feed (L42) stays the heart — real posts, real comments, real
 * neighbor DMs — under the same privacy contract: everything community
 * answers 401 to anonymous callers (measured), so the honest anonymous
 * render is the gate itself. `noindex` — session-scoped content.
 */
export const metadata: Metadata = {
  title: "حارتي",
  description: "مجتمع جيرانك وأعمال حارتك — منشورات، توصيات، وإعلانات الحي",
  robots: { index: false },
};

type NeighborhoodPageProps = PageProps<"/neighborhood">;

/** The local-listings strip size — the marketplace bridge row. */
const LOCAL_LISTINGS_SIZE = 4;

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

/** Arabic-locale count formatting (the feed's own discipline). */
const count = (n: number) => new Intl.NumberFormat("ar").format(n);

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

  const [feed, me, localListings] = await Promise.all([
    getMyFeed(page, FEED_PAGE_SIZE, category),
    // My backend user id (the /me projection) — powers the feed's
    // self-message suppression; on failure every post keeps its button
    // and the backend's own 400-self guard answers honestly.
    getMyBackendUser(),
    // THE MARKETPLACE BRIDGE (real, live): the location-scoped public
    // search read — the same criteria op every public browse rides,
    // scoped by the membership's own locationId (the backend resolves
    // self+descendants; measured live 2026-09-29 on staging).
    searchListings({ locationId: membership.data.locationId }, 0, LOCAL_LISTINGS_SIZE),
  ]);
  const myBackendId = me.ok ? me.id : null;

  // The pulse band + the business rail: product-defined display layers
  // (clearly labeled, one env kill-switch, demo-prefixed ids, never
  // links) — see src/lib/neighborhood-product.ts for the discipline.
  const demoOn = neighborhoodDemoEnabled();
  const pulse = demoOn ? DEMO_PULSE[0] : null;
  const businesses = demoOn ? DEMO_BUSINESSES.slice(0, BUSINESS_RAIL_SIZE) : [];

  return (
    <main>
      <header className="hood-hero">
        <h1 className="hood-title">حارتي{neighborhoodName ? ` — ${neighborhoodName}` : ""}</h1>
        <p className="hood-hero-sub listing-meta">
          <span className="listing-category">{neighborhoodName ?? "حارة غير معروفة"}</span>
          <span>·</span>
          <span>عضو منذ {formatDate(membership.data.memberSince)}</span>
        </p>
        {pulse ? (
          <div className="hood-pulse" aria-label="نبض الحارة">
            <ul className="pulse-chips">
              <li className="pulse-chip">
                <strong>{count(pulse.members)}</strong>
                <span>جاراً</span>
              </li>
              <li className="pulse-chip">
                <strong>{count(pulse.postsThisWeek)}</strong>
                <span>منشوراً هذا الأسبوع</span>
              </li>
              <li className="pulse-chip">
                <strong>{count(pulse.localBusinesses)}</strong>
                <span>عملاً محلياً</span>
              </li>
            </ul>
            <p className="pulse-disclosure">بيانات عرض — قياسات الحي الحقيقية قادمة مع خدمة الباك اند لهذا العقد</p>
          </div>
        ) : null}
      </header>

      <div className="hood-layout">
        <aside className="hood-side">
          <section className="card member-card">
            <h2>عضويتك</h2>
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
          {businesses.length > 0 ? (
            <section className="hood-section" aria-labelledby="biz-heading">
              <div className="hood-section-head">
                <h2 id="biz-heading">أعمال حارتك</h2>
                <span className="badge badge-muted">بيانات عرض</span>
              </div>
              <ul className="biz-rail">
                {businesses.map((biz) => (
                  /* Display cards, never links (rule 4): the demo id is
                      not a backend UUID — the public provider read would
                      404, and a fake page would poison trust. */
                  <li key={biz.id} className="biz-card">
                    <p className="biz-trade">{biz.trade}</p>
                    <h3>{biz.name}</h3>
                    <p className="biz-tagline">{biz.tagline}</p>
                    <p className="biz-meta listing-meta">
                      {biz.rating !== null ? (
                        <span className="biz-rating" aria-label={`التقييم ${formatRating(biz.rating)} من ٥`}>
                          <span aria-hidden="true">★</span> {formatRating(biz.rating)}
                          <span className="biz-reviews">({count(biz.reviews)})</span>
                        </span>
                      ) : (
                        <span className="biz-rating biz-rating-new">جديد — بلا تقييمات بعد</span>
                      )}
                      {biz.verified ? <span className="biz-verified">موثّق</span> : null}
                      {biz.offerings > 0 ? (
                        <span>{count(biz.offerings)} عروض نشطة</span>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="page-note">
                دليل أعمال الحي — عندما تُفعَّل عقود الباك اند ستظهر الأعمال الحقيقية هنا بنفس البطاقات.
              </p>
            </section>
          ) : null}

          <section className="hood-section" aria-labelledby="local-heading">
            <div className="hood-section-head">
              <h2 id="local-heading">إعلانات في حارتك</h2>
            </div>
            {localListings.ok ? (
              localListings.data.content.length > 0 ? (
                <ul className="listing-grid">
                  {localListings.data.content.map((listing) => (
                    <li key={listing.id}>
                      <ListingCard listing={listing} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="page-note" role="status">
                  لا إعلانات نشطة في حارتك بعد.{" "}
                  <Link href="/listings">تصفّح كل إعلانات المنصة</Link>
                </p>
              )
            ) : (
              <p className="page-note" role="status">
                {localListings.status === 0
                  ? "الخادم الخلفي غير متاح حالياً — لا يمكن قراءة إعلانات الحي."
                  : problemMessage(
                      localListings.problem,
                      `تعذّرت قراءة إعلانات الحي (رمز ${localListings.status}).`,
                    )}
              </p>
            )}
          </section>

          <section aria-labelledby="feed-heading">
            <div className="hood-section-head">
              <h2 id="feed-heading">تغذية الحارة</h2>
            </div>
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
                    {count(feed.data.totalElements)} منشوراً — الصفحة{" "}
                    {count(feed.data.pageNumber + 1)} من{" "}
                    {count(Math.max(feed.data.totalPages, 1))}
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
