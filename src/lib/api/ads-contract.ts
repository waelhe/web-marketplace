/**
 * W5 (yelp-level plan §5 — the ads & billing wave, G24-G26) contract
 * types — the served shapes of the campaign surface, measured from the
 * backend source (AdCampaignController/AdCampaignService/AdClickController
 * @ 193ff24, 2026-10-03) AND the live production round the same day
 * (download/n13-ads-live-proof.txt — every gate's own words):
 *
 * - The owner surface sits under `/providers/me/ads/campaigns` (the
 *   ProviderLedgerController route convention — the owner's own money
 *   surfaces live under providers/me): POST create, GET list (newest
 *   first), POST {id}/pause, POST {id}/resume, GET {id}/charges.
 * - The public half is ONE write: POST /ads/listings/{listingId}/clicks —
 *   200 {campaignId} when the listing's ONE live campaign exists, the
 *   honest 404 no-op otherwise (an unpromoted click is nobody's to bill).
 * - Every money field is integer CENTS with an ISO-4217 currency (the
 *   house money discipline); the create body's bean bounds: budget
 *   strictly positive, prices non-negative (zero = that event is free),
 *   currency optional (blank keeps the house SAR), endsAt an Instant
 *   strictly in the future.
 * - The gate order (measured live): the listing's honest 404 → the
 *   ACTIVE-only 409 → the ownership 403 (AUTHZ-001) → the
 *   single-promotion 409 (the law's own words) → the endsAt 400.
 * - The charges are INSERT-ONLY rows frozen by the daily 04:45 UTC job
 *   — an honest empty list until the first freeze; no surface anywhere
 *   can answer anything but the frozen truth.
 */

/** The campaign's own status vocabulary (AdCampaignStatus, closed set). */
export type AdCampaignStatus = "ACTIVE" | "PAUSED" | "ENDED";

/** The status vocabulary's Arabic UI labels (the served values verbatim). */
export const AD_CAMPAIGN_STATUS_LABELS: Record<AdCampaignStatus, string> = {
  ACTIVE: "نشطة",
  PAUSED: "موقوفة",
  ENDED: "منتهية",
};

/**
 * One campaign row — `GET/POST /providers/me/ads/campaigns`'s own view
 * (AdCampaignView, measured live 2026-10-03): the frozen money state on
 * every row (consumed is always exactly the sum of the frozen charge
 * rows; remaining = budget − consumed).
 */
export type AdCampaignView = {
  id: string;
  listingId: string;
  budgetCents: number;
  clickPriceCents: number;
  impressionPriceCents: number;
  consumedCents: number;
  remainingCents: number;
  currency: string;
  status: AdCampaignStatus;
  startsAt: string;
  endsAt: string | null;
  billedThrough: string;
  createdAt: string;
};

/** One frozen window of the immutable billing history (AdBillingChargeView). */
export type AdBillingChargeView = {
  windowStart: string;
  windowEnd: string;
  impressions: number;
  clicks: number;
  amountCents: number;
  currency: string;
  frozenAt: string;
};

/**
 * The create body (CreateAdCampaignRequest). The listing id travels as
 * the form's own choice (the picker reads MY ACTIVE inventory — the
 * backend re-gates ownership + ACTIVE); the money is integer cents
 * (major units convert client-side, the house money discipline); the
 * currency stays the house SAR (a selectable ISO vocabulary is an owner
 * gate, never invented); endsAt is optional and strictly future.
 */
export type AdCampaignCreateInput = {
  listingId: string;
  budgetCents: number;
  clickPriceCents: number;
  impressionPriceCents: number;
  currency?: string;
  endsAt?: string;
};

/**
 * The major-units conversion floors (the business-services page's own
 * discipline): the form works in whole ر.س and converts to cents
 * losslessly — fractional halalas would round and lie.
 */
export const AD_MONEY_STEP = 1;
