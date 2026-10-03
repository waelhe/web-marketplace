/**
 * Reputation-surface contract types and vocabulary — roadmap stage 5
 * (السمعة): the L36 public provider page (the second SEO surface) and
 * the reviews read + provider-reply surfaces.
 *
 * Pure types and constants only — client-safe (no next/headers), the
 * same split as provider-contract.ts vs provider.ts (the measured
 * stage-2 build error: client forms must not pull server-only modules
 * transitively). The L36 persona vocabulary (status + actor labels) is
 * IMPORTED from provider-contract.ts — one vocabulary, not a second
 * copy of the same measured enum labels.
 *
 * Every shape here is measured from the backend source, the live
 * production OpenAPI and anonymous live probes (app-java-v3,
 * 2026-09-22):
 * - ProviderPublicPageResponse (ProviderPublicPageService): profile +
 *   the fresh aggregate rating block + the ACTIVE-listings page in one
 *   read. The VERIFIED gate hides the listings block for every other
 *   status (an honest empty page — the profile itself stays visible
 *   with its status). Anonymous live probe: unknown ids answer 404
 *   NF-001 (the endpoint is public — no 401 gate), so this page is the
 *   app's second crawler-reachable surface.
 * - ReviewResponse (ReviewsController): one published review with the
 *   provider reply when one exists (V37 two-way reviews; reply is TEXT
 *   and the request is @NotBlank — no other authored bound).
 * - PagedResponseReviewResponse: newest first, consumer-to-provider
 *   direction only (CONSUMER_TO_PROVIDER).
 * - ID SPACES (measured from ProviderPublicPageService +
 *   ReviewsService — the A1 contract): the public page path takes the
 *   PROVIDER PROFILE id; the reviews list path takes the provider USER
 *   id (reviews.provider_id physically references users(id)). The
 *   public page response exposes NO user id — so the public page can
 *   carry the aggregate block but NOT the full reviews list (declared
 *   backend gap, ARCHITECTURE.md §10); the provider dashboard joins
 *   the reviews through the session's own backend user id instead.
 */

import type { PagedResponse, ListingSummary } from "./types";
import type {
  ProviderActorType,
  ProviderStatus,
} from "./provider-contract";

/**
 * ProviderPublicPageResponse — the L36 public page assembly. The
 * listings block rides the SAME PagedResponse<ListingSummary> shape as
 * the public browse surface (the shared-api projection, measured).
 *
 * W2 (yelp-level plan §5 — the business page, #489) extends the same
 * one-read assembly with the wave's own blocks: the ownership-
 * verification lifecycle chip, the «توزيع نجوم» histograms (one per
 * displayed badge, the same mode law as the badge pair), the declared
 * week (business_hours), the services menu, the resolved service areas,
 * and the schema.org LocalBusiness JSON-LD block the backend composes
 * from the same numbers the visible blocks render.
 */
export interface ProviderPublicPageView {
  id: string;
  displayName: string;
  bio: string | null;
  status: ProviderStatus;
  /** W2 (G14): the ownership-verification lifecycle — display-only trust. */
  verificationState: ProviderVerificationState;
  actorType: ProviderActorType;
  agencyName: string | null;
  licenseNumber: string | null;
  createdAt: string;
  /**
   * W1 (yelp-level plan §4.1, PR #487): the active reviews mode — the
   * owner's runtime key, served read-only so the surface renders
   * honestly (a HYBRID page with zero general reviews is
   * indistinguishable from VERIFIED_ONLY by the rating fields alone).
   */
  reviewsMode: ReviewsMode;
  /** The verified (booking-anchored) aggregate — null when none exist. */
  ratingAverage: number | null;
  reviewCount: number;
  /** The general (organic) aggregate — served in HYBRID mode only. */
  ratingGeneralAverage: number | null;
  ratingGeneralCount: number;
  /** W2: the verified histogram — all five buckets 1..5, zeros included. */
  ratingDistribution: RatingBucketView[];
  /** W2: the general histogram (HYBRID only; null under the other modes). */
  ratingGeneralDistribution: RatingBucketView[] | null;
  /**
   * W1 (§4.4/§4.5): the provider's PUBLISHED forward reviews, composed
   * by the backend through the shared PublishedReviewsPort — the
   * declared §10 ID-space seam closed server-side (the
   * profile-to-user mapping never leaves the backend; the rows carry
   * no user id).
   */
  reviews: PagedResponse<PublishedReviewView>;
  listings: PagedResponse<ListingSummary>;
  /** W2 (G11): the declared working week (at most one window per weekday). */
  businessHours: BusinessHourView[];
  /** W2 (G12): the declared services in position order. */
  services: OfferedServiceView[];
  /** W2 (G13): the declared service areas with resolved geo names. */
  serviceAreas: ServiceAreaView[];
  /** W2 (G22): the backend-composed LocalBusiness structured-data block. */
  jsonLd: ProviderBusinessJsonLdView | null;
}

/**
 * W2 (yelp plan §5 — G14): the provider ownership-verification
 * lifecycle the administrative confirm/reject drives (the public page
 * renders the badge; no privilege attaches to it — display-only trust).
 */
export type ProviderVerificationState =
  | "UNVERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "REJECTED";

/** Arabic labels of the verification lifecycle (the badge vocabulary). */
export const PROVIDER_VERIFICATION_LABELS: Record<ProviderVerificationState, string> = {
  UNVERIFIED: "غير موثّق",
  PENDING: "توثيق قيد المراجعة",
  VERIFIED: "مالك موثّق",
  REJECTED: "توثيق مرفوض",
};

/** W2: one histogram bar — the star value and its live published count. */
export interface RatingBucketView {
  /** 1..5. */
  rating: number;
  count: number;
}

/**
 * W2 (G11): one declared working-hours window — the ISO weekday and
 * the day's times (LocalTime "HH:MM[:SS]" on the wire).
 */
export interface BusinessHourView {
  /** MONDAY..SUNDAY (the DayOfWeek enum's own names). */
  dayOfWeek: string;
  opensAt: string;
  closesAt: string;
}

/** Arabic labels of the ISO weekdays (the hours block's display order). */
export const WEEKDAY_LABELS: Record<string, string> = {
  MONDAY: "الاثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
  FRIDAY: "الجمعة",
  SATURDAY: "السبت",
  SUNDAY: "الأحد",
};

/** The ISO weekday display order (Monday-first, the enum's own order). */
export const WEEKDAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

/**
 * W2 (G12): one declared service row — the money pair as integer cents
 * + ISO 4217 (both null together when no price is declared).
 */
export interface OfferedServiceView {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  priceCents: number | null;
  currency: string | null;
  position: number;
}

/**
 * W2 (G13): one declared service area — the geo node with resolved names.
 *
 * DECLARED BACKEND SEAM (recorded 2026-10-03, the conversations-list
 * gap #11 discipline): the view carries NO area row id, while the
 * withdraw write (`DELETE /providers/{id}/service-areas/{areaId}`)
 * takes the ServiceArea ROW id (findById — a different id space than
 * locationId). No served read exposes that row id, so the area
 * WITHDRAW affordance is unbuildable against the contract — the areas
 * block renders + the declare write works; the seam is registered for
 * the backend team in the charter's debt section.
 */
export interface ServiceAreaView {
  locationId: string;
  nameAr: string | null;
  nameEn: string | null;
  slug: string;
}

/**
 * W2 (G22): the schema.org LocalBusiness block the backend composes —
 * embedded VERBATIM (the L39 listing twin's discipline: the backend owns
 * the structured-data facts, the page never recomposes them). @JsonInclude
 * (NON_NULL) on the backend means absent fields are OMITTED, never null.
 */
export interface ProviderBusinessJsonLdView {
  "@context": string;
  "@type": string;
  name: string;
  description?: string;
  url?: string;
  /** schema.org's own format — "Mo 09:00-17:00" per declared day. */
  openingHours?: string[];
  areaServed?: { name: string }[];
  aggregateRating?: {
    "@type": string;
    ratingValue: number;
    reviewCount: number;
    bestRating: number;
    worstRating: number;
  };
  review?: {
    "@type": string;
    reviewRating: { "@type": string; ratingValue: number };
    datePublished: string | null;
    author: { "@type": string; name: string };
    reviewBody?: string;
  }[];
}

/** The reviews mode — the W0 owner-keyed switch (yelp plan §4.1). */
export type ReviewsMode = "VERIFIED_ONLY" | "OPEN" | "HYBRID";

/** Arabic labels of the reviews modes (the owner's switch vocabulary). */
export const REVIEWS_MODE_LABELS: Record<ReviewsMode, string> = {
  VERIFIED_ONLY: "المراجعات الموثّقة فقط",
  OPEN: "المراجعات العامة",
  HYBRID: "الهجين — موثّقة وعامة",
};

/** The review origin — the V85 provenance column (yelp plan §4.2). */
export type ReviewOrigin = "BOOKING" | "ORGANIC";

/** Arabic labels of the review origins (the trust badge vocabulary). */
export const REVIEW_ORIGIN_LABELS: Record<ReviewOrigin, string> = {
  BOOKING: "موثّقة",
  ORGANIC: "عامة",
};

/**
 * W4 (yelp-level plan §5 — G28/G29, #494): the public reviewer profile —
 * `GET /api/v1/users/{id}/public` (anonymous, the click target the
 * review rows' own reviewerId carries). The name honours closed
 * accounts; a live account with no published reviews is the honest
 * zero profile; an unknown reviewer answers 404.
 */
export interface ReviewerPublicProfileView {
  /** The page's own key (users.id) — the reviewerId every review row carries. */
  reviewerId: string;
  displayName: string;
  joinedAt: string;
  verifiedReviewCount: number;
  organicReviewCount: number;
  helpfulVoteCount: number;
  badges: ReviewerBadge[];
}

/** W4 (G29): the derived credibility badges — recomputed, never stored. */
export type ReviewerBadge = "VERIFIED_REVIEWER" | "HELPFUL_REVIEWER";

/** Arabic labels of the reviewer badges (the plan's own two families). */
export const REVIEWER_BADGE_LABELS: Record<ReviewerBadge, string> = {
  VERIFIED_REVIEWER: "موثّق المعاملات",
  HELPFUL_REVIEWER: "أصوات مفيد تراكمية",
};

/**
 * PublishedReviewView — one PUBLISHED review row on the provider public
 * page (the shared-api projection the backend composes). No bookingId,
 * no direction, no moderationStatus, no listingId: the block is the
 * forward PUBLISHED surface by construction — the projection cannot
 * leak what it does not declare.
 */
export interface PublishedReviewView {
  id: string;
  /** 1..5 (the V6 CHECK bounds). */
  rating: number;
  comment: string | null;
  /** The reviewed provider's one public reply — null until written. */
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  origin: ReviewOrigin;
  /** W4 (G28): the public reviewer page's own key — the row's click target. */
  reviewerId: string;
  reviewerName: string;
  reviewerReviewCount: number;
  helpfulCount: number;
}

/** ReviewResponse — one published review (V37 two-way reviews). */
export interface ReviewView {
  id: string;
  bookingId: string | null;
  /** 1..5 (the V6 CHECK constraint's own bounds). */
  rating: number;
  comment: string | null;
  /** The provider's public reply — null until the first (and only) one. */
  reply: string | null;
  direction: string;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** W1 §4.2: BOOKING (موثّقة) or ORGANIC (عامة). */
  origin: ReviewOrigin;
  /** W1 §4.5: PENDING_REVIEW / PUBLISHED / HIDDEN_BY_MODERATOR. */
  moderationStatus: string;
  /** W1 §4.2: the organic review's optional listing target. */
  listingId: string | null;
  /** W4 (G28): the public reviewer page's own key. */
  reviewerId: string;
  /** W1 §4.4: the pseudonym-honouring display name. */
  reviewerName: string;
  reviewerReviewCount: number;
  helpfulCount: number;
}

/**
 * The provider's public page listings block page size — one measured
 * page shape, no invention (the backend's own default page is 20; the
 * public browse surface uses 12 — this page mirrors the browse
 * surface's density for the same kind of grid).
 */
export const PROVIDER_PAGE_LISTINGS_SIZE = 12;

/**
 * The provider dashboard's reviews page size. The reviews feed is a
 * short list in practice (one review per completed booking); 20 = the
 * backend's own default page.
 */
export const PROVIDER_REVIEWS_PAGE_SIZE = 20;

/**
 * The public provider page's REVIEWS block page size — mirrors the
 * backend's own default (reviewsSize=10 on the controller): the
 * identity-rich public rows are denser than the dashboard's plain ones.
 */
export const PROVIDER_PAGE_REVIEWS_SIZE = 10;

/**
 * The /profile my-reviews page size — one page of "what I wrote" and
 * one of "what providers said about me"; 20 = the backend's own
 * default page (the same density decision as the provider dashboard).
 */
export const MY_REVIEWS_PAGE_SIZE = 20;

/** Arabic labels of the measured review directions (ReviewResponse.direction). */
export const REVIEW_DIRECTION_LABELS: Record<string, string> = {
  CONSUMER_TO_PROVIDER: "تقييمي لمزوّد",
  PROVIDER_TO_CONSUMER: "تقييم مزوّد لضيف",
};

/**
 * The reply mirror bound: the backend's own gate is @NotBlank
 * (ReplyRequest) with a TEXT column — no authored maximum. The client
 * mirrors the blank gate only; the backend remains the authority.
 */
export const REVIEW_REPLY_REQUIRED = true;

/**
 * W1 §4.5 (the completion slice): Arabic labels of the review moderation
 * states (the soft state column — served on the reviewer's own read where
 * the author sees every state; the public surfaces carry PUBLISHED rows
 * only). One set of words for one set of states, shared by the profile's
 * «مراجعاتي» and the admin queue's state axis.
 */
export const REVIEW_MODERATION_LABELS: Record<string, string> = {
  PUBLISHED: "منشورة",
  PENDING_REVIEW: "قيد المراجعة",
  HIDDEN_BY_MODERATOR: "مخفية بالإشراف",
};

/**
 * W1 §4.4 (the completion slice): ReviewMediaUploadView — the presign
 * response (ReviewMediaService): mediaId + the server-generated
 * objectKey + the presigned PUT URL and its lifetime (PT15M in the
 * schema's own example).
 */
export interface ReviewMediaUploadView {
  mediaId: string;
  objectKey: string;
  uploadUrl: string;
  /** The presigned URL's lifetime as an ISO-8601 duration (e.g. "PT15M"). */
  urlLifetime: string;
}

/**
 * W1 §4.4: ReviewMediaView — one review-photo asset (ReviewMediaService,
 * field names measured from the record itself): the fresh presigned GET
 * URL (`downloadUrl`) and the display order (`position`, 1-based) ride
 * every row of the by-review read (public for a PUBLISHED review; the
 * author/admin otherwise).
 */
export interface ReviewMediaView {
  id: string;
  reviewId: string;
  contentType: string;
  sizeBytes: number;
  /** The asset lifecycle status (UPLOADED on the confirmed read). */
  status: string;
  /** Display order within the review (1-based). */
  position: number;
  /** The freshly presigned GET URL of the original object. */
  downloadUrl: string;
  createdAt: string;
}

/**
 * The review-photo upload's declared bounds — the ReviewMediaController's
 * own request contract (@NotNull @Min(1) sizeBytes + the declared content
 * type from the server allowlist, the same allowlist as the listing twin
 * — image/jpeg and image/png are the measured live pair).
 */
export const REVIEW_MEDIA_CONTENT_TYPES = ["image/jpeg", "image/png"] as const;
export type ReviewMediaContentType = (typeof REVIEW_MEDIA_CONTENT_TYPES)[number];

/**
 * W2 (G11): the hours editor's own bound — at most one window per
 * weekday (the V96 unique key); the request's list IS the declared week
 * (PUT replacement semantics — a day absent from the request is
 * withdrawn). The client mirrors the replacement law, nothing more.
 */
export const BUSINESS_HOURS_MAX_DAYS = 7;

/**
 * W2 (G12): the declared service's own authored bounds — the entity's
 * columns verbatim (OfferedService): title NOT NULL ≤200, description
 * ≤1000, duration minutes, price cents, currency ISO 4217 ≤3. The
 * money pair is declared together or not at all (the backend's own
 * service gate).
 */
export const SERVICE_TITLE_MAX_LENGTH = 200;
export const SERVICE_DESCRIPTION_MAX_LENGTH = 1000;
export const SERVICE_CURRENCY_MAX_LENGTH = 3;
