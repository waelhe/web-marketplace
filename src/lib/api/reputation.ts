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
import { backendSend, type BackendResult } from "./server";
import { publicGet } from "./public";
import type { PagedResponse } from "./types";
import type { ProviderPublicPageView, ReviewView } from "./reputation-contract";

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
  ): Promise<BackendResult<ProviderPublicPageView>> =>
    publicGet(
      `/api/v1/providers/${encodeURIComponent(profileId)}/public?page=${page}&size=${size}`,
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
