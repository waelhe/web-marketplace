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
  CATEGORY_TONES,
  FEED_PAGE_SIZE,
  POST_CATEGORIES,
  parseVerificationState,
  type PostCategory,
} from "@/lib/api/community-contract";
import { ListingCard } from "@/components/ui/card";
import {
  DEMO_POLL,
  DEMO_WEATHER,
  airQualityBand,
  neighborhoodDemoEnabled,
} from "@/lib/neighborhood-product";
import { DEMO_EVENTS, formatEventDay, formatEventMonth } from "@/lib/neighborhood-events";
import {
  DEMO_CHARTER,
  DEMO_EMERGENCY_CONTACTS,
  DEMO_MOOD,
  DEMO_OWNER_ALERTS,
  DEMO_OWNER_GROUPS,
  DEMO_OWNER_POSTS,
  DEMO_OWNER_PULSE,
  ownerCount,
  type OwnerFeedPost,
} from "@/lib/neighborhood-design";
import { CreatePostForm, DeletePostButton, LeaveForm, MessageNeighborButton, ReactButton, VerificationCard } from "./forms";
import { CommentsSection, ReportContentForm } from "./comments";
import { AlertCard } from "./alert-card";
import { PollCard } from "./poll-card";

/**
 * خلاصة الحي — the neighborhood feed under the owner's own design
 * (slice S10: the supplied HTML made executable — the حيّنا shell
 * wraps this surface; this page is the design's first screen).
 *
 * The owner-supplied anatomy, verbatim: the mood banner (greeting +
 * zone chip + the strength line + the live metrics), the share
 * composer (quick-type chips + scope — the REAL category write), the
 * filter pills (the REAL ?category= reads), the featured zone (the
 * pinned urgent alert with the works map + the interactive poll),
 * the rich display posts (recommendation with the embedded service
 * card, lost&found, the new-neighbor welcome — the owner's own
 * content, display-labeled), the REAL feed under the same skin (the
 * L42 read with comments, DMs, reports, deletes — unchanged
 * channels), and the smart sidebar (weather, pulse with the safety
 * ring, upcoming events, the emergency directory with the REAL 940
 * line, the groups, the charter).
 *
 * The privacy contract is unchanged: everything community answers
 * 401 to anonymous callers (measured), so the honest anonymous
 * render is the gate itself. `noindex` — session-scoped content.
 */
export const metadata: Metadata = {
  title: "خلاصة الحي — حيّنا",
  description: "خلاصة جيرانك — منشورات، توصيات، مفقودات، فعاليات، وأعمال حارتك",
  robots: { index: false },
};

type NeighborhoodPageProps = PageProps<"/neighborhood">;

/** The local-listings strip size — the marketplace bridge row. */
const LOCAL_LISTINGS_SIZE = 4;

/** Latin-digit one-decimal rating — the owner's own number style. */
const ratingLatn = (rating: number) =>
  new Intl.NumberFormat("ar-u-nu-latn", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);

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

/**
 * L48: parse ?photoFailures= — the composer's honest partial-success note
 * (the action redirects with it when the post's TEXT went live but some
 * photos failed their presigned round). Any non-positive garbage drops to
 * null — the note renders only for a real count.
 */
function parsePhotoFailures(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

/** The category chip's tone — the design's four colored vocabularies
 * (shared from the contract module — the S10 mapping, N1's home). */

export default async function NeighborhoodPage({ searchParams }: NeighborhoodPageProps) {
  const sp = await searchParams;
  const category = parseCategory(sp?.category);
  const page = parsePage(sp?.page);
  const photoFailures = parsePhotoFailures(sp?.photoFailures);

  const session = await getSession();
  if (!session) {
    // The Nextdoor privacy gate: nothing community is public (measured
    // 401 contract) — the honest anonymous render is the gate itself,
    // inside the design's own shell.
    return (
      <main>
        <h1>حيّنا</h1>
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
          <h1>حيّنا</h1>
          <p className="page-note" role="status">
            لم تنتمِ إلى حارة بعد — العضوية هي مفتاح تغذية الحي.
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
        <h1>حيّنا</h1>
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

  // The S10 owner-design display layers (clearly labeled, one env
  // kill-switch, demo-prefixed ids, never links) — see
  // src/lib/neighborhood-design.ts for the discipline.
  const demoOn = neighborhoodDemoEnabled();
  const mood = demoOn ? DEMO_MOOD[0] ?? null : null;
  const alert = demoOn ? DEMO_OWNER_ALERTS[0] ?? null : null;
  const poll = demoOn ? DEMO_POLL[0] ?? null : null;
  const weather = demoOn ? DEMO_WEATHER[0] ?? null : null;
  const pulse = demoOn ? DEMO_OWNER_PULSE[0] ?? null : null;
  const ownerPosts = demoOn ? DEMO_OWNER_POSTS : [];
  const emergencyContacts = demoOn ? DEMO_EMERGENCY_CONTACTS : [];
  const groups = demoOn ? DEMO_OWNER_GROUPS : [];
  const charter = demoOn ? DEMO_CHARTER[0] ?? null : null;
  // The upcoming-events preview (the sidebar's «الفعاليات القريبة» —
  // the design's widget): the next two demo gatherings, linked to the
  // events wing (the product's own surface, slice S9).
  const upcomingEvents = demoOn ? DEMO_EVENTS.slice(0, 2) : [];

  return (
    <main>
      {/* THE MOOD BANNER — the design's ambient greeting strip. */}
      {mood ? (
        <section className="hy-mood" aria-label="ترحيب الحي">
          <div className="hy-mood-inner">
            <div className="hy-mood-id">
              <span className="hy-mood-icon" aria-hidden="true">
                <span className="material-symbols-outlined">wb_sunny</span>
              </span>
              <div>
                <p className="hy-mood-title-row">
                  <span className="hy-mood-title">{mood.greeting}</span>
                  <span className="hy-mood-zone">
                    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.75rem" }}>
                      location_on
                    </span>
                    {mood.zoneChip}
                  </span>
                </p>
                <p className="hy-mood-strength">
                  {mood.strength} • {ownerCount(mood.families)} عائلة • {mood.gateWatch}
                </p>
              </div>
            </div>
            <div className="hy-mood-metrics">
              <span className="hy-mood-metric">
                <strong>{ownerCount(mood.families)}</strong> عائلة مسجلة
              </span>
              <span className="hy-mood-metric hy-mood-metric-live">{mood.gateWatch}</span>
            </div>
          </div>
          <p className="hy-badge-demo" style={{ position: "absolute", insetBlockEnd: "0.5rem", insetInlineEnd: "0.75rem" }}>
            بيانات عرض
          </p>
        </section>
      ) : null}

      <div className="hy-grid">
        <section className="hy-grid-main">
          {/* THE SHARE COMPOSER — the product's front door: quick-type
              chips over the measured category vocabulary + the scope
              selector. Real writes, the honest «قريبًا» gates. */}
          <section className="hy-card" aria-labelledby="composer-heading">
            <h2 id="composer-heading" className="visually-hidden">
              انشر في حيّك
            </h2>
            <CreatePostForm locationId={membership.data.locationId} />
          </section>

          {/* The filter pills — the REAL ?category= reads (the backend's
              own filter), presented as the design's chip row. */}
          <nav className="hy-filter" aria-label="تصنيفات الخلاصة">
            <Link href="/neighborhood" className="hy-pill" data-active={category === null || undefined}>
              الكل
            </Link>
            {POST_CATEGORIES.map((value) => (
              <Link
                key={value}
                href={`/neighborhood?category=${value}`}
                className="hy-pill"
                data-active={category === value || undefined}
              >
                {CATEGORY_LABELS[value]}
              </Link>
            ))}
          </nav>

          {/* THE FEATURED ZONE — the design's pinned urgent alert and
              community poll: product-defined contracts, display-labeled,
              interactive as display interactions (never fake writes). */}
          {alert || poll ? (
            <section aria-label="مختارات الحي" className="hy-grid-main">
              {alert ? <AlertCard alert={alert} /> : null}
              {poll ? <PollCard poll={poll} /> : null}
            </section>
          ) : null}

          {/* The owner's own display posts — the rich cards of the
              supplied design (recommendation / lost&found / welcome),
              display-labeled, never links. */}
          {ownerPosts.length > 0 ? (
            <section aria-label="منشورات عرض الحي" className="hy-grid-main">
              {ownerPosts.map((post) => (
                <OwnerPostCard key={post.id} post={post} />
              ))}
            </section>
          ) : null}

          {/* THE REAL FEED — the L42 read under the owner's skin: real
              posts, real comments, real neighbor DMs, real reports. */}
          <section className="hy-card" id="feed" aria-labelledby="feed-heading">
            <div className="hy-real-head">
              <h2 id="feed-heading" className="hy-section-title">
                <span className="material-symbols-outlined" aria-hidden="true">
                  forum
                </span>
                منشورات جيرانك
              </h2>
              {feed.ok ? (
                <span className="hy-real-count">
                  {new Intl.NumberFormat("ar").format(feed.data.totalElements)} منشورًا
                </span>
              ) : null}
            </div>
            {/* L48: the composer's partial-success note — the post's text
                IS live (the action redirected after the write); the count
                of photos that failed their presigned round rides the URL,
                never an invented state. One honest line, then the feed. */}
            {photoFailures !== null ? (
              <p className="hy-photo-note" role="status">
                <span className="material-symbols-outlined" aria-hidden="true">
                  photo_camera
                </span>
                نُشر منشورك نصًّا، لكن {photoFailures === 1 ? "صورة واحدة تعذّر رفعها" : `${new Intl.NumberFormat("ar").format(photoFailures)} صور تعذّر رفعها`} — أعد المحاولة من منشور جديد أو لاحقًا.
              </p>
            ) : null}
            {feed.ok ? (
              feed.data.content.length === 0 ? (
                page > 0 && feed.data.totalElements > 0 ? (
                  <p className="hy-empty" role="status">
                    لا منشورات في هذه الصفحة. <Link href="/neighborhood">العودة إلى الأولى</Link>
                  </p>
                ) : (
                  <p className="hy-empty" role="status">
                    لا منشورات في حيّك بعد — كن أول من يكتب لجيرانه من صندوق المشاركة.
                  </p>
                )
              ) : (
                <>
                  <ul className="hy-real-list">
                    {feed.data.content.map((post) => (
                      <li key={post.id} className="hy-real-item">
                        <header className="hy-post-head">
                          <div className="hy-post-id">
                            {/* The author is an opaque UUID by the backend's
                                projection contract — the avatar shows the first
                                two characters, the only identity signal that
                                contract carries. No invented name, no "user"
                                label (the contract carries none). */}
                            <span className="hy-avatar" data-tone="primary" aria-hidden="true">
                              {post.authorId.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="hy-post-chip" data-tone={CATEGORY_TONES[post.category]}>
                              {CATEGORY_LABELS[post.category]}
                            </span>
                          </div>
                          <time className="hy-post-meta" dateTime={post.createdAt}>
                            {formatDate(post.createdAt)}
                          </time>
                        </header>
                        <h3 className="hy-real-title">{post.title}</h3>
                        <p className="hy-real-body">{post.body}</p>
                        {/* L48 — post images (gap #2): the REAL photos the
                            feed row itself carries (the backend's widened
                            projection — one grouped read, no second call).
                            The gallery renders only when the contract has
                            entries: a photo-less post keeps the honest
                            card the L42 feed always drew. The thumbnail is
                            the feed's own cheap read (L28: null until
                            processed → fall back to the original — the
                            contract's documented fallback, no invented
                            placeholder pixels). */}
                        {post.media.length > 0 ? (
                          <div className="hy-real-media" data-count={post.media.length}>
                            {post.media.map((photo) => (
                              <a
                                key={photo.mediaId}
                                href={photo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hy-real-photo"
                                aria-label="افتح الصورة بالحجم الأصلي"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element --
                                    presigned storage URLs, not the image
                                    optimization pipeline (the asset lives on
                                    Backblaze B2 with its own signature;
                                    next/image would proxy and re-sign what
                                    the backend already signed) */}
                                <img
                                  src={photo.thumbUrl ?? photo.url}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                />
                              </a>
                            ))}
                          </div>
                        ) : null}
                        {/* L42's conversational layer: the comments
                            disclosure — an on-demand read, so a closed post
                            costs the feed render nothing. */}
                        <CommentsSection postId={post.id} />
                        <div className="hy-real-actions">
                          {/* L47 — the reaction toggle, FIRST on the action
                              bar (Nextdoor's own signature): the count and
                              the caller's own voice ride the feed read
                              itself (reactionsCount / reactedByMe — the
                              backend's widened projection), the backend's
                              409-one-voice gate stays the authority. */}
                          <ReactButton
                            postId={post.id}
                            reactionsCount={post.reactionsCount}
                            reactedByMe={post.reactedByMe}
                          />
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
                  <nav className="hy-pager" aria-label="تصفّح الصفحات">
                    {feed.data.pageNumber > 0 ? (
                      <Link
                        className="hy-btn hy-btn-soft"
                        href={`/neighborhood?${category ? `category=${category}&` : ""}page=${feed.data.pageNumber}`}
                      >
                        الصفحة السابقة
                      </Link>
                    ) : null}
                    {!feed.data.last ? (
                      <Link
                        className="hy-btn hy-btn-soft"
                        href={`/neighborhood?${category ? `category=${category}&` : ""}page=${feed.data.pageNumber + 2}`}
                      >
                        الصفحة التالية
                      </Link>
                    ) : null}
                  </nav>
                </>
              )
            ) : feed.status === 403 ? (
              <p className="hy-state" role="status">
                عضويتك لم تعد فعّالة — غادِر ثم انضم من جديد إلى حيّك.
              </p>
            ) : (
              <p className="hy-state" role="status">
                {feed.unauthenticated
                  ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
                  : problemMessage(feed.problem, `تعذّر قراءة التغذية (رمز ${feed.status}).`)}
              </p>
            )}
          </section>

          {/* THE MARKETPLACE BRIDGE — the real location-scoped public
              read (unchanged channel, the platform's own card). */}
          <section className="hy-card" aria-labelledby="local-heading">
            <div className="hy-section-head">
              <h2 id="local-heading" className="hy-section-title">
                <span className="material-symbols-outlined" aria-hidden="true">
                  storefront
                </span>
                إعلانات في حيّك
              </h2>
              <Link href="/neighborhood/market" className="hy-btn hy-btn-soft">
                سوق الحي
              </Link>
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
                <p className="hy-empty" role="status">
                  لا إعلانات نشطة في حيّك بعد.{" "}
                  <Link href="/listings">تصفّح كل إعلانات المنصة</Link>
                </p>
              )
            ) : (
              <p className="hy-state" role="status">
                {localListings.status === 0
                  ? "الخادم الخلفي غير متاح حاليًا — لا يمكن قراءة إعلانات الحي."
                  : problemMessage(
                      localListings.problem,
                      `تعذّرت قراءة إعلانات الحي (رمز ${localListings.status}).`,
                    )}
              </p>
            )}
          </section>
        </section>

        <aside className="hy-grid-side">
          {/* The member's own state — the REAL membership read. */}
          <section className="hy-card" aria-labelledby="member-heading">
            <h2 id="member-heading" className="hy-widget-title">
              عضويتك
            </h2>
            {/* The verification lifecycle's own render (gap #3): the
                MEASURED vocabulary — «جار موثق» only for VERIFIED, the
                honest «عضو» floor for everything else, and the review
                request where the backend's contract allows it. */}
            <VerificationCard state={parseVerificationState(membership.data.verificationState)} />
            <p className="hy-post-meta">عضو منذ {formatDate(membership.data.memberSince)}</p>
            <LeaveForm />
          </section>

          {/* The weather widget — the design's microclimate card. */}
          {weather ? (
            <section className="hy-card" aria-labelledby="weather-heading">
              <div className="hy-widget-head">
                <h2 id="weather-heading" className="hy-widget-title">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    thermostat
                  </span>
                  طقس وبيئة الحي
                </h2>
                <span className="hy-badge-demo">بيانات عرض</span>
              </div>
              <div className="hy-weather-now">
                <div>
                  <p className="hy-weather-temp">
                    {ownerCount(weather.temperature)}°<span>م</span>
                  </p>
                  <p className="hy-weather-desc">{weather.condition}</p>
                </div>
                <span className="hy-weather-icon" aria-hidden="true">
                  <span className="material-symbols-outlined">sunny</span>
                </span>
              </div>
              <div className="hy-weather-aqi">
                <div className="hy-weather-aqi-id">
                  <span className="material-symbols-outlined" aria-hidden="true">air</span>
                  <div>
                    <strong>
                      جودة الهواء: {airQualityBand(weather.airQuality)} ({ownerCount(weather.airQuality)})
                    </strong>
                    <span>{weather.walkability}</span>
                  </div>
                </div>
                <span className="hy-aqi-dot" aria-hidden="true" />
              </div>
            </section>
          ) : null}

          {/* نبض الحي — the design's pulse widget + the safety ring. */}
          {pulse ? (
            <section className="hy-card" aria-labelledby="pulse-heading">
              <div className="hy-widget-head">
                <h2 id="pulse-heading" className="hy-widget-title">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    monitoring
                  </span>
                  نبض الحي اليوم
                </h2>
                <span className="hy-badge-demo">بيانات عرض</span>
              </div>
              <div className="hy-pulse-grid">
                <div className="hy-pulse-tile">
                  <span className="hy-pulse-tile-label">جيران نشطون الآن</span>
                  <span className="hy-pulse-tile-value">
                    <strong>{ownerCount(pulse.onlineNow)}</strong>
                    <span className="hy-pulse-tile-unit">جار متصل</span>
                  </span>
                </div>
                <div className="hy-pulse-tile">
                  <span className="hy-pulse-tile-label">طلبات حُلّت هذا الأسبوع</span>
                  <span className="hy-pulse-tile-value" data-tone="tertiary">
                    <strong>{ownerCount(pulse.solvedThisWeek)}</strong>
                    <span className="hy-pulse-tile-unit">مبادرة منجزة</span>
                  </span>
                </div>
              </div>
              <div className="hy-safety-ring">
                <div className="hy-safety-ring-id">
                  <strong>{pulse.safetyTitle}</strong>
                  <span>{pulse.safetyNote}</span>
                </div>
                <div className="hy-ring" role="img" aria-label={`${ownerCount(pulse.safetyPercent)}% ${pulse.safetyTitle}`}>
                  <svg viewBox="0 0 36 36" aria-hidden="true">
                    <circle className="hy-ring-track" cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" strokeWidth="3.5" />
                    <circle
                      className="hy-ring-value"
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={`${pulse.safetyPercent}, 100`}
                    />
                  </svg>
                  <span className="hy-ring-label">{ownerCount(pulse.safetyPercent)}%</span>
                </div>
              </div>
            </section>
          ) : null}

          {/* الفعاليات القريبة — the S9 events source under the new skin. */}
          {upcomingEvents.length > 0 ? (
            <section className="hy-card" aria-labelledby="upcoming-heading">
              <div className="hy-widget-head">
                <h2 id="upcoming-heading" className="hy-widget-title">
                  <span className="material-symbols-outlined" aria-hidden="true">event</span>
                  فعاليات قريبة
                </h2>
                <span className="hy-badge-demo">بيانات عرض</span>
              </div>
              <ul className="hy-events-list">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="hy-event-row">
                    <span className="hy-event-date" aria-hidden="true">
                      <span>{formatEventMonth(event.startsAt)}</span>
                      <strong>{formatEventDay(event.startsAt)}</strong>
                    </span>
                    <span className="hy-event-id">
                      <span className="hy-event-title">{event.title}</span>
                      <span className="hy-event-meta">{event.location}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link className="hy-btn hy-btn-soft" href="/neighborhood/events">
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                كل فعاليات الحي
              </Link>
            </section>
          ) : null}

          {/* طوارئ وتواصل الحي السريع — the emergency directory (the
              municipality's 940 line is the one REAL number). */}
          {emergencyContacts.length > 0 ? (
            <section className="hy-card" aria-labelledby="emergency-heading">
              <div className="hy-widget-head">
                <h2 id="emergency-heading" className="hy-widget-title">
                  <span className="material-symbols-outlined" aria-hidden="true" style={{ color: "var(--hy-error)" }}>
                    emergency
                  </span>
                  طوارئ وتواصل الحي السريع
                </h2>
                <span className="hy-badge-demo">بيانات عرض</span>
              </div>
              <ul className="hy-contact-list">
                {emergencyContacts.map((contact) => (
                  <li key={contact.id} className="hy-contact-row">
                    <div className="hy-contact-id">
                      <span className="hy-icon-tile" data-tone={contact.tone === "neutral" ? "neutral" : contact.tone === "primary" ? "primary" : "secondary"}>
                        <span className="material-symbols-outlined">{contact.icon}</span>
                      </span>
                      <div>
                        <span className="hy-contact-name">{contact.name}</span>
                        <span className="hy-contact-note">{contact.note}</span>
                      </div>
                    </div>
                    {contact.id === "demo-emergency-municipality" ? (
                      /* The municipality's own published emergency line —
                          the one REAL number in the design's directory. */
                      <a
                        className="hy-contact-call"
                        data-tone="primary"
                        href="tel:940"
                        title="اتصال فوري — طوارئ أمانة الشمال 940"
                        aria-label={`اتصال بـ ${contact.name}`}
                      >
                        <span className="material-symbols-outlined">call</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="hy-contact-call"
                        data-tone="neutral"
                        disabled
                        title="قريبًا — الأرقام المباشرة بانتظار عقد التواصل لدى الباك اند"
                        aria-label={`اتصال بـ ${contact.name}`}
                      >
                        <span className="material-symbols-outlined">call</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* مجموعات الحي التخصصية — the design's clubs widget. */}
          {groups.length > 0 ? (
            <section className="hy-card" aria-labelledby="groups-heading">
              <div className="hy-widget-head">
                <h2 id="groups-heading" className="hy-widget-title">
                  <span className="material-symbols-outlined" aria-hidden="true">groups_3</span>
                  مجموعات الحي التخصصية
                </h2>
                <span className="hy-badge-demo">بيانات عرض</span>
              </div>
              <ul className="hy-group-list">
                {groups.map((group) => (
                  /* Display rows, never links (rule 4): no group surfaces
                      exist — a demo id link would 404. */
                  <li key={group.id} className="hy-group-row">
                    <div className="hy-group-id">
                      <span className="hy-group-icon" data-tone={group.tone}>
                        <span className="material-symbols-outlined">{group.icon}</span>
                      </span>
                      <div>
                        <span className="hy-group-name">{group.name}</span>
                        <span className="hy-group-meta">{group.meta}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="hy-btn hy-btn-soft"
                      disabled
                      title={group.joinGate}
                    >
                      انضمام
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* ميثاق الجيرة الطيبة — the design's closing charter badge. */}
          {charter ? (
            <section className="hy-charter" aria-labelledby="charter-heading">
              <span className="material-symbols-outlined" aria-hidden="true" style={{ color: "var(--hy-primary)" }}>
                handshake
              </span>
              <h2 id="charter-heading" className="hy-charter-title">
                {charter.title}
              </h2>
              <p className="hy-charter-quote">{charter.quote}</p>
              <details>
                <summary className="hy-charter-link">{charter.rulesLabel}</summary>
                <ul className="hy-market-rules">
                  {charter.rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </details>
            </section>
          ) : null}
        </aside>
      </div>

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}

/**
 * The owner's own display post — the rich card anatomy of the supplied
 * design (recommendation with the embedded service card + the preview
 * comment, lost&found with the image block, the welcome with the
 * stacked avatars). Display-labeled, demo ids, never links.
 */
function OwnerPostCard({ post }: { post: OwnerFeedPost }) {
  return (
    <article className="hy-card hy-post">
      <header className="hy-post-head">
        <div className="hy-post-id">
          <span className="hy-avatar" data-tone={post.tone} aria-hidden="true">
            {post.initials}
          </span>
          <div>
            <span className="hy-post-name-row">
              <span className="hy-post-name">{post.author}</span>
              <span className="hy-post-chip" data-tone="verified">
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.75rem" }}>
                  {post.chipIcon}
                </span>
                {post.chip}
              </span>
              {post.sectionChip ? (
                <span className="hy-post-chip" data-tone="neutral">
                  {post.sectionChip}
                </span>
              ) : null}
            </span>
            <span className="hy-post-meta">{post.meta}</span>
          </div>
        </div>
        <span className="hy-badge-demo">بيانات عرض</span>
      </header>

      {post.title ? <h3 className="hy-post-title">{post.title}</h3> : null}
      <p className={post.kind === "WELCOME" ? "hy-post-body hy-post-body-muted" : "hy-post-body"}>
        {post.body}
      </p>

      {/* The embedded service card — the recommendation's trust core. */}
      {post.service ? (
        <div className="hy-service-card">
          <div className="hy-service-id">
            <span className="hy-icon-tile" data-tone="tertiary" aria-hidden="true">
              <span className="material-symbols-outlined">{post.service.icon}</span>
            </span>
            <div>
              <span className="hy-service-name-row">
                <span className="hy-service-name">{post.service.name}</span>
                <span className="hy-service-rating" aria-label={`التقييم ${ratingLatn(post.service.rating)} من 5`}>
                  <span className="hy-stars" aria-hidden="true">★★★★★</span>
                  {ratingLatn(post.service.rating)}
                  <span className="hy-rating-count">({ownerCount(post.service.reviews)} تقييم من أهل الحي)</span>
                </span>
              </span>
              <span className="hy-service-coverage">{post.service.coverage}</span>
            </div>
          </div>
          <div className="hy-service-actions">
            <button
              type="button"
              className="hy-btn hy-btn-primary"
              disabled
              title="قريبًا — الاتصال المباشر بانتظار عقد التواصل لدى الباك اند"
            >
              <span className="material-symbols-outlined">call</span>
              اتصل الآن
            </button>
            <button
              type="button"
              className="hy-btn hy-btn-soft"
              disabled
              title="قريبًا — مراسلة الحرفي بانتظار صفحة مقدم الخدمة لهذا العقد"
            >
              <span className="material-symbols-outlined">chat</span>
              راسله عبر المنصة
            </button>
          </div>
        </div>
      ) : null}

      {/* The lost&found image block — the icon tile stands in for the
          photograph (no fake photos of a real neighbor's pet). */}
      {post.kind === "LOST_FOUND" && post.imageIcon ? (
        <div className="hy-lostfound">
          <div className="hy-image-block" role="img" aria-label={post.imageAlt ?? ""}>
            <span className="material-symbols-outlined" style={{ fontSize: "3rem" }}>
              {post.imageIcon}
            </span>
          </div>
          {post.ctaLabel ? (
            <div className="hy-service-actions">
              <button
                type="button"
                className="hy-btn hy-btn-primary"
                disabled
                title="قريبًا — التواصل مع صاحب المنشور بانتظار عقد التفاعلات"
              >
                <span className="material-symbols-outlined">call</span>
                {post.ctaLabel}
              </button>
              {post.ctaSecondary ? (
                <button
                  type="button"
                  className="hy-btn hy-btn-soft"
                  disabled
                  title="قريبًا — المشاركة الخارجية خارج نطاق المنصة"
                >
                  <span className="material-symbols-outlined">share</span>
                  {post.ctaSecondary}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* The preview comment — the design's inline neighbor comment. */}
      {post.commentPreview ? (
        <div className="hy-comment-preview">
          <div className="hy-comment-row">
            <span className="hy-avatar hy-avatar-sm" data-tone="primary" aria-hidden="true">
              {post.commentPreview.author.slice(0, 2)}
            </span>
            <div className="hy-comment-bubble">
              <div className="hy-comment-head">
                <span className="hy-comment-author">{post.commentPreview.author}</span>
                <span className="hy-comment-when">{post.commentPreview.when}</span>
              </div>
              <p className="hy-comment-body">{post.commentPreview.body}</p>
            </div>
          </div>
          <button type="button" className="hy-comment-more" disabled title="قريبًا — بقية التعليقات بانتظار عقد التفاعلات">
            {post.commentPreview.moreLabel}
          </button>
        </div>
      ) : null}

      <footer className="hy-post-foot">
        <span className="hy-post-foot-meta">
          {post.thanks ? (
            <span className="hy-metric-primary">
              <span className="material-symbols-outlined" aria-hidden="true">thumb_up</span>
              {ownerCount(post.thanks)} {post.thanksLabel}
            </span>
          ) : null}
          {post.commentsCount ? (
            <span>
              <span className="material-symbols-outlined" aria-hidden="true">mode_comment</span>
              {ownerCount(post.commentsCount)} تعليقًا
            </span>
          ) : null}
          {post.footNote ? (
            <span className="hy-metric-tertiary">
              <span className="material-symbols-outlined" aria-hidden="true">info</span>
              {post.footNote}
            </span>
          ) : null}
        </span>
        {post.kind === "WELCOME" ? (
          <span className="hy-post-foot-meta">
            <button
              type="button"
              className="hy-btn hy-btn-primary"
              disabled
              title="قريبًا — الترحيب التفاعلي بانتظار عقد التفاعلات"
            >
              <span className="material-symbols-outlined">waving_hand</span>
              {post.ctaLabel}
            </button>
            {post.welcomedBy ? (
              <span className="hy-welcome-stack" aria-hidden="true">
                {(post.welcomeStack ?? []).map((initials) => (
                  <span key={initials} className="hy-avatar-sm hy-avatar" data-tone="primary">
                    {initials}
                  </span>
                ))}
                <span className="hy-avatar-sm hy-avatar hy-welcome-more">
                  +{ownerCount(post.welcomedBy - (post.welcomeStack ?? []).length)}
                </span>
              </span>
            ) : null}
            <span className="hy-metric-tertiary">{ownerCount(post.welcomedBy ?? 0)} جار رحبوا به اليوم</span>
          </span>
        ) : null}
      </footer>
    </article>
  );
}
