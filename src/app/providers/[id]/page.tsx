import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProviderPublicPage, getReviewMedia } from "@/lib/api/reputation";
import {
  PROVIDER_PAGE_LISTINGS_SIZE,
  PROVIDER_PAGE_REVIEWS_SIZE,
  PROVIDER_VERIFICATION_LABELS,
  REVIEWS_MODE_LABELS,
  REVIEW_ORIGIN_LABELS,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  type BusinessHourView,
  type OfferedServiceView,
  type PublishedReviewView,
  type ProviderVerificationState,
  type RatingBucketView,
  type ReviewMediaView,
  type ReviewsMode,
  type ServiceAreaView,
} from "@/lib/api/reputation-contract";
import {
  ACTOR_TYPE_LABELS,
  PROVIDER_STATUS_LABELS,
} from "@/lib/api/provider-contract";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { problemMessage } from "@/lib/problem";
import { FollowProviderButton, HelpfulVoteButton, OrganicReviewForm, ReviewFlagForm } from "./forms";
import { VisionServicesBlock } from "./vision-services-block";

// The L36 public provider page — the app's SECOND SEO surface (roadmap
// stage 5, السمعة). The backend composes the whole page in one read
// (`GET /providers/{id}/public`: profile + fresh aggregate rating +
// the ACTIVE-listings block), addressed by the provider PROFILE id.
// Anonymous visitors and crawlers see the same page — measured: the
// endpoint has no auth gate (unknown ids answer 404 NF-001, not 401),
// so this page renders with NO session read at all.
//
// The VERIFIED gate is the backend's own contract: the listings block
// is served only for VERIFIED profiles (a suspended broker's inventory
// is hidden on his page — an honest empty block); the profile itself
// stays visible with its status. The rating block rides the same
// response. W1 (yelp-level plan §4.4/§4.5, PR #487): the page also
// composes the provider's PUBLISHED reviews page and the active reviews
// mode — the reviews list's public home: the dual badges per mode, the
// identity-rich rows, the helpful votes, and the organic write.
//
// W2 (yelp-level plan §5 — the business page, #489): the page gains
// the wave's own Yelp shape — the ownership-verification badge (G14),
// the «توزيع نجوم» histograms (one per displayed badge, the same mode
// law as the badge pair), the declared working week (G11), the services
// menu (G12), the resolved service areas (G13), and the backend's own
// schema.org LocalBusiness JSON-LD block embedded VERBATIM (G22 — the
// L39 listing twin's discipline: a rich result that agrees with its
// page). W4 (#494): every review row's reviewer name becomes the link
// to the public reviewer page (`/users/{reviewerId}` — the row's own
// click target), and the follow button joins the profile head (the
// anonymous render keeps the same HTML — the button's session enters
// at the action, the HelpfulVote discipline).

type ProviderPageProps = PageProps<"/providers/[id]">;

/** Parse ?page= (1-based for humans) into the backend's 0-based page. */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return parsed - 1;
}

/**
 * Parse ?rpage= — the reviews block's OWN pager (1-based like ?page=).
 * The two blocks page independently on one page: ?page= walks the
 * listings, ?rpage= walks the reviews (the backend's own two-axis
 * contract: page/size + reviewsPage/reviewsSize).
 */
function parseReviewsPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return parsed - 1;
}

export async function generateMetadata({
  params,
  searchParams,
}: ProviderPageProps): Promise<Metadata> {
  const { id } = await params;
  const sp = await searchParams;
  const page = parsePage(sp?.page);
  const reviewsPage = parseReviewsPage(sp?.rpage);
  const result = await getProviderPublicPage(
    id,
    page,
    PROVIDER_PAGE_LISTINGS_SIZE,
    reviewsPage,
    PROVIDER_PAGE_REVIEWS_SIZE,
  );

  if (!result.ok) {
    // Unknown provider: the page itself answers 404 — keep the URL out
    // of indexes meanwhile.
    return {
      title: "مزوّد غير موجود",
      robots: { index: false },
    };
  }

  const provider = result.data;
  const name = provider.displayName;
  return {
    title: name,
    description:
      provider.bio ??
      `${name} — صفحة المزوّد العامّة في السوق: الإعلانات النشطة والتقييم`,
    alternates: { canonical: `/providers/${provider.id}` },
    openGraph: {
      title: name,
      description: provider.bio ?? undefined,
      type: "profile",
      url: `/providers/${provider.id}`,
    },
  };
}

/** One aggregate chip — the honest number (null = none of this kind). */
function RatingChip({
  average,
  count,
  label,
}: {
  average: number | null;
  count: number;
  label: string;
}) {
  if (average === null || count === 0) {
    return null;
  }
  return (
    <span className="listing-meta">
      <span className="listing-category">{label}</span>
      <span className="stat-value">
        {new Intl.NumberFormat("ar", { maximumFractionDigits: 1 }).format(average)}
      </span>
      <span>من ٥</span>
      <span>·</span>
      <span>{new Intl.NumberFormat("ar").format(count)} مراجعة</span>
    </span>
  );
}

/**
 * W2 (G11): the declared working week — the ISO weekday order (the
 * enum's own), one window per row, the times LTR (the house rule for
 * machine-formatted values inside RTL prose). An undeclared week is
 * the honest note, never an invented schedule.
 */
function BusinessHoursBlock({ hours }: { hours: BusinessHourView[] }) {
  if (hours.length === 0) {
    return <p className="page-note">لا ساعات عمل معلنة بعد.</p>;
  }
  const byDay = new Map(hours.map((hour) => [hour.dayOfWeek, hour]));
  return (
    <ul className="biz-hours" aria-label="ساعات العمل المعلنة">
      {WEEKDAY_ORDER.filter((day) => byDay.has(day)).map((day) => {
        const hour = byDay.get(day);
        if (!hour) return null;
        return (
          <li key={day}>
            <span className="biz-day">{WEEKDAY_LABELS[day] ?? day}</span>
            <span className="biz-window" dir="ltr">
              {hour.opensAt.slice(0, 5)} — {hour.closesAt.slice(0, 5)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * W2 (G12): the services menu — position order (the served order IS
 * the menu), the money pair as integer cents + ISO 4217 rendered major
 * (the ledger's own display convention), the duration in minutes. A
 * service without a price renders without one — never a fabricated 0.
 */
function ServicesMenu({ services }: { services: OfferedServiceView[] }) {
  if (services.length === 0) {
    return <p className="page-note">لا خدمات معلنة بعد.</p>;
  }
  return (
    <ul className="biz-services" aria-label="الخدمات المعلنة">
      {services.map((service) => (
        <li key={service.id} className="biz-service">
          <p className="biz-service-head">
            <span className="biz-service-title">{service.title}</span>
            {service.priceCents !== null && service.currency ? (
              <span className="biz-service-price">
                {formatPrice(service.priceCents / 100, service.currency)}
              </span>
            ) : null}
          </p>
          {service.description ? (
            <p className="listing-description">{service.description}</p>
          ) : null}
          {service.durationMinutes !== null ? (
            <p className="page-note">
              المدة: {new Intl.NumberFormat("ar").format(service.durationMinutes)} دقيقة
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * W2 (G13): the resolved service areas — the Arabic name (the primary
 * market's label), the honest note when none are declared.
 */
function ServiceAreasBlock({ areas }: { areas: ServiceAreaView[] }) {
  if (areas.length === 0) {
    return <p className="page-note">لا نطاقات خدمة معلنة بعد.</p>;
  }
  return (
    <p className="listing-meta" aria-label="نطاقات الخدمة">
      {areas.map((area, index) => (
        <span key={area.locationId}>
          {index > 0 ? <span>·</span> : null}
          <span>{area.nameAr ?? area.nameEn ?? area.slug}</span>
        </span>
      ))}
    </p>
  );
}

/**
 * W2 («توزيع نجوم»): one histogram — all five buckets 1..5 in the
 * served order (the backend fills zeros by construction), the bar's
 * width proportional to the bucket's share of the histogram's own
 * maximum. The RTL bar fills from the inline-start (the logical
 * direction — no physical left/right).
 */
function RatingHistogram({
  buckets,
  label,
}: {
  buckets: RatingBucketView[];
  label: string;
}) {
  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);
  return (
    <div className="biz-histogram" aria-label={`توزيع النجوم — ${label}`}>
      <p className="page-note">{label}</p>
      <ul className="biz-bars">
        {buckets.map((bucket) => (
          <li key={bucket.rating} className="biz-bar-row">
            <span className="biz-bar-star" aria-label={`${bucket.rating} من ٥`}>
              {new Intl.NumberFormat("ar").format(bucket.rating)}
            </span>
            <span
              className="biz-bar-track"
              aria-hidden="true"
            >
              <span
                className="biz-bar-fill"
                style={{ inlineSize: `${(bucket.count / max) * 100}%` }}
              />
            </span>
            <span className="biz-bar-count">
              {new Intl.NumberFormat("ar").format(bucket.count)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The rating block per the served mode (W1 §4.4 + W2's histograms):
 * HYBRID carries the two badges separately («موثّق 4.8 (23) · عام 4.2
 * (156)» — the plan's strongest trust display) with BOTH histograms;
 * OPEN's single number is the merged mean (labeled honestly) over the
 * merged bars; VERIFIED_ONLY is the verified aggregate alone. The W2
 * histograms ride the same mode law as the badge pair.
 */
function RatingBlock({
  mode,
  average,
  count,
  generalAverage,
  generalCount,
  distribution,
  generalDistribution,
}: {
  mode: ReviewsMode;
  average: number | null;
  count: number;
  generalAverage: number | null;
  generalCount: number;
  distribution: RatingBucketView[] | undefined;
  generalDistribution: RatingBucketView[] | null | undefined;
}) {
  const hasAny = count > 0 || generalCount > 0;
  return (
    <>
      <p className="page-note">نمط المراجعات: {REVIEWS_MODE_LABELS[mode]}</p>
      {mode === "HYBRID" ? (
        <>
          <p className="listing-meta">
            <RatingChip average={average} count={count} label="موثّق" />
            <RatingChip average={generalAverage} count={generalCount} label="عام" />
          </p>
          {distribution && distribution.length > 0 ? (
            <RatingHistogram buckets={distribution} label="توزيع مراجعات موثّقة" />
          ) : null}
          {generalDistribution && generalDistribution.length > 0 ? (
            <RatingHistogram buckets={generalDistribution} label="توزيع مراجعات عامة" />
          ) : null}
        </>
      ) : (
        <>
          <RatingChip
            average={average}
            count={count}
            label={mode === "OPEN" ? "من المراجعات كلها" : "موثّق"}
          />
          {distribution && distribution.length > 0 ? (
            <RatingHistogram
              buckets={distribution}
              label={mode === "OPEN" ? "توزيع كل المراجعات" : "توزيع مراجعات موثّقة"}
            />
          ) : null}
        </>
      )}
      {!hasAny ? <p className="page-note">لا مراجعات بعد.</p> : null}
    </>
  );
}

/**
 * One published review row (W1 §4.4/§4.5 + W4 G28): the origin badge
 * («موثّقة»/«عامة»), the reviewer identity block — the name now the
 * LINK to the public reviewer page (the row's own reviewerId key —
 * «نقرة من مراجعة إلى صفحة المراجع»), the provider reply, the helpful
 * vote, the photos, and the flag (V86).
 */
function ReviewRow({
  review,
  photos,
}: {
  review: PublishedReviewView;
  photos: ReviewMediaView[] | null;
}) {
  return (
    <li className="card post-card">
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
        {review.reviewerId ? (
          <Link href={`/users/${review.reviewerId}`} aria-label="صفحة المراجع العامة">
            {review.reviewerName}
          </Link>
        ) : (
          <span aria-label="كاتب المراجعة">{review.reviewerName}</span>
        )}
        <span>·</span>
        <span>
          {new Intl.NumberFormat("ar").format(review.reviewerReviewCount)} مراجعة منشورة
        </span>
        <span>·</span>
        <span>{formatDateTime(review.createdAt)}</span>
      </p>
      {review.comment ? (
        <p className="listing-description">{review.comment}</p>
      ) : null}
      {photos && photos.length > 0 ? (
        <ul className="review-media" aria-label="صور المراجعة">
          {photos.map((photo) => (
            <li key={photo.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a
                  presigned storage URL, not a local asset: next/image
                  would demand remote-pattern config for an ephemeral
                  signed host (the listing gallery's own measured call). */}
              <img src={photo.downloadUrl} alt="صورة مرفقة بالمراجعة" loading="lazy" />
            </li>
          ))}
        </ul>
      ) : null}
      {review.reply ? (
        <blockquote className="post-reply">
          <p className="listing-description">{review.reply}</p>
          <footer>
            رد المزوّد{review.repliedAt ? ` — ${formatDateTime(review.repliedAt)}` : ""}
          </footer>
        </blockquote>
      ) : null}
      <HelpfulVoteButton
        reviewId={review.id}
        helpfulCount={review.helpfulCount}
      />
      <ReviewFlagForm reviewId={review.id} />
    </li>
  );
}

export default async function ProviderPublicPage({
  params,
  searchParams,
}: ProviderPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const page = parsePage(sp?.page);
  const reviewsPage = parseReviewsPage(sp?.rpage);
  const result = await getProviderPublicPage(
    id,
    page,
    PROVIDER_PAGE_LISTINGS_SIZE,
    reviewsPage,
    PROVIDER_PAGE_REVIEWS_SIZE,
  );

  if (!result.ok) {
    if (result.status === 404) {
      // The backend's own contract: unknown provider ids answer 404
      // NF-001 on the public page read — the page mirrors it.
      notFound();
    }
    return (
      <main>
        <h1>صفحة المزوّد</h1>
        {result.status === 0 ? (
          <p className="page-note" role="status">
            الخادم الخلفي غير متاح حالياً — لا يمكن قراءة صفحة المزوّد الآن.
          </p>
        ) : (
          <p className="page-note" role="status">
            {problemMessage(result.problem, `تعذّر قراءة صفحة المزوّد (رمز ${result.status}).`)}
          </p>
        )}
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const provider = result.data;
  const listings = provider.listings;
  const reviews = provider.reviews;

  // The completion slice (§4.4): each review's photos — one public read
  // per row (the by-review channel is public for PUBLISHED rows),
  // fetched in parallel and degrading HONESTLY per review (a failed
  // read renders no gallery — the N4 lesson: a review without photos
  // must not die on an unreachable channel). The React cache keeps the
  // read memoized per render pass (generateMetadata shares nothing
  // here — the page body's own read).
  const photosPerReview = await Promise.all(
    reviews.content.map(async (review) => {
      const media = await getReviewMedia(review.id);
      return media.ok ? media.data : null;
    }),
  );

  return (
    <main>
      {/* W2 (G22): the backend-composed schema.org LocalBusiness block,
          embedded VERBATIM (the L39 listing twin's discipline — escape
          `<` per the packaged JSON-LD guide so the payload cannot carry
          markup; the stars the checker sees agree with the page). */}
      {provider.jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(provider.jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}

      <p className="listing-crumb">
        <Link href="/">الرئيسية</Link> / <span>{provider.displayName}</span>
      </p>
      <h1>{provider.displayName}</h1>

      <section className="card" aria-label="ملف المزوّد">
        <p className="listing-meta">
          <span className="listing-category">
            {ACTOR_TYPE_LABELS[provider.actorType] ?? provider.actorType}
          </span>
          <span>·</span>
          <span className="listing-category">
            {PROVIDER_STATUS_LABELS[provider.status] ?? provider.status}
          </span>
          {/* W2 (G14): the ownership-verification chip — display-only
              trust, the administrative lifecycle's read. */}
          {provider.verificationState ? (
            <>
              <span>·</span>
              <span
                className="listing-category"
                data-verification={provider.verificationState}
                aria-label="حالة توثيق الملكية"
              >
                {PROVIDER_VERIFICATION_LABELS[
                  provider.verificationState as ProviderVerificationState
                ] ?? provider.verificationState}
              </span>
            </>
          ) : null}
        </p>
        {provider.agencyName ? (
          <p className="listing-meta">
            <span>المكتب: {provider.agencyName}</span>
          </p>
        ) : null}
        {provider.licenseNumber ? (
          <p className="listing-meta">
            <span>رقم الترخيص: {provider.licenseNumber}</span>
          </p>
        ) : null}
        {provider.bio ? <p className="listing-description">{provider.bio}</p> : null}
        <p className="page-note">عضو منذ {formatDate(provider.createdAt)}</p>

        {/* W4 (G21): the follow button — the anonymous render keeps the
            same HTML (the session enters at the action, the
            HelpfulVote discipline); the backend's own 400/409 gates
            teach with their own words. */}
        <FollowProviderButton providerId={provider.id} providerName={provider.displayName} />

        <h2>التقييم</h2>
        <RatingBlock
          mode={provider.reviewsMode}
          average={provider.ratingAverage}
          count={provider.reviewCount}
          generalAverage={provider.ratingGeneralAverage}
          generalCount={provider.ratingGeneralCount}
          distribution={provider.ratingDistribution}
          generalDistribution={provider.ratingGeneralDistribution}
        />

        <h2>ساعات العمل</h2>
        <BusinessHoursBlock hours={provider.businessHours ?? []} />

        <h2>الخدمات</h2>
        <ServicesMenu services={provider.services ?? []} />

        <h2>نطاقات الخدمة</h2>
        <ServiceAreasBlock areas={provider.serviceAreas ?? []} />

        {/* The full-vision wave (spec §5.5): the Wyzant layer — the
            booking-mode pairing (the REAL served leads channel beside
            instant-book) + the service packages + the background-check
            badge (display blocks, T2/T3 backend waves pending). */}
        <VisionServicesBlock providerName={provider.displayName} />
      </section>

      <section className="card" aria-labelledby="provider-reviews-heading">
        <h2 id="provider-reviews-heading">مراجعات الجيران</h2>
        {reviews.content.length === 0 ? (
          <p className="page-note" role="status">
            لا مراجعات منشورة بعد — كن أول من يشارك تجربته.
          </p>
        ) : (
          <>
            <p className="page-note">
              {new Intl.NumberFormat("ar").format(reviews.totalElements)} مراجعة منشورة —
              الصفحة {new Intl.NumberFormat("ar").format(reviews.pageNumber + 1)} من{" "}
              {new Intl.NumberFormat("ar").format(Math.max(reviews.totalPages, 1))}
            </p>
            <ul className="feed-list">
              {reviews.content.map((review, index) => (
                <ReviewRow
                  key={review.id}
                  review={review}
                  photos={photosPerReview[index]}
                />
              ))}
            </ul>
            <nav className="listing-pager" aria-label="تصفّح مراجعات المزوّد">
              {reviews.pageNumber > 0 ? (
                <Link
                  className="button"
                  href={`/providers/${provider.id}?rpage=${reviews.pageNumber}`}
                >
                  مراجعات أحدث
                </Link>
              ) : null}
              {!reviews.last ? (
                <Link
                  className="button"
                  href={`/providers/${provider.id}?rpage=${reviews.pageNumber + 2}`}
                >
                  مراجعات أقدم
                </Link>
              ) : null}
            </nav>
          </>
        )}
        {provider.reviewsMode !== "VERIFIED_ONLY" ? (
          <>
            <h3>اكتب مراجعة عامة</h3>
            <OrganicReviewForm providerId={provider.id} mode={provider.reviewsMode} />
          </>
        ) : (
          <p className="page-note">
            المراجعات على هذا النمط موثّقة بحجز مكتمل — نُشرت من رحلة الحجز
            نفسها.
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="provider-listings-heading">
        <h2 id="provider-listings-heading">الإعلانات النشطة</h2>
        {provider.status !== "VERIFIED" ? (
          <p className="page-note" role="status">
            يعرض الباك اند إعلانات المزوّد الموثّق فقط — لا إعلانات معروضة
            على هذه الصفحة بحالته الحالية.
          </p>
        ) : listings.content.length === 0 ? (
          <p className="page-note" role="status">
            لا إعلانات نشطة لهذا المزوّد حالياً.
          </p>
        ) : (
          <>
            <p className="page-note">
              {new Intl.NumberFormat("ar").format(listings.totalElements)} إعلان نشط —
              الصفحة {new Intl.NumberFormat("ar").format(listings.pageNumber + 1)} من{" "}
              {new Intl.NumberFormat("ar").format(Math.max(listings.totalPages, 1))}
            </p>
            <ul className="listing-grid">
              {listings.content.map((listing) => (
                <li key={listing.id}>
                  <Link href={`/listings/${listing.id}`} className="listing-card">
                    <h3>{listing.title}</h3>
                    <p className="listing-meta">
                      <span className="listing-category">{listing.category}</span>
                    </p>
                    <p className="listing-price">
                      {formatPrice(listing.price, listing.currency)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <nav className="listing-pager" aria-label="تصفّح إعلانات المزوّد">
              {listings.pageNumber > 0 ? (
                <Link
                  className="button"
                  href={`/providers/${provider.id}?page=${listings.pageNumber}`}
                >
                  الصفحة السابقة
                </Link>
              ) : null}
              {!listings.last ? (
                <Link
                  className="button"
                  href={`/providers/${provider.id}?page=${listings.pageNumber + 2}`}
                >
                  الصفحة التالية
                </Link>
              ) : null}
            </nav>
          </>
        )}
      </section>

      <p>
        <Link href="/listings">كل الإعلانات</Link>
      </p>
    </main>
  );
}
