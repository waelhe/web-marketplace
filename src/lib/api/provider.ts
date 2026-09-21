/**
 * Authenticated provider data CHANNEL — roadmap stage 3 (the provider
 * path, Nextdoor Business), riding the SAME authenticated server channel
 * as everything else: src/lib/api/server.ts (session Bearer,
 * auto-refresh, direct BACKEND_URL fetch, expected failures as data).
 * Server-only (next/headers under it) — the shared contract types and
 * vocabulary live in provider-contract.ts.
 *
 * Every contract here is measured from the backend source and live
 * anonymous probes on the production API (app-java-v3 @ c94866c,
 * 2026-09-22):
 * - All provider-scoped surfaces sit behind the resource-server chain —
 *   anonymous calls answer 401 AUTHN-001 problem+json (measured on
 *   /providers/me/stats, /providers/me/listings/views, /providers,
 *   /listings create and /listings/{id}/completeness).
 * - The "me" surfaces resolve the caller's provider through
 *   ProviderLookupPort.findByUserId and answer 404 when no profile
 *   exists (the house answer) — that status is the onboarding state
 *   machine's input, not an error to hide. NOTE (measured gap, declared
 *   in ARCHITECTURE.md §10): there is NO "read my own profile" surface —
 *   the profile record itself is only returned by POST /providers (at
 *   creation) and by GET /providers/{profileId} (public, needs the
 *   profile id this frontend cannot discover).
 * - The listing lifecycle (activate/pause/renew/archive) returns the
 *   full ListingResponse; the response carries NO status field —
 *   expiresAt/pausedReason are the measurable state signals pages derive
 *   from (the public detail read 404s for anything not ACTIVE).
 * - POST /listings requires a VERIFIED provider (measured gate in
 *   CatalogService.create — 400 "Provider is not verified" otherwise).
 */

import { backendGet, backendSend, type BackendResult } from "./server";
import type { ListingDetail } from "./types";
import type {
  ListingCompletenessView,
  ListingMutateInput,
  ProviderListingViewsView,
  ProviderProfileView,
  ProviderStatsView,
  PropertyUpsertInput,
  ViewsWindowDays,
} from "./provider-contract";

/**
 * The caller's per-listing view analytics —
 * `GET /api/v1/providers/me/listings/views?days=`. days must be 7, 30 or
 * 90 (omitted = 30); 404 problem+json means "no provider profile yet"
 * (become one first) — that state is the caller's funnel input.
 */
export function getMyListingViews(
  days?: ViewsWindowDays,
): Promise<BackendResult<ProviderListingViewsView>> {
  const query = days ? `?days=${days}` : "";
  return backendGet(`/api/v1/providers/me/listings/views${query}`);
}

/**
 * The caller's aggregate stats — `GET /api/v1/providers/me/stats`
 * (L25: occupancy, net revenue after commission, completed bookings;
 * omitted window = last 30 days). Same 404-no-profile contract as the
 * views read.
 */
export function getMyStats(): Promise<BackendResult<ProviderStatsView>> {
  return backendGet("/api/v1/providers/me/stats");
}

/**
 * Become a provider — `POST /api/v1/providers` (L36 host onboarding).
 * The caller needs the CONSUMER role (every fresh account); the created
 * profile starts PENDING and listing creation stays gated until the
 * backend's admin verification (measured: CatalogService.create filters
 * on VERIFIED). The full profile record rides the 200 response — the
 * ONLY surface that ever returns this caller's own profile fields
 * (declared gap: no "me" profile read exists).
 */
export function becomeProvider(input: {
  displayName: string;
  bio: string | null;
  actorType: string | null;
  agencyName: string | null;
  licenseNumber: string | null;
}): Promise<BackendResult<ProviderProfileView>> {
  return backendSend("POST", "/api/v1/providers", input);
}

/**
 * Create a listing — `POST /api/v1/listings` (provider). The listing is
 * born DRAFT (the entity's own default) and reaches the public surface
 * only through activation. Measured gates the backend owns: VERIFIED
 * provider (400), title/category required, priceCents in minor units.
 */
export function createListing(
  input: ListingMutateInput,
): Promise<BackendResult<ListingDetail>> {
  return backendSend("POST", "/api/v1/listings", input);
}

/**
 * Update my listing — `PUT /api/v1/listings/{id}` (owner-scoped: 404
 * unknown, 403 foreign). Omitted currency keeps the stored one; omitted
 * maxGuests keeps the stored capacity (the currency contract).
 */
export function updateListing(
  id: string,
  input: ListingMutateInput,
): Promise<BackendResult<ListingDetail>> {
  return backendSend("PUT", `/api/v1/listings/${encodeURIComponent(id)}`, input);
}

/**
 * Activate my listing — `POST /api/v1/listings/{id}/activate`. The
 * publication window resolves from the optional explicit ISO instant or
 * the configured expiry policy (90 days measured on production); an
 * explicit date must be strictly future. This is the L46 bridge trigger:
 * the backend publishes ListingActivatedEvent inside the activation
 * transaction (one publisher, many consumers — the saved-search matcher
 * and the neighborhood bridge).
 */
export function activateListing(
  id: string,
  expiresAt?: string,
): Promise<BackendResult<ListingDetail>> {
  const body = expiresAt ? { expiresAt } : undefined;
  return backendSend("POST", `/api/v1/listings/${encodeURIComponent(id)}/activate`, body);
}

/**
 * Pause my listing — `POST /api/v1/listings/{id}/pause`. Hides it from
 * the public surface without archiving; durably marked MANUAL (a
 * deliberate pause re-enters through activate, never renew).
 */
export function pauseListing(
  id: string,
): Promise<BackendResult<ListingDetail>> {
  return backendSend("POST", `/api/v1/listings/${encodeURIComponent(id)}/pause`);
}

/**
 * Renew my expired listing — `POST /api/v1/listings/{id}/renew`. Works
 * ONLY on the EXPIRED pause (a MANUAL pause answers 409); bounded by
 * the renewal cooldown (409 inside the window — one day measured).
 */
export function renewListing(
  id: string,
): Promise<BackendResult<ListingDetail>> {
  return backendSend("POST", `/api/v1/listings/${encodeURIComponent(id)}/renew`);
}

/**
 * Archive my listing — `POST /api/v1/listings/{id}/archive`. Retires it
 * from the public surface permanently (soft delete). The archived
 * listing has no readable surface afterwards — success navigates back
 * to the provider home.
 */
export function archiveListing(
  id: string,
): Promise<BackendResult<ListingDetail>> {
  return backendSend("POST", `/api/v1/listings/${encodeURIComponent(id)}/archive`);
}

/**
 * My listing's completeness score —
 * `GET /api/v1/listings/{id}/completeness` (L38, provider-owned read:
 * 404 unknown, 403 foreign). Pure recomputed-on-read: four equal
 * quarters (core fields / one UPLOADED photo / the property block / the
 * administrative location). This read doubles as the ownership probe for
 * the manage page — it is the only provider-scoped read that works for
 * a listing in ANY status.
 */
export function getListingCompleteness(
  id: string,
): Promise<BackendResult<ListingCompletenessView>> {
  return backendGet(`/api/v1/listings/${encodeURIComponent(id)}/completeness`);
}

/**
 * Create or replace my listing's property block —
 * `PUT /api/v1/listings/{listingId}/property` (L31, full upsert:
 * omitted optional fields mean "undeclared", the block is replaced
 * atomically). The location, when provided, must exist in the geo tree
 * (404 otherwise — the page builds location options from the public geo
 * channel, never free text).
 */
export function upsertProperty(
  listingId: string,
  input: PropertyUpsertInput,
): Promise<BackendResult<unknown>> {
  return backendSend(
    "PUT",
    `/api/v1/listings/${encodeURIComponent(listingId)}/property`,
    input,
  );
}
