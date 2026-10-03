/**
 * The ads channel (W5 — yelp-level plan §5/G24-G26, #496): the provider's
 * own campaign money-surface on the same data-channel discipline as every
 * house channel (`backendGet`/`backendSend` from server.ts — the session
 * Bearer, direct BACKEND_URL fetch, expected failures as data), plus ONE
 * public write (the click recording) on `backendSendPublic` — the L34
 * lead form's own lane (session-optional, attribution when a session
 * exists). Server-only; the contract types live in ads-contract.ts.
 *
 * Every gate here is the backend's own (measured live on the production
 * API 2026-10-03, download/n13-ads-live-proof.txt):
 * - 404 the listing's honest words ("Listing not found: {id}", NF-001);
 * - 409 ACTIVE-only ("Listing {id} is {STATUS} — only an ACTIVE listing
 *   can be promoted");
 * - 403 the ownership wall (AUTHZ-001);
 * - 409 the single-promotion law ("…already has a live campaign ({id}) —
 *   the single-promotion law: pause or let it end first");
 * - 400 the endsAt rule ("endsAt must be strictly in the future");
 * - resume's own pair: 409 the expired duration ("its duration is over;
 *   start a new campaign") and 409 the guarded lift ("resume is a no-go
 *   until it ends").
 */

import { backendGet, backendSend, backendSendPublic, type BackendResult } from "./server";
import type { AdBillingChargeView, AdCampaignCreateInput, AdCampaignView } from "./ads-contract";

/**
 * My campaigns — `GET /api/v1/providers/me/ads/campaigns` (newest first;
 * every row carries the frozen money state). 404 means "no provider
 * profile yet" — the same funnel input every providers/me surface answers.
 */
export function getMyAdCampaigns(): Promise<BackendResult<AdCampaignView[]>> {
  return backendGet("/api/v1/providers/me/ads/campaigns");
}

/**
 * Start a paid promotion — `POST /api/v1/providers/me/ads/campaigns`
 * (201 + the created view; the backend re-gates the listing's ownership
 * and ACTIVE state — the form's picker is a convenience, never the
 * authority).
 */
export function createAdCampaign(
  input: AdCampaignCreateInput,
): Promise<BackendResult<AdCampaignView>> {
  return backendSend("POST", "/api/v1/providers/me/ads/campaigns", input);
}

/**
 * The owner's hold — `POST …/campaigns/{id}/pause` (the listing loses the
 * paid boost NOW — the cache eviction rides the commit; the paused gap
 * never bills).
 */
export function pauseAdCampaign(
  campaignId: string,
): Promise<BackendResult<AdCampaignView>> {
  return backendSend(
    "POST",
    `/api/v1/providers/me/ads/campaigns/${encodeURIComponent(campaignId)}/pause`,
    {},
  );
}

/**
 * Lift the hold — `POST …/campaigns/{id}/resume` (the boost returns; the
 * billing marker jumps past the dark days; the expired duration and the
 * second live campaign answer 409 with the law's own words).
 */
export function resumeAdCampaign(
  campaignId: string,
): Promise<BackendResult<AdCampaignView>> {
  return backendSend(
    "POST",
    `/api/v1/providers/me/ads/campaigns/${encodeURIComponent(campaignId)}/resume`,
    {},
  );
}

/**
 * The immutable billing history — `GET …/campaigns/{id}/charges` (the
 * frozen windows, newest first; the honest empty until the daily 04:45
 * UTC freeze).
 */
export function getAdCampaignCharges(
  campaignId: string,
): Promise<BackendResult<AdBillingChargeView[]>> {
  return backendGet(
    `/api/v1/providers/me/ads/campaigns/${encodeURIComponent(campaignId)}/charges`,
  );
}

/**
 * Record a promoted-result click — the WAVE'S ONLY PUBLIC WRITE:
 * `POST /api/v1/ads/listings/{listingId}/clicks`. 200 `{campaignId}`
 * when the listing's ONE live campaign exists; the honest 404 no-op
 * otherwise (an unpromoted click is nobody's to bill — the counter's
 * visitor dedup is the backend's own structural business, never the
 * caller's). Fire-and-forget by design: the outcome never gates a
 * render and never surfaces — this call exists so the billing window
 * can later freeze the click the visitor just made.
 */
export function recordAdClick(
  listingId: string,
): Promise<BackendResult<{ campaignId: string }>> {
  return backendSendPublic(
    "POST",
    `/api/v1/ads/listings/${encodeURIComponent(listingId)}/clicks`,
  );
}
