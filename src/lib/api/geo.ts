/**
 * Public geo data access for React Server Components — the neighborhood
 * picker's channel (community plan stage 2: geo selection → L41 join).
 *
 * Same discipline as src/lib/api/public.ts: anonymous direct server GETs
 * (the geo surface is permitAll — measured live on the Railway production
 * backend 2026-09-22: /api/v1/geo/suggest and /api/v1/geo/{id}/children
 * answer anonymous GETs), no session, no Bearer, `no-store`, expected
 * failures returned as data, never a self-fetch through /api/backend
 * (packaged BFF guide).
 *
 * Measured backend facts this module rides (GeoController, marketplace-geo):
 * - `GET /api/v1/geo/{id}/children` — direct children in stable slug
 *   order; an unknown parent answers 404 problem+json.
 * - `GET /api/v1/geo/suggest?q=…` — prefix autocomplete over
 *   nameAr/nameEn/slug, ordered shallow-first; below the 2-character
 *   floor the backend answers 400 BEFORE any query (the type-gate
 *   philosophy) — pages must mirror that floor instead of burning the
 *   roundtrip.
 * - `GET /api/v1/geo/tree` — the designed one-shot tree read —
 *   currently answers 409 CONFLICT-001 persistently on production
 *   (measured 3x, 2026-09-22: "Resource was modified by another
 *   transaction. Please retry."). This module therefore does NOT build
 *   on /tree; it walks the hierarchy through /children from the seeded
 *   root. When the backend incident is resolved the walk can be swapped
 *   for one /tree GET — the swap point is findGeoNodeById().
 */

import { cache } from "react";
import { decodeProblem, type ProblemDetail } from "@/lib/problem";
import type { BackendResult } from "./server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/**
 * The seeded tree root (سوريا, level 0). A fixed-UUID contract, not a
 * magic number: R__seed_geo_qudsaya.sql upserts the pilot hierarchy by
 * FIXED id precisely so consumers hold deterministic references across
 * environments — the seed file is the documented source of this value.
 */
export const GEO_ROOT_ID = "11111111-1111-4111-8111-111111111101";

/** One node of the administrative hierarchy (shared-api GeoLookupPort.GeoNode). */
export interface GeoNode {
  id: string;
  parentId: string | null;
  /** 0=country, 1=governorate, 2=city, 3=neighborhood — an int by contract. */
  level: number;
  nameAr: string;
  nameEn: string | null;
  slug: string;
  /** Always [] on /children and /suggest responses (the tree nests; these don't). */
  children: GeoNode[];
}

/** The geo suggest prefix floor — the backend's own type gate (400 below it). */
export const GEO_SUGGEST_MIN_LENGTH = 2;

/** A minimal UUID shape check — mirrors the backend's path-variable parsing. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function publicGet<T>(path: string): Promise<BackendResult<T>> {
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}${path}`, {
      headers: { Accept: "application/problem+json, application/json" },
      cache: "no-store",
    });
  } catch {
    // Network-level failure: honest, expected state — data, not a crash.
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

/**
 * The drill-down read: `GET /api/v1/geo/{id}/children` — direct children
 * in stable slug order; 404 for an unknown parent. Memoized per render
 * pass so the picker, the name resolution walk, and any metadata read
 * share one GET per node.
 */
export const getGeoChildren = cache(
  async (parentId: string): Promise<BackendResult<GeoNode[]>> =>
    publicGet(`/api/v1/geo/${encodeURIComponent(parentId)}/children`),
);

/**
 * The autocomplete read: `GET /api/v1/geo/suggest?q=…` — prefix search
 * over Arabic/Latin names and slugs, shallow-first. Callers MUST enforce
 * the 2-character floor (the backend answers 400 below it — mirror the
 * type gate in the page instead of spending the roundtrip).
 */
export async function getGeoSuggest(q: string): Promise<BackendResult<GeoNode[]>> {
  return publicGet(`/api/v1/geo/suggest?q=${encodeURIComponent(q)}`);
}

/**
 * Resolve one node by id through a top-down walk from the seeded root —
 * the honest substitute for the /tree read (409 on production) and for
 * the absent get-one-geo-by-id public endpoint. The walk is breadth
 * first over /children levels (the hierarchy is administratively small
 * — the seed is a country/governorate/city pilot); memoized per render
 * pass so the membership card and the page body share one walk.
 *
 * Returns null when the walk cannot complete (backend unreachable) or
 * the id simply is not in the tree — callers decide how to render the
 * honest fallback.
 */
export const findGeoNodeById = cache(async (targetId: string): Promise<GeoNode | null> => {
  if (!isUuid(targetId)) return null;

  let levelNodes = await getGeoChildren(GEO_ROOT_ID); // level 1
  for (let level = 1; level <= 3; level++) {
    if (!levelNodes.ok) return null;
    const hit = levelNodes.data.find((node) => node.id === targetId);
    if (hit) return hit;
    if (level === 3) break;
    // Fetch the next level in parallel; failed branches resolve to []
    // (one dead branch must not kill the whole walk).
    const nextLists = await Promise.all(
      levelNodes.data.map((node) => getGeoChildren(node.id)),
    );
    levelNodes = {
      ok: true,
      status: 200,
      data: nextLists.flatMap((result) => (result.ok ? result.data : [])),
    };
  }
  return null;
});
