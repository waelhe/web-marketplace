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
import type { ListingDetail, ListingSummary, PagedResponse } from "./types";

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
