/**
 * The reputation channel (roadmap stage 5 — السمعة): the L36 public
 * provider page (the app's second SEO surface) and the reviews read +
 * provider-reply surfaces, on the same data-channel discipline as
 * every other stage: public reads via the shared anonymous GET
 * discipline (public.ts' publicGet — no session, no Bearer, crawler
 * parity), the reply write via backendSend (session Bearer, direct
 * BACKEND_URL fetch, expected failures as data).
 *
 * Every path here was measured against the live production backend
 * (anonymous probes + OpenAPI + source, app-java-v3, 2026-09-22):
 * - GET  /api/v1/providers/{profileId}/public?page&size — PUBLIC
 *   (unknown ids answer 404 NF-001 problem+json, NOT 401: the endpoint
 *   has no auth gate). One read carries the profile + the fresh
 *   aggregate rating block + the ACTIVE-listings page (VERIFIED-gated
 *   block: every other status gets the honest empty page).
 * - GET  /api/v1/reviews/provider/{providerUserId}?page&size — PUBLIC
 *   (anonymous 200 measured, even for unknown ids: the honest empty
 *   page). Newest first, CONSUMER_TO_PROVIDER direction only. The path
 *   id is the provider USER id (reviews.provider_id → users.id, the A1
 *   contract) — NOT the profile id.
 * - POST /api/v1/reviews/{id}/reply — the provider's one public reply
 *   per review (L21 two-way reviews; @NotBlank body, owner-scoped:
 *   the reviewed provider only — the backend's 403/404 are the
 *   authority).
 *
 * The ID-SPACE seam (measured, declared in ARCHITECTURE.md §10): the
 * public page is addressed by the PROFILE id; the reviews list by the
 * USER id; no public read exposes the mapping — so the public page
 * renders the aggregate block only (it rides the page response), and
 * the provider dashboard reads its own reviews through the session's
 * backend user id (the same join getProviderListings already makes).
 */

import { cache } from "react";
import { backendGet, backendSend, type BackendResult } from "./server";
import { publicGet } from "./public";
import type { PagedResponse } from "./types";
import type {
  ProviderPublicPageView,
  ReviewMediaUploadView,
  ReviewMediaView,
  ReviewerPublicProfileView,
  ReviewView,
} from "./reputation-contract";
import { PROVIDER_PAGE_REVIEWS_SIZE } from "./reputation-contract";

/**
 * The L36 public provider page — `GET /api/v1/providers/{id}/public`.
 * Memoized per render pass so generateMetadata and the page body share
 * exactly ONE backend GET (the same single-read discipline as the
 * listing detail's L40 view-counter contract).
 */
export const getProviderPublicPage = cache(
  async (
    profileId: string,
    page: number,
    size: number,
    reviewsPage = 0,
    reviewsSize = PROVIDER_PAGE_REVIEWS_SIZE,
  ): Promise<BackendResult<ProviderPublicPageView>> =>
    publicGet(
      `/api/v1/providers/${encodeURIComponent(profileId)}/public?page=${page}&size=${size}`
      + `&reviewsPage=${reviewsPage}&reviewsSize=${reviewsSize}`,
    ),
);

/**
 * One provider's published reviews — `GET /api/v1/reviews/provider/{id}`
 * (newest first, consumer-to-provider direction). The path id is the
 * provider USER id (the A1 contract) — the provider dashboard joins it
 * from the session's own backend user id; the public page cannot
 * (no exposed mapping — declared backend gap).
 */
export const getProviderReviews = cache(
  async (
    providerUserId: string,
    page: number,
    size: number,
  ): Promise<BackendResult<PagedResponse<ReviewView>>> =>
    publicGet(
      `/api/v1/reviews/provider/${encodeURIComponent(providerUserId)}?page=${page}&size=${size}`,
    ),
);

/**
 * Reply to a review — `POST /api/v1/reviews/{id}/reply` (L21: one
 * public reply per review, owned by the reviewed provider). The
 * backend's own gates teach the caller: 404 unknown review, 403 a
 * provider that is not the reviewed one, and the entity's own
 * second-reply rejection.
 */
export function replyToReview(
  reviewId: string,
  reply: string,
): Promise<BackendResult<ReviewView>> {
  return backendSend(
    "POST",
    `/api/v1/reviews/${encodeURIComponent(reviewId)}/reply`,
    { reply },
  );
}

/**
 * The consumer review — `POST /api/v1/reviews` (roadmap stage 6: the
 * booking-gated write the reputation stage declared awaiting). The
 * backend's own gates teach the caller (measured,
 * ReviewsService.create): 409 "Review already exists for booking"
 * (one per direction), 403 "Only the booking consumer can submit a
 * review", 400 "Cannot review a booking that is not COMPLETED"; the
 * rating bounds are the request's own @Min(1)/@Max(5).
 */
export function createReview(
  bookingId: string,
  rating: number,
  comment: string | null,
): Promise<BackendResult<ReviewView>> {
  return backendSend("POST", "/api/v1/reviews", { bookingId, rating, comment });
}

/**
 * The reverse review — `POST /api/v1/reviews/reverse` (the booking's
 * provider rates its consumer; I8/L21 two-way reviews). Same request
 * shape, same gates mirrored: 409 "Reverse review already exists for
 * booking", 403 "Only the booking provider can submit a reverse
 * review", 400 on a booking that is not COMPLETED. The provider's own
 * rating average is unaffected (the aggregate filters the FORWARD
 * direction only — the backend's own contract).
 */
export function createReverseReview(
  bookingId: string,
  rating: number,
  comment: string | null,
): Promise<BackendResult<ReviewView>> {
  return backendSend("POST", "/api/v1/reviews/reverse", { bookingId, rating, comment });
}

/**
 * W4 (yelp-level plan §5 — G28, #494): the public reviewer profile —
 * `GET /api/v1/users/{id}/public` (ANONYMOUS — the SecurityConfig
 * precise-wildcard line, the L36 precedent: no auth gate, unknown ids
 * answer 404, a live account with no published reviews is the honest
 * zero profile). The path id is the reviewer's USER id — the SAME key
 * the review rows carry as `reviewerId` (no id-space seam). Memoized
 * per render pass so generateMetadata and the page body share ONE read.
 */
export const getReviewerPublicProfile = cache(
  async (reviewerId: string): Promise<BackendResult<ReviewerPublicProfileView>> =>
    publicGet(`/api/v1/users/${encodeURIComponent(reviewerId)}/public`),
);

/**
 * Reviews WRITTEN by one user — `GET /api/v1/reviews/reviewer/{id}`
 * (measured live 200; the controller's own docs call it "the public
 * profile surface — both directions"). Newest first, paged. The path
 * id is the caller's backend USER id — the /profile page joins it
 * from the /me projection (getMyBackendUser), never from the client.
 */
export const getReviewsByReviewer = cache(
  async (
    reviewerUserId: string,
    page: number,
    size: number,
  ): Promise<BackendResult<PagedResponse<ReviewView>>> =>
    publicGet(
      `/api/v1/reviews/reviewer/${encodeURIComponent(reviewerUserId)}?page=${page}&size=${size}`,
    ),
);

/**
 * Reviews written ABOUT one consumer — `GET /api/v1/reviews/consumer/{id}`
 * (I8 reverse direction — the consumer's trust surface: what providers
 * said about them after completed bookings; measured live 200). Newest
 * first, paged. Same ME-chain id discipline as getReviewsByReviewer.
 */
export const getReviewsOfConsumer = cache(
  async (
    consumerUserId: string,
    page: number,
    size: number,
  ): Promise<BackendResult<PagedResponse<ReviewView>>> =>
    publicGet(
      `/api/v1/reviews/consumer/${encodeURIComponent(consumerUserId)}?page=${page}&size=${size}`,
    ),
);

/**
 * Edit my review — `PUT /api/v1/reviews/{id}` `{rating, comment}`.
 * The ORIGINAL REVIEWER only: the backend's ReviewsService.update
 * owns the check (403 for anyone else, 404 unknown); the provider
 * rating average recomputes server-side. The rating bounds mirror
 * the request's own @Min(1)/@Max(5).
 */
export function updateReview(
  reviewId: string,
  rating: number,
  comment: string | null,
): Promise<BackendResult<ReviewView>> {
  return backendSend("PUT", `/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
    rating,
    comment,
  });
}

/**
 * The organic review — `POST /api/v1/reviews/organic` (W1, yelp-level
 * plan §4.1/§4.5): a general review with no booking, enabled in the
 * OPEN/HYBRID reviews mode only. The path's provider id is the PUBLIC
 * PROFILE id (the provider page's own key — the server resolves the
 * user-id space). The backend's own gates teach the caller (measured,
 * ReviewsService.createOrganic): 400 "Organic reviews are not enabled in
 * the current reviews mode (VERIFIED_ONLY)", 400 on the provider itself
 * ("You cannot review your own business"), 400 under the 7-day account
 * age floor, 429 on the daily organic cap, 409 "You already reviewed
 * this provider" (one organic review per reviewer-provider, forever),
 * 400 when an optional listingId belongs to another provider.
 */
export function createOrganicReview(
  providerId: string,
  rating: number,
  comment: string | null,
  listingId?: string,
): Promise<BackendResult<ReviewView>> {
  return backendSend("POST", "/api/v1/reviews/organic", {
    providerId,
    listingId: listingId ?? null,
    rating,
    comment,
  });
}

/**
 * Mark a review helpful — `POST /api/v1/reviews/{id}/votes` (W1 §4.5).
 * The backend's own gates teach the caller: 404 a non-published review
 * (the visibility rule), 400 the author's own review ("You cannot mark
 * your own review as helpful"), 409 a duplicate vote. Anonymous
 * callers answer 401 AUTHN-001.
 */
export function voteReviewHelpful(
  reviewId: string,
): Promise<BackendResult<void>> {
  return backendSend("POST", `/api/v1/reviews/${encodeURIComponent(reviewId)}/votes`);
}

/**
 * Remove my helpful vote — `DELETE /api/v1/reviews/{id}/votes` (W1
 * §4.5). 404 when no live vote exists (the soft delete frees the pair,
 * so a re-vote is legal by construction).
 */
export function unvoteReviewHelpful(
  reviewId: string,
): Promise<BackendResult<void>> {
  return backendSend("DELETE", `/api/v1/reviews/${encodeURIComponent(reviewId)}/votes`);
}

/**
 * W1 §4.4 (the completion slice): a review's photos — `GET /api/v1/media/
 * reviews/by-review/{id}`. Every UPLOADED asset in display order, each
 * with a fresh presigned GET URL. PUBLIC for a PUBLISHED review (the same
 * visibility the review endpoints grant it) — an anonymous publicGet, so
 * the provider page's galleries crawl-render identically; a non-published
 * review's photos answer the author/admin path instead (the caller's
 * session decides server-side, never the client).
 *
 * Honest degradation: a failed read renders NO gallery (the N4 lesson —
 * a review without photos must not die on an unreachable channel).
 */
export const getReviewMedia = cache(
  async (reviewId: string): Promise<BackendResult<ReviewMediaView[]>> =>
    publicGet(`/api/v1/media/reviews/by-review/${encodeURIComponent(reviewId)}`),
);

/**
 * W1 §4.4: declare a review-photo upload — `POST /api/v1/media/reviews/
 * uploads` (the review's AUTHOR only; the same mediaUpload rate-limiter
 * budget as every upload — an upload is an upload).
 */
export function requestReviewMediaUpload(input: {
  reviewId: string;
  contentType: string;
  sizeBytes: number;
}): Promise<BackendResult<ReviewMediaUploadView>> {
  return backendSend("POST", "/api/v1/media/reviews/uploads", input);
}

/**
 * W1 §4.4: confirm the upload — `POST /api/v1/media/reviews/{id}/
 * complete` (server-side HeadObject verification: exactly the declared
 * type and size; the asset becomes readable on the review).
 */
export function confirmReviewMediaUpload(
  mediaId: string,
): Promise<BackendResult<ReviewMediaView>> {
  return backendSend("POST", `/api/v1/media/reviews/${encodeURIComponent(mediaId)}/complete`);
}

/**
 * W1 §4.4: delete a review-photo — `DELETE /api/v1/media/reviews/{id}`
 * (the review's author or an admin; soft-delete + best-effort storage
 * removal after commit; 204).
 */
export function deleteReviewMedia(
  mediaId: string,
): Promise<BackendResult<void>> {
  return backendSend("DELETE", `/api/v1/media/reviews/${encodeURIComponent(mediaId)}`);
}

/**
 * N7-b (the W1 author path): the caller's OWN written reviews — the SAME
 * `GET /api/v1/reviews/reviewer/{id}` read, but SESSION-authenticated:
 * the W1 visibility gate serves the author (or an admin) EVERY
 * moderation state, everyone else the published surface only. The
 * anonymous twin (getReviewsByReviewer) stays for the public reviewer
 * surfaces; «مراجعاتي» must ride THIS one or the author would never see
 * his own pending/hidden rows — the badge would never render (measured
 * live: the anonymous read filtered Noor's HIDDEN row out of her own
 * profile).
 */
export async function getMyWrittenReviews(
  reviewerUserId: string,
  page: number,
  size: number,
): Promise<BackendResult<PagedResponse<ReviewView>>> {
  return backendGet(
    `/api/v1/reviews/reviewer/${encodeURIComponent(reviewerUserId)}?page=${page}&size=${size}`,
  );
}
