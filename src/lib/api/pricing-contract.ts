/**
 * Pricing-calendar contract types and vocabulary — roadmap host tools
 * (L26, feature-expansion roadmap §5): the listing price-calendar CRUD
 * (`/api/v1/pricing/listings/{listingId}/calendar` with the nested
 * weekend-rule and seasonal-rates resources).
 *
 * Pure types and constants only — client-safe (no next/headers): the
 * authenticated data CHANNEL lives in pricing.ts (same split as
 * provider-contract.ts vs provider.ts).
 *
 * Every shape here is measured from the backend source and the live
 * staging API (app-java-v3, 2026-09-25):
 * - ListingPriceCalendarController (class gate hasAnyRole PROVIDER/ADMIN;
 *   ownership 403 foreign / 404 unknown via requireOwnedListing) and its
 *   nested request records UpsertWeekendRuleRequest / SeasonalRateRequest.
 * - ListingCalendarResponse / WeekendRuleResponse / SeasonalRateResponse
 *   (LocalDate wire form "YYYY-MM-DD"; priceCents int64 minor units).
 * - The GET was measured live THROUGH the BFF relay (200 even on an
 *   archived listing — the calendar read carries no status gate; Task 22
 *   session, 2026-09-25).
 */

/**
 * The weekend multiplier on the base price — the backend's own bounds
 * (UpsertWeekendRuleRequest Bean Validation): (0, 10] — DecimalMin
 * exclusive 0, DecimalMax inclusive 10, the 3-digit scale of V41.
 */
export const WEEKEND_MULTIPLIER_MAX = 10;
/** The entity factory's scale (V41 numeric(5,3)) — at most 3 decimals. */
export const WEEKEND_MULTIPLIER_SCALE = 3;

/**
 * The seasonal range's absolute nightly price — minor units, int64. The
 * backend's own bound (SeasonalRateRequest @DecimalMin 0): zero is legal
 * (a free promotional night), negatives never.
 */
export const SEASONAL_PRICE_CENTS_MIN = 0;

/** WeekendRuleResponse (marketplace-pricing) — one live row per listing. */
export interface WeekendRuleView {
  id: string;
  listingId: string;
  multiplier: number;
  createdAt: string;
  updatedAt: string;
}

/** SeasonalRateResponse (marketplace-pricing) — [fromDate, toDate). */
export interface SeasonalRateView {
  id: string;
  listingId: string;
  /** ISO-8601 local date "YYYY-MM-DD" — range start, inclusive. */
  fromDate: string;
  /** ISO-8601 local date "YYYY-MM-DD" — range end, EXCLUSIVE. */
  toDate: string;
  /** Absolute nightly price for the whole range, minor units. */
  priceCents: number;
  createdAt: string;
  updatedAt: string;
}

/** ListingCalendarResponse (marketplace-pricing) — the whole calendar. */
export interface ListingCalendarView {
  listingId: string;
  /** null = the flat model (no weekend multiplier). */
  weekendRule: WeekendRuleView | null;
  /** Ordered by start date (the backend's own read order). */
  seasonalRates: SeasonalRateView[];
}
