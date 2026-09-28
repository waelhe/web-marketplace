/**
 * Catalog public-surface contract types — measured against the live
 * backend (app-java-v3 @ c94866c, Railway production, 2026-09-22):
 *
 * - `GET /api/v1/listings?page&size` → `PagedResponse<ListingSummary>`
 *   (measured: `{"content":[{"id","title","category","price","currency",
 *   "providerName"}],"pageNumber",…,"last"}`)
 * - `GET /api/v1/listings/{id}` → `ListingDetail` (the backend's
 *   `ListingResponse` record: core fields + the L31 `property` embed +
 *   the L39 `jsonLd` schema.org block, both null when absent — measured
 *   live; INACTIVE/ARCHIVED ids answer 404 problem+json).
 *
 * Sources: marketplace-shared `ListingSummary`/`PagedResponse`,
 * marketplace-catalog `ListingResponse`/`RealEstateListingJsonLd`,
 * shared-api `PropertyDetailsPort.PropertyView` — plus the live JSON on
 * the wire. Optional fields mirror the backend's nullability, NOT
 * invention: `price` is MAJOR units (`BigDecimal.valueOf(cents, 2)` —
 * ListingMapper), `currency` is ISO 4217.
 *
 * Deliberately loose where the backend is loose: `category` on the
 * summary/detail reads is the STORED string, displayed as-is, never
 * remapped (pre-registry rows can carry legacy values). The WRITE side
 * is registry-governed since V70 (2026-09-29, app-java-v3 @ ccf599a):
 * CatalogService.requireKnownCategory rejects unknown codes with 400,
 * and the vocabulary itself is readable — see `ListingCategory` below
 * (the S2 live pickers' source; charter J2).
 */

/** The backend's generic page envelope (shared-api PagedResponse). */
export interface PagedResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/** One row of the public browse surface (shared-api ListingSummary). */
export interface ListingSummary {
  id: string;
  title: string;
  /** The STORED category string — a registry code since V70, a legacy value before it; displayed as-is. */
  category: string;
  /** Major units (e.g. 1000.0 = 1000.00 SAR) — backend converts from cents. */
  price: number;
  /** ISO 4217 code, e.g. "SAR". */
  currency: string;
  providerName: string;
}

/**
 * One row of the category registry read (V70, marketplace-catalog
 * `CatalogService.CategoryView`): `GET /api/v1/listings/categories` →
 * `[{"code","nameEn","nameAr"}]` (measured live 2026-09-29, staging +
 * production byte-identical: one seeded category stay/Stay/إقامة; the
 * read comes ordered by the registry's display `position`). `code` is
 * the stable API-facing key — the value writes carry and searches match
 * (measured: searching by the Arabic NAME answers a 200 empty envelope;
 * the code is the only valid wire value). The display names mirror the
 * schema's NULLABLE columns, not invention.
 */
export interface ListingCategory {
  code: string;
  nameEn: string | null;
  nameAr: string | null;
}

/** PropertyPurpose enum (shared-api) — the only two measured values. */
export type PropertyPurpose = "RENT" | "SALE";

/** PropertyType enum (shared-api PropertyDetailsPort). */
export type PropertyType =
  | "APARTMENT"
  | "VILLA"
  | "LAND"
  | "SHOP"
  | "OFFICE"
  | "GARAGE";

/**
 * The L31 real-estate details block (PropertyDetailsPort.PropertyView),
 * embedded on the detail read and on provider pages — null on every
 * listing without real-estate details. Nullability mirrors the port's
 * documented contract ("null = undeclared").
 */
export interface PropertyBlock {
  listingId: string;
  purpose: PropertyPurpose;
  propertyType: PropertyType;
  areaM2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  floorNumber: number | null;
  totalFloors: number | null;
  buildingYear: number | null;
  furnished: boolean | null;
  amenities: string[] | null;
  /** ISO date (LocalDate) — null = available now (port contract). */
  availableFrom: string | null;
  /** The geo hierarchy node id (L30) — display location, not radius search. */
  locationId: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** The Offer inside the backend-composed JSON-LD block (NON_NULL). */
export interface JsonLdOffer {
  "@type": "Offer";
  price: number;
  priceCurrency: string;
  /** GoodRelations URI the backend maps RENT/SALE onto. */
  businessFunction: string;
}

/** The PostalAddress inside the backend-composed JSON-LD block. */
export interface JsonLdPostalAddress {
  "@type": "PostalAddress";
  addressCountry?: string;
  addressRegion?: string;
  addressLocality?: string;
}

/**
 * The L39 schema.org RealEstateListing block the backend composes on the
 * public detail read — embedded VERBATIM by the page (the backend's
 * measured facts, never recomposed by the frontend). Exists only for
 * listings with a property block; `url` only when the backend's public
 * site origin is bound. Absent optional fields are omitted (NON_NULL),
 * which these optional members model.
 */
export interface RealEstateListingJsonLd {
  "@context": "https://schema.org";
  "@type": "RealEstateListing";
  name: string;
  description?: string;
  url?: string;
  dateModified?: string;
  offers?: JsonLdOffer;
  address?: JsonLdPostalAddress;
}

/** The public listing detail (marketplace-catalog ListingResponse). */
export interface ListingDetail {
  id: string;
  title: string;
  description: string | null;
  category: string;
  /** Major units — see ListingSummary.price. */
  price: number;
  currency: string;
  maxGuests: number | null;
  createdAt: string;
  updatedAt: string;
  property: PropertyBlock | null;
  expiresAt: string | null;
  pausedReason: string | null;
  jsonLd: RealEstateListingJsonLd | null;
}
