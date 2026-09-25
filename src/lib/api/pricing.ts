/**
 * Authenticated pricing-calendar data CHANNEL — the L26 host tools
 * (roadmap feature-expansion §5: seasonal rates, weekend rules — the
 * batch-1 spec §1 surface), riding the SAME authenticated server channel
 * as everything else: src/lib/api/server.ts (session Bearer,
 * auto-refresh, direct BACKEND_URL fetch, expected failures as data).
 * Server-only (next/headers under it) — the shared contract types live
 * in pricing-contract.ts.
 *
 * Every contract here is measured from the backend source
 * (ListingPriceCalendarController.java, app-java-v3) and live probes
 * through the BFF relay on a qa-tester session (Task 22, 2026-09-25):
 * - Class-level gate hasAnyRole('PROVIDER','ADMIN'); per-listing
 *   ownership resolves independently (the L25 lesson): 403 foreign,
 *   404 unknown, via requireOwnedListing — the same honest gates the
 *   completeness probe teaches.
 * - The GET works for a listing in ANY status (measured 200 on an
 *   archived listing — no status filter on the calendar read).
 * - PUT weekend-rule is an UPSERT (create or re-tune the single live
 *   row); DELETE returns 204 (back to the flat model on weekends).
 * - POST seasonal-rates answers 201 with the created row; a REAL overlap
 *   with a sibling answers 409 (the backend's own words) while adjacent
 *   ranges sharing a boundary are legal (open intervals); PUT replaces
 *   one range's dates and price; DELETE answers 204.
 */

import { backendGet, backendSend, type BackendResult } from "./server";
import type { ListingCalendarView, SeasonalRateView, WeekendRuleView } from "./pricing-contract";

/**
 * My listing's whole price calendar — `GET /api/v1/pricing/listings/{id}/calendar`
 * (weekend rule + seasonal ranges ordered by start date). This read
 * doubles as the ownership probe for the pricing page: 404 unknown, 403
 * foreign — and no status gate exists (measured on an archived listing).
 */
export function getListingPriceCalendar(
  listingId: string,
): Promise<BackendResult<ListingCalendarView>> {
  return backendGet(`/api/v1/pricing/listings/${encodeURIComponent(listingId)}/calendar`);
}

/**
 * Upsert the weekend rule — `PUT …/calendar/weekend-rule {multiplier}`.
 * The multiplier is the factor applied to the base price for Saturday
 * and Sunday nights, bounds (0, 10] at scale 3 (the backend's Bean
 * Validation + V41 — its 400/500 words teach the boundary, surfaced
 * verbatim by the action).
 */
export function upsertWeekendRule(
  listingId: string,
  multiplier: number,
): Promise<BackendResult<WeekendRuleView>> {
  return backendSend(
    "PUT",
    `/api/v1/pricing/listings/${encodeURIComponent(listingId)}/calendar/weekend-rule`,
    { multiplier },
  );
}

/**
 * Remove the weekend rule — `DELETE …/calendar/weekend-rule` (204):
 * weekends return to the flat base price.
 */
export function deleteWeekendRule(
  listingId: string,
): Promise<BackendResult<null>> {
  return backendSend(
    "DELETE",
    `/api/v1/pricing/listings/${encodeURIComponent(listingId)}/calendar/weekend-rule`,
  );
}

/**
 * Add a seasonal range — `POST …/calendar/seasonal-rates
 * {fromDate, toDate, priceCents}` (201 with the created row). The range
 * is [fromDate, toDate) — EXCLUSIVE end; a real overlap with a sibling
 * answers 409, adjacent boundary-sharing ranges are legal.
 */
export function addSeasonalRate(
  listingId: string,
  input: { fromDate: string; toDate: string; priceCents: number },
): Promise<BackendResult<SeasonalRateView>> {
  return backendSend(
    "POST",
    `/api/v1/pricing/listings/${encodeURIComponent(listingId)}/calendar/seasonal-rates`,
    input,
  );
}

/**
 * Replace one seasonal range — `PUT …/calendar/seasonal-rates/{rateId}`
 * (dates and absolute price; the overlap rules apply).
 */
export function updateSeasonalRate(
  listingId: string,
  rateId: string,
  input: { fromDate: string; toDate: string; priceCents: number },
): Promise<BackendResult<SeasonalRateView>> {
  return backendSend(
    "PUT",
    `/api/v1/pricing/listings/${encodeURIComponent(listingId)}/calendar/seasonal-rates/${encodeURIComponent(rateId)}`,
    input,
  );
}

/**
 * Remove one seasonal range — `DELETE …/calendar/seasonal-rates/{rateId}`
 * (204): those nights fall back to the weekend/base rules.
 */
export function deleteSeasonalRate(
  listingId: string,
  rateId: string,
): Promise<BackendResult<null>> {
  return backendSend(
    "DELETE",
    `/api/v1/pricing/listings/${encodeURIComponent(listingId)}/calendar/seasonal-rates/${encodeURIComponent(rateId)}`,
  );
}
