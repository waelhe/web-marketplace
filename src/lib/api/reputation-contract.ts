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
 */
export interface ProviderPublicPageView {
  id: string;
  displayName: string;
  bio: string | null;
  status: ProviderStatus;
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
  /**
   * W1 (§4.4/§4.5): the provider's PUBLISHED forward reviews, composed
   * by the backend through the shared PublishedReviewsPort — the
   * declared §10 ID-space seam closed server-side (the
   * profile-to-user mapping never leaves the backend; the rows carry
   * no user id).
   */
  reviews: PagedResponse<PublishedReviewView>;
  listings: PagedResponse<ListingSummary>;
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
 * W1 §4.4: ReviewMediaView — one review-photo asset (ReviewMediaService):
 * the fresh presigned GET URL rides every row of the by-review read
 * (public for a PUBLISHED review; the author/admin otherwise).
 */
export interface ReviewMediaView {
  id: string;
  reviewId: string;
  contentType: string;
  sizeBytes: number;
  /** The asset lifecycle status (UPLOADED on the confirmed read). */
  status: string;
  /** Display order within the review (1-based). */
  displayOrder: number;
  /** The freshly presigned GET URL. */
  url: string;
}

/**
 * The review-photo upload's declared bounds — the ReviewMediaController's
 * own request contract (@NotNull @Min(1) sizeBytes + the declared content
 * type from the server allowlist, the same allowlist as the listing twin
 * — image/jpeg and image/png are the measured live pair).
 */
export const REVIEW_MEDIA_CONTENT_TYPES = ["image/jpeg", "image/png"] as const;
export type ReviewMediaContentType = (typeof REVIEW_MEDIA_CONTENT_TYPES)[number];
