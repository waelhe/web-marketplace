/**
 * Provider-surface contract types and vocabulary — roadmap stage 3
 * (the provider path, Nextdoor Business): L36 profile onboarding, the
 * listing lifecycle (create/update/activate/pause/renew/archive), the L38
 * completeness score, the L31 property block and the L25/L40 analytics.
 *
 * Pure types and constants only — client-safe (no next/headers): the
 * authenticated data CHANNEL lives in provider.ts, the public listings
 * channel in public.ts (same split as community-contract.ts vs
 * community.ts, after the measured build error of stage 2: client forms
 * must not pull server-only modules transitively).
 *
 * Every shape here is measured from the backend source and the live
 * production API (app-java-v3 @ c94866c, 2026-09-22):
 * - ProviderController/ProviderResponse (L36 persona fields),
 *   ProviderStatus state machine (PENDING → VERIFIED/SUSPENDED).
 * - CatalogController (create/update/activate/renew/pause/archive +
 *   completeness) and ListingResponse — NOTE the response carries NO
 *   status field: expiresAt/pausedReason are the measurable signals.
 * - ListingCompletenessResponse (the four equal quarters).
 * - PropertyDetailsRequest/PropertyView (the L31 field set).
 * - ProviderStatsResponse (L25) and ProviderListingViewsResponse (L40).
 * - Anonymous live probes: every provider-scoped surface answers 401
 *   AUTHN-001 (the auth gate); the property GET answers 404 NF-001 for a
 *   listing without a block.
 */

/** ProviderStatus enum (marketplace-provider) — the measured three states. */
export type ProviderStatus = "PENDING" | "VERIFIED" | "SUSPENDED";

/**
 * The L36 actor classification (ProviderActorType) — display-only
 * taxonomy: INDIVIDUAL / INDEPENDENT_BROKER / AGENCY. An omitted actor
 * type on creation is the INDIVIDUAL default (the entity's own gate).
 */
export type ProviderActorType = "INDIVIDUAL" | "INDEPENDENT_BROKER" | "AGENCY";

export const PROVIDER_ACTOR_TYPES: ProviderActorType[] = [
  "INDIVIDUAL",
  "INDEPENDENT_BROKER",
  "AGENCY",
];

export const ACTOR_TYPE_LABELS: Record<ProviderActorType, string> = {
  INDIVIDUAL: "فرد",
  INDEPENDENT_BROKER: "وسيط مستقل",
  AGENCY: "مكتب عقاري",
};

export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, string> = {
  PENDING: "بانتظار توثيق الإدارة",
  VERIFIED: "موثّق",
  SUSPENDED: "موقوف",
};

/** The backend's own field bounds (ProviderRequest Bean Validation). */
export const PROVIDER_NAME_MAX = 200;
export const PROVIDER_BIO_MAX = 1000;
export const PROVIDER_AGENCY_MAX = 200;
export const PROVIDER_LICENSE_MAX = 100;

/** ProviderResponse (marketplace-provider) — the L36 profile record. */
export interface ProviderProfileView {
  id: string;
  displayName: string;
  bio: string | null;
  status: ProviderStatus;
  actorType: ProviderActorType;
  agencyName: string | null;
  licenseNumber: string | null;
  ratingAverage: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The L38 completeness score (ListingCompletenessResponse) — a pure
 * recomputed-on-read function: four equal quarters (core fields, at least
 * one UPLOADED photo, the L31 property block, the L30 administrative
 * location). The flags tell the provider exactly which quarter is
 * missing.
 */
export interface ListingCompletenessView {
  percent: number;
  coreFieldsPresent: boolean;
  photosPresent: boolean;
  propertyDetailsPresent: boolean;
  locationPresent: boolean;
}

/**
 * One row of the L40 view analytics (ListingViewStats): the listing's
 * current title (display recognition) + the deduplicated view total over
 * the window.
 */
export interface ListingViewStatsView {
  listingId: string;
  title: string;
  views: number;
}

/** ProviderListingViewsResponse (L40) — the window rides with the numbers. */
export interface ProviderListingViewsView {
  days: number;
  sinceInclusive: string;
  listings: ListingViewStatsView[];
}

/** The L40 window whitelist (ListingViewsWindow.ofDays) — 30 by default. */
export const VIEWS_WINDOW_DAYS = [7, 30, 90] as const;
export type ViewsWindowDays = (typeof VIEWS_WINDOW_DAYS)[number];

/** ProviderStatsResponse (L25) — occupancy, net revenue, completed bookings. */
export interface ProviderStatsView {
  from: string;
  to: string;
  occupancyRate: number;
  netRevenueCents: number;
  completedBookings: number;
}

/**
 * Listing mutation input — the measured CreateListingRequest /
 * UpdateListingRequest shape. priceCents is MINOR units (halalas for
 * SAR); currency is optional (blank = keep stored on update, SAR default
 * on create); maxGuests optional (omitted = keep stored on update).
 */
export interface ListingMutateInput {
  title: string;
  description: string | null;
  category: string;
  priceCents: number;
  currency: string | null;
  maxGuests: number | null;
}

/** The backend's own authored bounds (CatalogController Bean Validation). */
export const LISTING_TITLE_MAX = 200;
export const LISTING_CATEGORY_MAX = 100;
/** The ISO 4217 alphabetic code length (IsoCurrencyCode). */
export const CURRENCY_CODE_LENGTH = 3;

/**
 * The L31 property upsert input (PropertyDetailsRequest) — a FULL
 * upsert: omitted optional fields mean "undeclared", not "keep"; the
 * block is replaced atomically on every accepted call. purpose and
 * propertyType are required; the bounds mirror the request's Bean
 * Validation + the V48 CHECKs.
 */
export interface PropertyUpsertInput {
  purpose: "RENT" | "SALE";
  propertyType:
    | "APARTMENT"
    | "VILLA"
    | "LAND"
    | "SHOP"
    | "OFFICE"
    | "GARAGE";
  areaM2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  floorNumber: number | null;
  totalFloors: number | null;
  buildingYear: number | null;
  furnished: boolean | null;
  amenities: string[];
  availableFrom: string | null;
  locationId: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const PROPERTY_PURPOSES = ["RENT", "SALE"] as const;
export const PROPERTY_TYPES = [
  "APARTMENT",
  "VILLA",
  "LAND",
  "SHOP",
  "OFFICE",
  "GARAGE",
] as const;

export const PROPERTY_PURPOSE_LABELS: Record<
  (typeof PROPERTY_PURPOSES)[number],
  string
> = {
  RENT: "للإيجار",
  SALE: "للبيع",
};

export const PROPERTY_TYPE_LABELS: Record<
  (typeof PROPERTY_TYPES)[number],
  string
> = {
  APARTMENT: "شقة",
  VILLA: "فيلا",
  LAND: "أرض",
  SHOP: "محل تجاري",
  OFFICE: "مكتب",
  GARAGE: "كراج",
};

/** The backend's own property bounds (PropertyDetailsRequest). */
export const PROPERTY_AMENITY_MAX_COUNT = 20;
export const PROPERTY_AMENITY_MAX_LENGTH = 40;
export const BUILDING_YEAR_MIN = 1800;
export const BUILDING_YEAR_MAX = 2100;

/**
 * The activation vocabulary (L33): the publication window resolves from
 * the optional explicit date or the configured expiry policy (90 days
 * measured on production — MARKETPLACE_CATALOG_EXPIRY_DAYS default);
 * an explicit date must be strictly in the future. The expiry policy's
 * documented words: "no silently-immortal listing".
 */
export const DEFAULT_EXPIRY_DAYS = 90;

/**
 * Media vocabulary (L28/L34 fourth completeness quarter — measured from
 * MediaProperties/MediaService and the live OpenAPI 2026-09-22): the
 * server-side allowlist anything else is rejected against BEFORE any URL
 * is signed, and the declared size cap. The cap's *authoritative* value
 * is the backend's MEDIA_MAX_UPLOAD_BYTES (default 10485760 measured in
 * application.yml) — these constants mirror it for client-side pre-checks
 * and server-side early rejects; the backend remains the enforcement.
 */
export const MEDIA_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export type MediaContentType = (typeof MEDIA_ALLOWED_CONTENT_TYPES)[number];

/** application.yml: max-upload-bytes: ${MEDIA_MAX_UPLOAD_BYTES:10485760} */
export const MEDIA_MAX_UPLOAD_BYTES_DEFAULT = 10485760;

/** The presigned-upload declaration response (MediaService.MediaUploadView). */
export interface MediaUploadView {
  mediaId: string;
  objectKey: string;
  uploadUrl: string;
  /** Presign TTL as an ISO-8601 duration string (e.g. "PT15M"). */
  urlLifetime: string;
}

/** One media asset as the listing's media surface returns it (display order). */
export interface MediaAssetView {
  id: string;
  listingId: string;
  contentType: string;
  sizeBytes: number;
  status: string;
  /** 1-based display order within the listing. */
  position: number;
  /** Presigned GET URL of the original object. */
  downloadUrl: string;
  /** Presigned GET URL of the thumbnail — null until processing completes. */
  thumbUrl: string | null;
  createdAt: string;
}
