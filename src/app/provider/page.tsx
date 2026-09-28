import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { getMyListingViews, getMyStats, getProviderProfileById } from "@/lib/api/provider";
import { getProviderReviews } from "@/lib/api/reputation";
import { PROVIDER_REVIEWS_PAGE_SIZE } from "@/lib/api/reputation-contract";
import {
  VIEWS_WINDOW_DAYS,
  type ViewsWindowDays,
} from "@/lib/api/provider-contract";
import { getProviderListings } from "@/lib/api/public";
import { isUuid } from "@/lib/api/geo";
import {
  ACTOR_TYPE_LABELS,
  PROVIDER_STATUS_LABELS,
  type ProviderActorType,
  type ProviderStatus,
} from "@/lib/api/provider-contract";
import { BecomeProviderForm, ReviewReplyForm } from "./forms";

/**
 * لوحة المزوّد — roadmap stage 3's consumer surface (the provider path,
 * Nextdoor Business): L36 onboarding, the listing inventory, the L40
 * view analytics and the L25 aggregates. The privacy model is the
 * backend's own contract, measured live: every provider-scoped surface
 * answers 401 AUTHN-001 to anonymous callers. This page renders that
 * model faithfully:
 *
 * - anonymous → the sign-in gate (never a probe that would 401);
 * - signed-in without a provider profile → the L36 onboarding form (the
 *   me-surfaces' 404 house answer is the funnel's state machine input);
 * - provider → the dashboard.
 *
 * The page is a private surface — `noindex` is the honest robots
 * contract for session-scoped content.
 */
export const metadata: Metadata = {
  title: "لوحة المزوّد",
  description: "إدارة إعلاناتك وملفك كمزوّد",
  robots: { index: false },
};

type ProviderPageProps = PageProps<"/provider">;

/** Parse ?days= against the backend's L40 window whitelist (30 default). */
function parseDays(raw: string | string[] | undefined): ViewsWindowDays {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "30", 10);
  return VIEWS_WINDOW_DAYS.includes(parsed as ViewsWindowDays)
    ? (parsed as ViewsWindowDays)
    : 30;
}

/**
 * Parse ?profile= — the onboarding redirect's carried profile PK (the
 * J5 edit seam). A non-UUID value is dropped (never a probe); the id is
 * a POINTER ONLY — the backend re-verifies ownership on every write.
 */
function parseProfileId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && isUuid(value) ? value : null;
}

export default async function ProviderPage({ searchParams }: ProviderPageProps) {
  const sp = await searchParams;
  const days = parseDays(sp?.days);
  const profileId = parseProfileId(sp?.profile);

  const session = await getSession();
  if (!session) {
    // The provider-path gate: every surface behind it is authenticated
    // (measured 401 contract) — the honest anonymous render is the gate.
    return (
      <main>
        <h1>لوحة المزوّد</h1>
        <p className="page-note" role="status">
          هذه اللوحة للمزوّدين المسجّلين — سجّل الدخول لإدارة إعلاناتك.
        </p>
        <SignInButton callbackURL="/provider" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  // The funnel probe: the L40 me-surface answers the house 404 when the
  // caller holds no provider profile — that status drives the page's
  // state machine (it is the only "me" probe that works for every role).
  const views = await getMyListingViews(days);

  if (!views.ok) {
    if (views.status === 404) {
      // No provider profile yet — the L36 onboarding entry.
      return (
        <main>
          <h1>لوحة المزوّد</h1>
          <section className="card">
            <h2>صر مزوّدًا</h2>
            <p className="page-note">
              ملف المزوّد هو مفتاح نشر الإعلانات. يبدأ الملف «بانتظار توثيق
              الإدارة»، وإنشاء الإعلانات يُفتح بعد التوثيق — إنشاء الإعلان
              نفسه يعلّمك الباك اند حالته إن كانت البوابة بعد مغلقة.
            </p>
            <BecomeProviderForm />
          </section>
          <p>
            <Link href="/">الرئيسية</Link>
          </p>
        </main>
      );
    }
    return (
      <main>
        <h1>لوحة المزوّد</h1>
        <p className="page-note" role="status">
          {views.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(views.problem, `تعذّر قراءة بياناتك (رمز ${views.status}).`)}
        </p>
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  // A profile exists → the dashboard. The aggregates ride parallel reads
  // (Server Components fetch in parallel — the packaged guide's model);
  // the profile card joins ONLY when the onboarding redirect carried the
  // PK (?profile= — the measured PROFILE-ID-GAP's only seam).
  const [stats, listings, reviews, profile] = await Promise.all([
    getMyStats(),
    getProviderListings(session.userId, 0, 20),
    getProviderReviews(session.userId, 0, PROVIDER_REVIEWS_PAGE_SIZE),
    profileId ? getProviderProfileById(profileId) : Promise.resolve(null),
  ]);

  return (
    <main>
      <h1>لوحة المزوّد</h1>

      <p className="page-note" role="status">
        {/* The measured gap, stated honestly: there is no "read my own
            profile" surface — the profile PK is returned by the
            creation POST alone, so the card + the J5 edit entry ride the
            onboarding redirect's carried id (a pointer; every write
            re-verifies ownership server-side). */}
        ملفك قائم — بطاقة الملف ورابط تعديله يظهران هنا بعد إنشاء الملف
        مباشرة (حين يحمل الرابط معرّفه)؛ الباك اند لا يعرض قراءة «ملفي»
        لمزوّد عائد بعد (فجوة مسجّلة لديه).
      </p>

      {profile && profile.ok ? (
        <section className="card" aria-labelledby="profile-card-heading">
          <h2 id="profile-card-heading">ملف المزوّد</h2>
          <ul className="stat-list">
            <li className="stat-row">
              <span>الاسم العلني</span>
              <span className="stat-value">{profile.data.displayName}</span>
            </li>
            <li className="stat-row">
              <span>الحالة</span>
              <span className="stat-value">
                {PROVIDER_STATUS_LABELS[profile.data.status as ProviderStatus] ??
                  profile.data.status}
              </span>
            </li>
            <li className="stat-row">
              <span>الصفة</span>
              <span className="stat-value">
                {ACTOR_TYPE_LABELS[profile.data.actorType as ProviderActorType] ??
                  profile.data.actorType}
              </span>
            </li>
          </ul>
          {profile.data.agencyName ? (
            <p className="listing-meta">المكتب: {profile.data.agencyName}</p>
          ) : null}
          <p className="listing-meta">
            <Link href={`/provider/profile?id=${profile.data.id}`}>
              عدّل ملفك
            </Link>
            <span>·</span>
            {/* The PK finally reaches the L36 public page too — its join
                key was undiscoverable until the redirect seam existed. */}
            <Link href={`/providers/${profile.data.id}`}>
              صفحتك العامة كما يراها الزوّار
            </Link>
          </p>
        </section>
      ) : null}

      <section className="card">
        <h2>مشاهدات إعلاناتك (L40)</h2>
        <p className="listing-meta">
          <span>
            نافذة {new Intl.NumberFormat("ar").format(views.data.days)} يومًا — منذ{" "}
            {formatDate(views.data.sinceInclusive)}
          </span>
        </p>
        <nav className="category-filter" aria-label="نافذة المشاهدات">
          {VIEWS_WINDOW_DAYS.map((window) => (
            <Link
              key={window}
              href={`/provider?days=${window}`}
              className="button"
              data-variant={window === days ? "primary" : undefined}
            >
              {new Intl.NumberFormat("ar").format(window)} يومًا
            </Link>
          ))}
        </nav>
        {views.data.listings.length === 0 ? (
          <p className="page-note" role="status">
            لا مشاهدات داخل النافذة — إعلاناتك تظهر هنا متى نُظر إليها.
          </p>
        ) : (
          <ul className="stat-list">
            {views.data.listings.map((row) => (
              <li key={row.listingId} className="stat-row">
                <Link href={`/provider/listings/${row.listingId}`}>{row.title}</Link>
                <span className="stat-value">
                  {new Intl.NumberFormat("ar").format(row.views)} مشاهدة
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>إحصاءاتك (L25)</h2>
        <p className="listing-meta">
          {/* Slice S3 (charter J5): the provider's money reads — the L20
              ledger balance + statement surface. */}
          <Link href="/provider/ledger">دفتر رصيدك وكشف حسابك</Link>
        </p>
        {stats.ok ? (
          <ul className="stat-list">
            <li className="stat-row">
              <span>نسبة الإشغال</span>
              <span className="stat-value">
                {new Intl.NumberFormat("ar", { style: "percent", maximumFractionDigits: 1 }).format(
                  stats.data.occupancyRate,
                )}
              </span>
            </li>
            <li className="stat-row">
              <span>الصافي بعد العمولة</span>
              <span className="stat-value">
                {formatPrice(stats.data.netRevenueCents / 100, "SAR")}
              </span>
            </li>
            <li className="stat-row">
              <span>حجوزات مكتملة</span>
              <span className="stat-value">
                {new Intl.NumberFormat("ar").format(stats.data.completedBookings)}
              </span>
            </li>
            <li className="stat-row">
              <span>النافذة</span>
              <span className="stat-value">
                {formatDate(stats.data.from)} — {formatDate(stats.data.to)}
              </span>
            </li>
          </ul>
        ) : (
          <p className="page-note" role="status">
            {stats.unauthenticated
              ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
              : problemMessage(stats.problem, `تعذّرت قراءة الإحصاءات (رمز ${stats.status}).`)}
          </p>
        )}
      </section>

      <section className="card">
        <h2>إعلاناتك المنشورة</h2>
        <p>
          <Link className="button" data-variant="primary" href="/provider/listings/new">
            إعلان جديد
          </Link>
        </p>
        <p className="listing-meta">
          {/* Roadmap stage 6 — the provider's booking surface: incoming
              bookings + the availability slots the exact-slot gate
              consumes (the consumer's window must match one exactly). */}
          <Link href="/provider/bookings">حجوزات ضيوفك — وإدارة التوافر</Link>
        </p>
        {/* The measured inventory contract: this list is the PUBLIC
            provider surface (ACTIVE-only). Non-ACTIVE listings are not
            listable by any backend surface — the manage page (by id) is
            their entry, and the views analytics above keeps their
            history visible. */}
        {listings.ok ? (
          listings.data.content.length === 0 ? (
            <p className="page-note" role="status">
              لا إعلانات منشورة بعد — أنشئ إعلانك الأول ثم نشّطه.
            </p>
          ) : (
            <ul className="feed-list">
              {listings.data.content.map((listing) => (
                <li key={listing.id} className="card post-card">
                  <h3>
                    <Link href={`/provider/listings/${listing.id}`}>{listing.title}</Link>
                  </h3>
                  <p className="listing-meta">
                    <span className="listing-category">{listing.category}</span>
                    <span>·</span>
                    <span>{formatPrice(listing.price, listing.currency)}</span>
                    {listing.expiresAt ? (
                      <>
                        <span>·</span>
                        <span>ينتهي {formatDate(listing.expiresAt)}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="listing-meta">
                    <Link href={`/listings/${listing.id}`}>عرضه كما يراه الزوّار</Link>
                    <span>·</span>
                    <Link href={`/provider/listings/${listing.id}`}>إدارته</Link>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="page-note" role="status">
            {problemMessage(
              listings.problem,
              `تعذّرت قراءة إعلاناتك (رمز ${listings.status}).`,
            )}
          </p>
        )}
      </section>

      <section className="card">
        <h2>المراجعات (السمعة)</h2>
        {/* The reviews join is the session's own backend user id — the
            same join the inventory read makes (the A1 contract:
            reviews.provider_id IS the user id). The caller's own
            aggregate is NOT rendered here: no "my profile" read exists
            (the measured stage-3 gap) — the aggregate rides the L36
            public page alone, and its join key (the profile id) is not
            discoverable by this frontend. */}
        {reviews.ok ? (
          reviews.data.content.length === 0 ? (
            <p className="page-note" role="status">
              لا مراجعات بعد — تُكتب المراجعات عن حجوزات عملائك المكتملة.
            </p>
          ) : (
            <ul className="feed-list">
              {reviews.data.content.map((review) => (
                <li key={review.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="stat-value">
                      {new Intl.NumberFormat("ar").format(review.rating)} من ٥
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(review.createdAt)}</span>
                  </p>
                  {review.comment ? (
                    <p className="listing-description">{review.comment}</p>
                  ) : null}
                  {review.reply ? (
                    <div className="reply-block">
                      <p className="field-hint">ردّك:</p>
                      <p className="listing-description">{review.reply}</p>
                      <p className="page-note">
                        نُشر {review.repliedAt ? formatDateTime(review.repliedAt) : ""}
                      </p>
                    </div>
                  ) : (
                    <ReviewReplyForm reviewId={review.id} />
                  )}
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="page-note" role="status">
            {problemMessage(
              reviews.problem,
              `تعذّرت قراءة المراجعات (رمز ${reviews.status}).`,
            )}
          </p>
        )}
      </section>

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
