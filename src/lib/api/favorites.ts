/**
 * The favorites channel (W3 — yelp-level plan §5/G19, #492): the
 * authenticated /me saved-listings surface on the same data-channel
 * discipline as every house channel — reads and writes both
 * session-authenticated (`backendGet`/`backendSend` from server.ts:
 * the session Bearer, direct BACKEND_URL fetch, expected failures as
 * data). The SavedSearch/follows house shape: the caller's user id IS
 * the owner key server-side, so the client never sends one; the write
 * path carries the LISTING id (the pair's own other half — the
 * controller's own path shape).
 */

import { backendGet, backendSend, type BackendResult } from "./server";
import type { PagedResponse } from "./types";
import type { ListingFavoriteView } from "./favorites-contract";
import { MY_FAVORITES_PAGE_SIZE } from "./favorites-contract";

/**
 * My saved listings — `GET /api/v1/me/favorites?page&size` (newest
 * saved first, deterministic order server-enforced; each row carries
 * the listing's CURRENT status — a later-expired save stays saved and
 * shows the truth).
 */
export async function getMyFavorites(
  page = 0,
  size = MY_FAVORITES_PAGE_SIZE,
): Promise<BackendResult<PagedResponse<ListingFavoriteView>>> {
  return backendGet(`/api/v1/me/favorites?page=${page}&size=${size}`);
}

/**
 * Save a listing for later — `POST /api/v1/me/favorites/{listingId}`
 * (201 + the composed view). The backend's own gate order teaches:
 * 404 an unknown listing (before any write), 409 an already-saved live
 * pair (its words name the withdraw channel).
 */
export function saveListingFavorite(
  listingId: string,
): Promise<BackendResult<ListingFavoriteView>> {
  return backendSend(
    "POST",
    `/api/v1/me/favorites/${encodeURIComponent(listingId)}`,
  );
}

/**
 * Withdraw a saved listing — `DELETE /api/v1/me/favorites/{listingId}`
 * (the LISTING id — the pair's own key, unlike the follows surface's
 * row id). 204 on success; a pair with no live favorite answers the
 * honest 404. The row stays for the audit trail — a re-save is a fresh
 * row, never a resurrection.
 */
export function unsaveListingFavorite(
  listingId: string,
): Promise<BackendResult<null>> {
  return backendSend(
    "DELETE",
    `/api/v1/me/favorites/${encodeURIComponent(listingId)}`,
  );
}
