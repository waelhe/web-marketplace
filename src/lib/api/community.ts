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
import type {
  ContentReportView,
  CreateMarketItemInput,
  CreateNeighborhoodEventInput,
  EventCategory,
  EventRsvp,
  GroupMembership,
  MarketCategory,
  NeighborhoodEvent,
  NeighborhoodGroup,
  NeighborhoodMarketItem,
  NeighborhoodMembership,
  NeighborhoodPost,
  PostCategory,
  PostComment,
  PostReaction,
  ReportReason,
  ReportTargetType,
} from "./community-contract";

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
 * Request a manual residency-verification review —
 * `POST /api/v1/me/neighborhood/verification-requests` (the verification
 * lifecycle, PR #483). Measured semantics: an UNVERIFIED or REJECTED
 * membership moves to PENDING (the echoed view carries it); an already
 * PENDING or VERIFIED membership answers 409 with the backend's words.
 * No SMS/email/postal provider is contacted — the first runnable verifier
 * is an administrator (D-N3's documented manual-first flow).
 */
export function requestNeighborhoodVerification(): Promise<BackendResult<NeighborhoodMembership>> {
  return backendSend("POST", "/api/v1/me/neighborhood/verification-requests");
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

/**
 * Read one post's comments — `GET /api/v1/posts/{postId}/comments`.
 * Chronological (createdAt ASC, id ASC — the backend's complete sort
 * key); the post gate runs first (unknown/hidden/deleted → the honest
 * 404) and the membership gate matches the feed's (active membership
 * in the post's OWN neighborhood, else 403). Page 0 + a bounded size
 * is the on-demand disclosure's read.
 */
export function getPostComments(
  postId: string,
  page: number,
  size: number,
): Promise<BackendResult<PagedResponse<PostComment>>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return backendGet(`/api/v1/posts/${encodeURIComponent(postId)}/comments?${params.toString()}`);
}

/**
 * Comment on a post — `POST /api/v1/posts/{postId}/comments`
 * `{body}` (≤ 2000 — the controller's bound). Same active-membership
 * gate as the feed, in the post's OWN neighborhood; VISIBLE posts
 * only (404 otherwise). The post's author is notified
 * (POST_COMMENTED) after commit — unless the commenter IS the author.
 */
export function createPostComment(
  postId: string,
  body: string,
): Promise<BackendResult<PostComment>> {
  return backendSend("POST", `/api/v1/posts/${encodeURIComponent(postId)}/comments`, { body });
}

/**
 * Delete my post — `DELETE /api/v1/posts/{postId}`. The author's own
 * soft delete (the audit trail keeps every revision — the reads stop
 * returning it and the comments follow in the read path). Only the
 * author: anyone else answers 403; an unknown post answers 404. 204
 * on success (resolves to `data: null`).
 */
export function deleteNeighborhoodPost(postId: string): Promise<BackendResult<null>> {
  return backendSend<null>("DELETE", `/api/v1/posts/${encodeURIComponent(postId)}`);
}

/**
 * Thank a post — `POST /api/v1/posts/{postId}/reactions` (L47). The
 * backend's gate order is the comment's own verbatim: an unknown,
 * hidden or deleted post answers the honest 404 (a hidden post's
 * reactions are absent exactly as the post itself is); an active
 * membership in the post's OWN neighborhood is required (403
 * otherwise — a reaction is a community contribution like a comment);
 * and one voice per member is the product's own law — a second thank
 * answers 409 with the backend's words. The post's author is notified
 * (POST_REACTED) after commit — unless the reactor IS the author. The
 * feed read carries the live count and the caller's own voice
 * (`reactionsCount` / `reactedByMe`) — no second read needed.
 */
export function reactToPost(postId: string): Promise<BackendResult<PostReaction>> {
  return backendSend("POST", `/api/v1/posts/${encodeURIComponent(postId)}/reactions`);
}

/**
 * Remove my thank — `DELETE /api/v1/posts/{postId}/reactions` (L47).
 * The same gates as the thank (the post's honest 404, then the
 * membership 403); a member with no LIVE thank answers the honest 404
 * (there is nothing to remove). 204 on success — the voice is free
 * for a fresh one (the soft-deleted row stays for the audit trail).
 */
export function removePostReaction(postId: string): Promise<BackendResult<null>> {
  return backendSend<null>("DELETE", `/api/v1/posts/${encodeURIComponent(postId)}/reactions`);
}

/**
 * Report a piece of content — `POST /api/v1/reports` (L45). Authenticated
 * with NO membership condition (the plan's own reasoning: whoever can
 * see the feed is a member already). The target must be VISIBLE
 * content (404 unknown/hidden/deleted); reporting your own content
 * answers 409; a second live report on the same target answers 409
 * (one report per reporter per target — the V64 partial unique index).
 * The report lands OPEN in the administrative queue. `note` is
 * optional, ≤ 2000.
 */
export function createContentReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  note?: string;
}): Promise<BackendResult<ContentReportView>> {
  return backendSend("POST", "/api/v1/reports", input);
}

// ---------------------------------------------------------------------------
// L49 — the events board + RSVP (gap #4)
// ---------------------------------------------------------------------------

/**
 * Read my neighborhood's events board —
 * `GET /api/v1/neighborhood/events?category=&page=&size=`. The board is
 * MEMBERSHIP-scoped like the feed (G-N1/G-N3: "one membership, one
 * board — there is no location parameter to read anyone else's") and
 * FORWARD-LOOKING: only events whose start is still to come ride the
 * read, soonest first on the complete sort key (startsAt ASC, id ASC).
 * Every row carries the two attendance facts (attending / rsvpedByMe)
 * — the joined state renders from the contract alone, no second read.
 * The optional category filter is the board's one server-side axis;
 * THIS_WEEK and MINE stay the product's client-side view chips over
 * the loaded board (startsAt and rsvpedByMe ride every row).
 */
export function getMyNeighborhoodEvents(
  page: number,
  size: number,
  category?: EventCategory,
): Promise<BackendResult<PagedResponse<NeighborhoodEvent>>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (category) params.set("category", category);
  return backendGet(`/api/v1/neighborhood/events?${params.toString()}`);
}

/**
 * Organize an event — `POST /api/v1/neighborhood/events` (L49). The
 * backend's gate order (before any write): the location resolves
 * through the geo port (404 unknown), must be level-3 (400), the
 * caller's own active membership (403), the start strictly in the
 * future (400 — the board is forward-looking), endsAt after startsAt
 * when present (400), and the ONE registration/capacity rule (OPEN
 * carries no capacity; the two seated states a strictly positive
 * one). Title/labels ≤ 200, description ≤ 2000 — the type gate
 * answers 400 before any write.
 */
export function createNeighborhoodEvent(
  input: CreateNeighborhoodEventInput,
): Promise<BackendResult<NeighborhoodEvent>> {
  return backendSend("POST", "/api/v1/neighborhood/events", input);
}

/**
 * Take a seat on an event — `POST /api/v1/events/{eventId}/rsvp`
 * (L49). The gate order is the L47 reaction order verbatim: the
 * event's honest 404 (a deleted event's seats are absent exactly as
 * the event itself is), the active-membership gate in the event's OWN
 * neighborhood (403), one seat per member (409 — «مقعد واحد لكل عضو»),
 * and only then the capacity count (409 when the seated states'
 * capacity is full — OPEN events never capacity-gate). The seat
 * serializes on the event row, so concurrent seats queue in order.
 */
export function rsvpEvent(eventId: string): Promise<BackendResult<EventRsvp>> {
  return backendSend("POST", `/api/v1/events/${encodeURIComponent(eventId)}/rsvp`);
}

/**
 * Free my seat — `DELETE /api/v1/events/{eventId}/rsvp` (L49). The
 * same gates as the RSVP; a member with no LIVE seat answers the
 * honest 404 (there is nothing to free). 204 on success — the seat is
 * free for a fresh one (the soft-deleted row stays for the audit
 * trail).
 */
export function unrsvpEvent(eventId: string): Promise<BackendResult<null>> {
  return backendSend<null>("DELETE", `/api/v1/events/${encodeURIComponent(eventId)}/rsvp`);
}

/**
 * Delete my event — `DELETE /api/v1/neighborhood/events/{eventId}`
 * (L49). The organizer's own soft delete: the row stays (the audit
 * trail keeps every revision), the reads stop returning it, and the
 * seats follow in the read path. Only the organizer — anyone else
 * answers 403; an unknown event answers 404. 204 on success.
 */
export function deleteNeighborhoodEvent(eventId: string): Promise<BackendResult<null>> {
  return backendSend<null>(
    "DELETE",
    `/api/v1/neighborhood/events/${encodeURIComponent(eventId)}`,
  );
}

// ---------------------------------------------------------------------------
// L50 — the neighborhood market board (gap #5, «سوق الحي والحراج»)
// ---------------------------------------------------------------------------

/**
 * Read my neighborhood's market board —
 * `GET /api/v1/neighborhood/market?category=&q=&mine=&page=&size=`.
 * The board is MEMBERSHIP-scoped like the feed and the events board
 * (G-N1/G-N3: "one membership, one board — there is no location
 * parameter to read anyone else's"), newest first on the complete
 * sort key (createdAt DESC, id DESC). Every row carries the two
 * caller-scoped facts (sellerVerified / mine) — the badge and the
 * withdraw button render from the contract alone, no second read.
 * The three filter axes are the product's own: the category chips,
 * the search box (title + pickup-spot label), and the mine view.
 */
export function getMyNeighborhoodMarket(
  page: number,
  size: number,
  category?: MarketCategory,
  q?: string,
  mine?: boolean,
): Promise<BackendResult<PagedResponse<NeighborhoodMarketItem>>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (category) params.set("category", category);
  if (q && q.trim().length > 0) params.set("q", q.trim());
  if (mine) params.set("mine", "true");
  return backendGet(`/api/v1/neighborhood/market?${params.toString()}`);
}

/**
 * Publish an item to my neighborhood's market —
 * `POST /api/v1/neighborhood/market` (L50). The backend's gate order
 * (before any write): the location resolves through the geo port (404
 * unknown), must be level-3 (400), the caller's own active — and
 * REJECTED-excluded — membership (403), and the ONE pricing rule
 * (400: a FREE item carries no price at all, «مجاني ⇔ بلا سعر»; the
 * four sale categories carry strictly positive integer cents + a
 * 3-letter ISO 4217 code). Title/locationLabel ≤ 200 — the type gate
 * answers 400 before any write.
 */
export function createMarketItem(
  input: CreateMarketItemInput,
): Promise<BackendResult<NeighborhoodMarketItem>> {
  return backendSend("POST", "/api/v1/neighborhood/market", input);
}

/**
 * Withdraw my market item — `DELETE /api/v1/neighborhood/market/{itemId}`
 * (L50). The author's own soft delete: the row stays (the audit trail
 * keeps every revision), the reads stop returning it. Only the author
 * — anyone else answers 403; an unknown item answers the honest 404.
 * 204 on success.
 */
export function deleteMarketItem(itemId: string): Promise<BackendResult<null>> {
  return backendSend<null>(
    "DELETE",
    `/api/v1/neighborhood/market/${encodeURIComponent(itemId)}`,
  );
}

// ---------------------------------------------------------------------------
// L51 — the neighbors groups board (gap #6, «مجموعات الجيران»)
// ---------------------------------------------------------------------------

/**
 * Read my neighborhood's groups board —
 * `GET /api/v1/neighborhood/groups?page=&size=`. The board is
 * MEMBERSHIP-scoped like the feed, the events board and the market
 * board (G-N1/G-N3: "one membership, one board — there is no location
 * parameter to read anyone else's"), in the hood's HISTORICAL order
 * (oldest club first — the seed's own insertion order) on the complete
 * sort key (createdAt ASC, id ASC). Every row carries the two
 * reader-scoped facts — members (the LIVE count) and joinedByMe — so
 * the meta line and the join/leave button render from the contract
 * alone, no second read.
 */
export function getMyNeighborhoodGroups(
  page: number,
  size: number,
): Promise<BackendResult<PagedResponse<NeighborhoodGroup>>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return backendGet(`/api/v1/neighborhood/groups?${params.toString()}`);
}

/**
 * Join a group — `POST /api/v1/neighborhood/groups/{groupId}/membership`
 * (L51). The backend's gate order (before any write): the group's
 * honest 404 (an unknown or retired group's memberships are absent
 * exactly as the group itself is), the caller's own active — and
 * REJECTED-excluded — membership in exactly the group's neighborhood
 * (403 otherwise), and ONE live membership per member per group (409 —
 * «عضوية واحدة لكل جار»).
 */
export function joinGroup(groupId: string): Promise<BackendResult<GroupMembership>> {
  return backendSend(
    "POST",
    `/api/v1/neighborhood/groups/${encodeURIComponent(groupId)}/membership`,
  );
}

/**
 * Leave a group — `DELETE /api/v1/neighborhood/groups/{groupId}/membership`
 * (L51). The same gates as the join; a member with no live membership
 * answers the honest 404 (there is nothing to leave). 204 on success —
 * the seat is free for a fresh join (the soft-deleted row stays for the
 * audit trail).
 */
export function leaveGroup(groupId: string): Promise<BackendResult<null>> {
  return backendSend<null>(
    "DELETE",
    `/api/v1/neighborhood/groups/${encodeURIComponent(groupId)}/membership`,
  );
}
