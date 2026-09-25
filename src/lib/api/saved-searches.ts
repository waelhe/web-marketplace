/**
 * Authenticated saved-searches data CHANNEL + the URL↔criteria conversion
 * map — the L35 surface (realestate systems plan §5: saved searches and
 * alerts), batch-1 spec §2. Rides the SAME authenticated server channel
 * as everything else (src/lib/api/server.ts: session Bearer,
 * auto-refresh, direct BACKEND_URL fetch, expected failures as data).
 * Server-only — the browse page's CLIENT forms receive plain props and
 * never import this module.
 *
 * Every contract here is measured (Task 22 session + backend source,
 * 2026-09-25):
 * - SavedSearchController: `GET /api/v1/me/saved-searches` (Spring
 *   Pageable — page/size params), `POST /me/saved-searches {criteria,
 *   alertEnabled}` (201; rate-limited savedSearchCreate, 429 RL-001
 *   fail-fast; per-user cap 409 with the backend's own words), `DELETE
 *   /me/saved-searches/{id}` (204; a foreign id is an honest 404).
 * - The criteria JSON deserializes through the SearchCriteria record's
 *   canonical constructor (SavedSearchService.materializeCriteria) —
 *   field names are the RECORD COMPONENTS (SearchCriteria.java:72-89):
 *   query/latitude/longitude, NOT the /listings URL's q/lat/lng. The
 *   stay window is Instant-typed: ISO-8601 instant strings
 *   ("2026-10-01T14:00:00Z" — the backend integration test's own form).
 * - The public search WIRE (measured live on staging, 2026-09-25):
 *   `checkIn=2026-12-24` answers 400 "Failed to convert 'checkIn'";
 *   `checkIn=2026-12-24T00:00:00Z` answers 200 — the stay window rides
 *   ISO instants on the wire while the /listings URL keeps the date
 *   input's own plain-date form (URL-as-state untouched).
 * - The per-user cap default is 20 (SearchProperties.savedSearches.
 *   maxPerUser @DefaultValue("20")) — one page of size 20 covers the
 *   whole stored set by the backend's own design.
 */

import { backendGet, backendSend, type BackendResult } from "./server";
import type { PagedResponse } from "./types";

/**
 * The stored criteria as the backend re-serializes it — SearchCriteria's
 * own field names. MEASURED (live round-trip, 2026-09-25): the list view
 * serializes EVERY record component, so absent criteria arrive as JSON
 * null (not omitted keys) — every consumer check is null-safe (typeof).
 * `page`/`sort` are NOT criteria (no such record components — they never
 * round-trip). The stay window round-trips as ISO-8601 instant strings.
 */
export interface SavedSearchCriteriaJson {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  /** ISO-8601 instant (Instant-typed record component). */
  checkIn?: string;
  /** ISO-8601 instant (Instant-typed record component). */
  checkOut?: string;
  guests?: number;
  locationId?: string;
  purpose?: string;
  propertyType?: string;
  minRooms?: number;
  minBathrooms?: number;
  minAreaM2?: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

/** SavedSearchView (SavedSearchController) — the /me read model. */
export interface SavedSearchView {
  id: string;
  criteria: SavedSearchCriteriaJson | null;
  alertEnabled: boolean;
  lastMatchedAt: string | null;
  createdAt: string;
}

/** One page covers the whole set (backend cap 20 by default). */
export const SAVED_SEARCHES_PAGE_SIZE = 20;

/**
 * List my saved searches — `GET /api/v1/me/saved-searches?page&size`
 * (newest first, deterministic order — the backend's own contract).
 */
export function getSavedSearches(
  page = 0,
  size = SAVED_SEARCHES_PAGE_SIZE,
): Promise<BackendResult<PagedResponse<SavedSearchView>>> {
  return backendGet(`/api/v1/me/saved-searches?page=${page}&size=${size}`);
}

/**
 * Save a search — `POST /api/v1/me/saved-searches {criteria,
 * alertEnabled}` (201). The backend's save-time type gate materializes
 * the criteria through the SearchCriteria constructor (invalid window /
 * non-positive numerics / partial radius triple → 400; unknown
 * locationId → 404) — its words surface verbatim in the action.
 */
export function createSavedSearch(
  criteria: SavedSearchCriteriaJson,
  alertEnabled: boolean,
): Promise<BackendResult<SavedSearchView>> {
  return backendSend("POST", "/api/v1/me/saved-searches", { criteria, alertEnabled });
}

/** Delete my saved search — `DELETE /api/v1/me/saved-searches/{id}` (204). */
export function deleteSavedSearch(id: string): Promise<BackendResult<null>> {
  return backendSend("DELETE", `/api/v1/me/saved-searches/${encodeURIComponent(id)}`);
}

// ---------------------------------------------------------------------------
// The URL ↔ criteria conversion map (measured — the naming trap)
// ---------------------------------------------------------------------------

/** The /listings URL param names that ARE criteria (page/sort are not). */
const CRITERIA_URL_KEYS = [
  "q",
  "category",
  "minPrice",
  "maxPrice",
  "checkIn",
  "checkOut",
  "guests",
  "locationId",
  "purpose",
  "propertyType",
  "minRooms",
  "minBathrooms",
  "minAreaM2",
  "lat",
  "lng",
  "radiusKm",
] as const;

/** URL name → criteria (record-component) name — the measured trap. */
const URL_TO_CRITERIA: Record<(typeof CRITERIA_URL_KEYS)[number], string> = {
  q: "query",
  category: "category",
  minPrice: "minPrice",
  maxPrice: "maxPrice",
  checkIn: "checkIn",
  checkOut: "checkOut",
  guests: "guests",
  locationId: "locationId",
  purpose: "purpose",
  propertyType: "propertyType",
  minRooms: "minRooms",
  minBathrooms: "minBathrooms",
  minAreaM2: "minAreaM2",
  lat: "latitude",
  lng: "longitude",
  radiusKm: "radiusKm",
};

/** The numeric criteria members (string URL form → finite number). */
const NUMERIC_CRITERIA_URL_KEYS = new Set([
  "minPrice",
  "maxPrice",
  "guests",
  "minRooms",
  "minBathrooms",
  "minAreaM2",
  "radiusKm",
]);

/**
 * URL date forms — plain "YYYY-MM-DD" (the date input's own form) or a
 * full ISO instant. The plain form converts to midnight UTC (the wire's
 * Instant form); the full instant passes verbatim. Anything else is not
 * a stay-window value (absent — the R27 parse-boundary discipline).
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export function toWireInstant(value: string): string | undefined {
  if (DATE_RE.test(value)) return `${value}T00:00:00Z`;
  if (INSTANT_RE.test(value)) return value;
  return undefined;
}

/**
 * The sanitized /listings URL record → the criteria JSON (the save
 * direction). Reads ONLY the known criteria keys (sort/page are never
 * read); numbers parse through Number.isFinite (invalid → absent, never
 * forwarded); the stay window converts to the wire's ISO-instant form.
 */
export function criteriaFromLink(
  link: Record<string, string>,
): SavedSearchCriteriaJson {
  const criteria: SavedSearchCriteriaJson = {};
  for (const urlKey of CRITERIA_URL_KEYS) {
    const raw = link[urlKey];
    if (raw === undefined || raw === "") continue;
    const criteriaKey = URL_TO_CRITERIA[urlKey];
    if (urlKey === "checkIn" || urlKey === "checkOut") {
      const instant = toWireInstant(raw);
      if (instant !== undefined) {
        (criteria as Record<string, string>)[criteriaKey] = instant;
      }
    } else if (NUMERIC_CRITERIA_URL_KEYS.has(urlKey)) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        (criteria as Record<string, number>)[criteriaKey] = parsed;
      }
    } else if (urlKey === "lat" || urlKey === "lng") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        (criteria as Record<string, number>)[criteriaKey] = parsed;
      }
    } else {
      (criteria as Record<string, string>)[criteriaKey] = raw;
    }
  }
  return criteria;
}

/**
 * The stored criteria JSON → the /listings URL record (the return
 * journey: chip → `/listings?<criteria>` — URL is the state). Defensive
 * per member: only the measured types pass through (a foreign producer's
 * unexpected shape degrades to that filter being absent from the link —
 * honest, never a crash). Midnight-UTC instants slice back to the date
 * input's plain form so the round-trip is lossless for this surface's
 * own saves.
 */
export function linkFromCriteria(
  criteria: SavedSearchCriteriaJson | null,
): Record<string, string> {
  const link: Record<string, string> = {};
  if (criteria === null) return link;

  const putString = (urlKey: string, value: unknown) => {
    if (typeof value === "string" && value !== "") link[urlKey] = value;
  };
  const putNumber = (urlKey: string, value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      link[urlKey] = String(value);
    }
  };

  putString("q", criteria.query);
  putString("category", criteria.category);
  putNumber("minPrice", criteria.minPrice);
  putNumber("maxPrice", criteria.maxPrice);
  putString("locationId", criteria.locationId);
  putString("purpose", criteria.purpose);
  putString("propertyType", criteria.propertyType);
  putNumber("guests", criteria.guests);
  putNumber("minRooms", criteria.minRooms);
  putNumber("minBathrooms", criteria.minBathrooms);
  putNumber("minAreaM2", criteria.minAreaM2);
  putNumber("lat", criteria.latitude);
  putNumber("lng", criteria.longitude);
  putNumber("radiusKm", criteria.radiusKm);

  for (const [urlKey, instant] of [
    ["checkIn", criteria.checkIn],
    ["checkOut", criteria.checkOut],
  ] as const) {
    if (typeof instant !== "string" || instant === "") continue;
    if (INSTANT_RE.test(instant)) {
      link[urlKey] = instant.endsWith("T00:00:00Z") ? instant.slice(0, 10) : instant;
    }
    // A non-instant stored form (a foreign serialization) degrades to
    // the filter being absent from the link — never forwarded blindly.
  }
  return link;
}

/**
 * The chip's Arabic label — the criteria rendered as human parts. The
 * location shows as «موقع محدد» (the criteria carries the geo UUID;
 * the LINK restores the full filter, the label need not).
 */
export function savedSearchLabel(criteria: SavedSearchCriteriaJson | null): string {
  if (criteria === null) return "بحث بدون معايير";
  const parts: string[] = [];
  if (typeof criteria.query === "string" && criteria.query !== "") {
    parts.push(`«${criteria.query}»`);
  }
  if (typeof criteria.category === "string" && criteria.category !== "") {
    parts.push(criteria.category);
  }
  if (criteria.purpose === "RENT") parts.push("إيجار");
  if (criteria.purpose === "SALE") parts.push("بيع");
  if (typeof criteria.propertyType === "string" && criteria.propertyType !== "") {
    parts.push(criteria.propertyType);
  }
  if (typeof criteria.minPrice === "number" && Number.isFinite(criteria.minPrice)) {
    parts.push(`من ${criteria.minPrice}`);
  }
  if (typeof criteria.maxPrice === "number" && Number.isFinite(criteria.maxPrice)) {
    parts.push(`إلى ${criteria.maxPrice}`);
  }
  if (typeof criteria.guests === "number" && Number.isFinite(criteria.guests)) {
    parts.push(`${criteria.guests} ضيوف`);
  }
  if (typeof criteria.minRooms === "number" && Number.isFinite(criteria.minRooms)) {
    parts.push(`${criteria.minRooms}+ غرف`);
  }
  if (typeof criteria.minBathrooms === "number" && Number.isFinite(criteria.minBathrooms)) {
    parts.push(`${criteria.minBathrooms}+ حمامات`);
  }
  if (typeof criteria.minAreaM2 === "number" && Number.isFinite(criteria.minAreaM2)) {
    parts.push(`${criteria.minAreaM2}+ م²`);
  }
  if (typeof criteria.locationId === "string" && criteria.locationId !== "") {
    // null-safe by measurement: the list view re-serializes EVERY record
    // component (absent criteria arrive as JSON null, not omitted keys).
    parts.push("موقع محدد");
  }
  if (
    typeof criteria.radiusKm === "number" &&
    Number.isFinite(criteria.radiusKm) &&
    criteria.radiusKm > 0
  ) {
    parts.push(`قرب نقطة (${criteria.radiusKm} كم)`);
  }
  const windowPart =
    typeof criteria.checkIn === "string" && criteria.checkIn !== ""
      ? `إقامة ${criteria.checkIn.slice(0, 10)}${
          typeof criteria.checkOut === "string" && criteria.checkOut !== ""
            ? ` ← ${criteria.checkOut.slice(0, 10)}`
            : ""
        }`
      : "";
  if (windowPart !== "") parts.push(windowPart);
  if (parts.length === 0) return "كل الإعلانات";
  return parts.slice(0, 4).join(" · ") + (parts.length > 4 ? "…" : "");
}
