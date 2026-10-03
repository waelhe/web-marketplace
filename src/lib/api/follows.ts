/**
 * The follows channel (W4 — yelp-level plan §5/G21, #494): the
 * authenticated /me follows surface on the same data-channel discipline
 * as every house channel — reads and writes both session-authenticated
 * (`backendGet`/`backendSend` from server.ts: the session Bearer, direct
 * BACKEND_URL fetch, expected failures as data). The SavedSearch house
 * shape: the caller's user id IS the owner key server-side, so the
 * client never sends one.
 */

import { backendGet, backendSend, type BackendResult } from "./server";
import type { PagedResponse } from "./types";
import type { ProviderFollowView } from "./follows-contract";
import { MY_FOLLOWS_PAGE_SIZE } from "./follows-contract";

/**
 * My follows — `GET /api/v1/me/follows` (newest first, deterministic
 * order; each row composed with the provider's current public identity).
 */
export async function getMyFollows(
  page = 0,
  size = MY_FOLLOWS_PAGE_SIZE,
): Promise<BackendResult<PagedResponse<ProviderFollowView>>> {
  return backendGet(`/api/v1/me/follows?page=${page}&size=${size}`);
}

/**
 * Follow a provider — `POST /api/v1/me/follows` `{providerId}` (the
 * PUBLIC PROFILE id — the provider page's own key). The backend's own
 * gates teach the caller: 400 your own profile, 409 a live duplicate,
 * 404 an unknown profile, 429 the rate-limiter's budget.
 */
export function followProvider(
  providerId: string,
): Promise<BackendResult<ProviderFollowView>> {
  return backendSend("POST", "/api/v1/me/follows", { providerId });
}

/**
 * Unfollow — `DELETE /api/v1/me/follows/{id}` (the follow ROW id, not
 * the provider id). 204 on success; a foreign id answers 404 with the
 * backend's own words ("it is not in your list"). The pair is freed, so
 * following the same provider again is legal.
 */
export function unfollowProvider(
  followId: string,
): Promise<BackendResult<void>> {
  return backendSend(
    "DELETE",
    `/api/v1/me/follows/${encodeURIComponent(followId)}`,
  );
}
