/**
 * Authenticated community data CHANNEL — stage 2 of the frontend roadmap
 * (community foundation: L41 membership + L42 feed), riding the SAME
 * authenticated RSC channel as everything else: src/lib/api/server.ts
 * (session Bearer, auto-refresh, direct BACKEND_URL fetch, expected
 * failures as data). Server-only (next/headers under it) — the shared
 * contract types/vocabulary live in community-contract.ts.
 *
 * Every contract here is measured from the backend source and the live
 * production API (2026-09-22):
 * - All community endpoints sit behind the resource-server chain's
 *   `anyRequest().authenticated()` — anonymous calls answer 401
 *   AUTHN-001 problem+json (measured on /me/neighborhood,
 *   /neighborhood/posts, PUT /me/neighborhood). The Nextdoor privacy
 *   model: nothing community is public.
 * - The feed is MEMBERSHIP-scoped by design (G-N1/G-N3): "one
 *   membership, one feed — there is no location parameter to read
 *   anyone else's feed". No public per-neighborhood page can exist on
 *   this contract, and none is invented here.
 * - Views are the backend's own projection discipline: the author stays
 *   an opaque UUID (identity seams own resolution); the geo display
 *   names stay the public geo surface's concern (src/lib/api/geo.ts).
 */

import { backendGet, backendSend, type BackendResult } from "./server";
import type { PagedResponse } from "./types";
import type { NeighborhoodMembership, NeighborhoodPost, PostCategory } from "./community-contract";

/**
 * Read the caller's ACTIVE membership — `GET /api/v1/me/neighborhood`.
 * 404 problem+json means "no membership yet" (join first) — that status
 * is the caller's state machine input, not an error to hide.
 */
export function getMyMembership(): Promise<BackendResult<NeighborhoodMembership>> {
  return backendGet("/api/v1/me/neighborhood");
}

/**
 * Join (or switch to) the caller's home neighborhood —
 * `PUT /api/v1/me/neighborhood` `{locationId}`. Measured semantics:
 * 201 when a row was created (join OR switch), 200 on the idempotent
 * re-join; 404 unknown location; 400 for a level 0-2 node — both before
 * any write. One membership slot: switching soft-deletes the old row.
 */
export function joinNeighborhood(
  locationId: string,
): Promise<BackendResult<NeighborhoodMembership>> {
  return backendSend("PUT", "/api/v1/me/neighborhood", { locationId });
}

/**
 * Leave the caller's neighborhood — `DELETE /api/v1/me/neighborhood`.
 * 204 on success (resolves to `data: null`); 404 when there is nothing
 * to leave.
 */
export function leaveNeighborhood(): Promise<BackendResult<null>> {
  return backendSend<null>("DELETE", "/api/v1/me/neighborhood");
}

/**
 * Read the caller's OWN neighborhood feed —
 * `GET /api/v1/neighborhood/posts?category&page&size`. VISIBLE posts
 * newest-first (createdAt DESC, id DESC — deterministic pagination).
 * 403 when the caller holds no active membership (G-N3's honest gate).
 * `category` must be one of POST_CATEGORIES or null (the backend's
 * type gate answers 400 for anything else — callers pass the parsed
 * value, never raw user input).
 */
export function getMyFeed(
  page: number,
  size: number,
  category: PostCategory | null,
): Promise<BackendResult<PagedResponse<NeighborhoodPost>>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (category) params.set("category", category);
  return backendGet(`/api/v1/neighborhood/posts?${params.toString()}`);
}

/**
 * Publish a post into the caller's active neighborhood —
 * `POST /api/v1/neighborhood/posts`. The backend's gate order (before
 * any write): location resolves (404), must be level-3 (400), the
 * caller's membership must match that location (403); title ≤ 200,
 * body ≤ 2000 — the type gate answers 400 before any write. Callers
 * mirror those bounds in the form; the backend remains the authority.
 */
export function createNeighborhoodPost(input: {
  locationId: string;
  category: PostCategory;
  title: string;
  body: string;
}): Promise<BackendResult<NeighborhoodPost>> {
  return backendSend("POST", "/api/v1/neighborhood/posts", input);
}
