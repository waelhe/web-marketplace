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
  /** The fresh aggregate — null when no reviews exist (never 0-invented). */
  ratingAverage: number | null;
  reviewCount: number;
  listings: PagedResponse<ListingSummary>;
}

/** ReviewResponse — one published review (V37 two-way reviews). */
export interface ReviewView {
  id: string;
  bookingId: string;
  /** 1..5 (the V6 CHECK constraint's own bounds). */
  rating: number;
  comment: string | null;
  /** The provider's public reply — null until the first (and only) one. */
  reply: string | null;
  direction: string;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
