/**
 * Public-surface server data access for React Server Components.
 *
 * The catalog public endpoints answer anonymous GETs (measured live on
 * the Railway production backend 2026-09-22: browse + detail + category
 * surfaces, robots.txt) — unlike src/lib/api/server.ts this path never
 * touches the Better Auth session, so public pages render for anonymous
 * visitors AND search-engine crawlers (the SEO reason these surfaces
 * exist). Same data-channel discipline as the authenticated layer:
 * direct BACKEND_URL fetch from the server (the packaged BFF guide —
 * never a self-fetch through /api/backend), expected failures returned
 * as data, `no-store` freshness (listings expire; the detail read is
 * the L40 analytics signal itself).
 *
 * React `cache()` dedups one detail read across `generateMetadata` and
 * the page body within a single request — exactly ONE backend GET per
 * page view. This honors the backend's L40 view-counter contract
 * (CatalogController: "every successful read counts one (deduplicated)
 * view"): a second fetch for metadata would double-count views.
 */

import { cache } from "react";
import { decodeProblem, type ProblemDetail } from "@/lib/problem";
import type { BackendResult } from "./server";
import type { ListingDetail, ListingSummary, PagedResponse, PropertyPurpose, PropertyType } from "./types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/** Direct anonymous GET — no session, no Bearer, no cookies. */
async function publicGet<T>(path: string): Promise<BackendResult<T>> {
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}${path}`, {
      headers: { Accept: "application/problem+json, application/json" },
      cache: "no-store",
    });
  } catch {
    // Network-level failure: backend unreachable (e.g. local backend not
    // started, Railway cold moment). Honest, expected state — data, not a
    // crash of the render.
    return { ok: false, status: 0, problem: null, unauthenticated: false };
  }

  if (!upstream.ok) {
    const problem = await decodeBody(upstream);
    return { ok: false, status: upstream.status, problem, unauthenticated: false };
  }

  return { ok: true, data: (await upstream.json()) as T, status: upstream.status };
}

async function decodeBody(res: Response): Promise<ProblemDetail | null> {
  try {
    return decodeProblem(await res.json());
  } catch {
    return null;
  }
}

/** The listing browse page size — one measured page shape, no invention. */
export const LISTINGS_PAGE_SIZE = 12;

/**
 * The public browse surface: `GET /api/v1/listings?page&size` — paginated
 * ACTIVE listings (the L29 mobile-docs public browse). Memoized per
 * render pass so a page and its metadata share one read.
 */
export const getActiveListings = cache(
  async (page: number, size: number): Promise<BackendResult<PagedResponse<ListingSummary>>> =>
    publicGet(`/api/v1/listings?page=${page}&size=${size}`),
);

/**
 * Criteria for `GET /api/v1/search` (operation `searchWithCriteria`,
 * public, Task-0-verified names — every member optional). Sort rides the
 * separate `sort` argument (probed wire forms only — see the listings
 * page), never this record.
 */
export interface SearchCriteria {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  locationId?: string;
  purpose?: PropertyPurpose;
  propertyType?: PropertyType;
  minRooms?: number;
  minBathrooms?: number;
  minAreaM2?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

/**
 * The filtered browse read: `GET /api/v1/search` with Task-0-verified
 * criteria + Spring `page`/`size` (+ optional `sort`). Same channel
 * discipline as the sibling reads: anonymous direct GET, `no-store`,
 * expected failures as data, memoized per render pass. Only DEFINED
 * members are serialized — absent/empty/invalid inputs never reach the
 * wire (the page sanitizes at its parse boundary).
 */
export const searchListings = cache(
  async (
    criteria: SearchCriteria,
    page: number,
    size: number,
    sort?: string,
  ): Promise<BackendResult<PagedResponse<ListingSummary>>> => {
    const qs = new URLSearchParams();
    if (criteria.q !== undefined) qs.set("q", criteria.q);
    if (criteria.category !== undefined) qs.set("category", criteria.category);
    if (criteria.minPrice !== undefined) qs.set("minPrice", String(criteria.minPrice));
    if (criteria.maxPrice !== undefined) qs.set("maxPrice", String(criteria.maxPrice));
    if (criteria.checkIn !== undefined) qs.set("checkIn", criteria.checkIn);
    if (criteria.checkOut !== undefined) qs.set("checkOut", criteria.checkOut);
    if (criteria.guests !== undefined) qs.set("guests", String(criteria.guests));
    if (criteria.locationId !== undefined) qs.set("locationId", criteria.locationId);
    if (criteria.purpose !== undefined) qs.set("purpose", criteria.purpose);
    if (criteria.propertyType !== undefined) qs.set("propertyType", criteria.propertyType);
    if (criteria.minRooms !== undefined) qs.set("minRooms", String(criteria.minRooms));
    if (criteria.minBathrooms !== undefined) qs.set("minBathrooms", String(criteria.minBathrooms));
    if (criteria.minAreaM2 !== undefined) qs.set("minAreaM2", String(criteria.minAreaM2));
    if (criteria.lat !== undefined) qs.set("lat", String(criteria.lat));
    if (criteria.lng !== undefined) qs.set("lng", String(criteria.lng));
    if (criteria.radiusKm !== undefined) qs.set("radiusKm", String(criteria.radiusKm));
    qs.set("page", String(page));
    qs.set("size", String(size));
    if (sort !== undefined) qs.set("sort", sort);
    return publicGet(`/api/v1/search?${qs.toString()}`);
  },
);

/**
 * The public listing detail: `GET /api/v1/listings/{id}` — 404 on
 * INACTIVE/ARCHIVED/unknown ids (problem+json), property + JSON-LD
 * embeds when present. Memoized per render pass so generateMetadata and
 * the page body issue exactly ONE backend GET per request (the L40
 * view-counter contract — see the module doc).
 */
export const getListingDetail = cache(
  async (id: string): Promise<BackendResult<ListingDetail>> =>
    publicGet(`/api/v1/listings/${encodeURIComponent(id)}`),
);

/**
 * One provider's public listings: `GET /api/v1/listings/provider/{id}`
 * — paginated ACTIVE listings of a provider with the L31 property block
 * batch-embedded per page. The path id is the PROVIDER USER id (the
 * users.id space — provider_listings.provider_id, the A1 contract), NOT
 * the provider profile id. Measured contract: ACTIVE-only (the public
 * profile surface, CWE-200 guarded); the provider dashboard therefore
 * renders the caller's inventory as the world sees it and declares the
 * non-ACTIVE listing read a backend gap.
 */
export const getProviderListings = cache(
  async (
    providerUserId: string,
    page: number,
    size: number,
  ): Promise<BackendResult<PagedResponse<ListingDetail>>> =>
    publicGet(
      `/api/v1/listings/provider/${encodeURIComponent(providerUserId)}?page=${page}&size=${size}`,
    ),
);
