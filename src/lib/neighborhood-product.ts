/**
 * The NEIGHBORHOOD PRODUCT layer — the first embodiment of the
 * methodology reversal (owner directive 2026-09-29: «هندسة منتج أولًا —
 * الفرونت اند هو القائد، والباك اند سيخدم ما نبنيه» / "product-first
 * engineering — the frontend leads, and the backend will serve what it
 * builds").
 *
 * WHAT THIS IS: the product-defined contracts for the integrated
 * community+business experience (the Nextdoor + Business platform the
 * owner chartered) — the data shapes the PRODUCT needs, authored here
 * first. Where the backend already serves a need, the page rides the
 * real measured channel (the feed, the membership, the location-scoped
 * listings read). Where it does not yet, this layer serves a
 * clearly-labeled display dataset in the exact shape the product
 * defined — the contract the backend will implement to later, at which
 * point the demo layer retires and the real read takes its seat with
 * ZERO product-surface changes.
 *
 * THE DISCIPLINE (inherited from demo-listings.ts — the owner's
 * seed-content decision 2026-09-29, «ازرع بيانات عرض»):
 * 1. Display data rides the SUCCESS path only and never masks an
 *    outage of any real read on the same surface.
 * 2. Every display row carries the «بيانات عرض» badge.
 * 3. Display ids carry the `demo-` prefix — they can never parse as
 *    backend UUIDs (isUuid-guarded surfaces stay safe).
 * 4. Display rows are NEVER links: the public provider-page read would
 *    404 for a demo id, and faking a page would poison trust. Display
 *    cards, period.
 * 5. ONE env off-switch per layer (`DEMO_NEIGHBORHOOD=0|false`) —
 *    unset keeps it on (the owner's seed directive is the default).
 *
 * The REAL neighborhood-scoped listings strip is NOT here — it rides
 * the live public search read with a locationId criterion (measured
 * live 2026-09-29 on staging: `GET /api/v1/search?locationId=…` answers
 * the standard PagedResponse envelope with real location-mapped rows).
 */

/**
 * The neighborhood pulse contract — the product's "place" identity:
 * how alive is this neighborhood? ONE read the product defines; the
 * backend serves it later (the natural seam: a per-location aggregate
 * over neighborhood_memberships + posts + provider inventory).
 */
export interface NeighborhoodPulse {
  /** Active memberships in the location (the L41 rows). */
  members: number;
  /** VISIBLE posts in the trailing 7 days (the L42 rows). */
  postsThisWeek: number;
  /** Providers with ACTIVE inventory scoped to the location. */
  localBusinesses: number;
}

/**
 * The neighborhood business contract — the Nextdoor-Business rail: the
 * businesses that serve this neighborhood, with the trust signals the
 * reputation journey (J6) already defines for providers: the aggregate
 * rating, the review count, the verified badge (the same vocabulary as
 * the public provider page — never a new invention).
 */
export interface NeighborhoodBusiness {
  /** `demo-` prefixed in the display dataset — never a UUID. */
  id: string;
  /** The business's display name (provider_profiles.agencyName's shape). */
  name: string;
  /** The trade label — display vocabulary, Arabic. */
  trade: string;
  /** One-line offer summary — display copy. */
  tagline: string;
  /** Aggregate rating 1–5 (null = no reviews yet — the honest J6 state). */
  rating: number | null;
  /** Review count (0 = unrated). */
  reviews: number;
  /** The provider trust badge (the measured VERIFIED vocabulary). */
  verified: boolean;
  /** ACTIVE listings in the location (the L36 inventory's count shape). */
  offerings: number;
}

/** `DEMO_NEIGHBORHOOD=0|false` disables the display layers; anything
 * else (including unset) keeps them on — the owner's seed-content
 * directive is the default, the same rule as DEMO_LISTINGS. */
export function neighborhoodDemoEnabled(): boolean {
  const raw = process.env.DEMO_NEIGHBORHOOD?.trim().toLowerCase();
  return raw !== "0" && raw !== "false";
}

/**
 * The pulse display dataset — the neighborhood feels alive (a product
 * requirement: the first visit must show a PLACE, not an empty shell).
 * Numbers only; the label rides the band, one disclosure for the whole
 * strip.
 */
export const DEMO_PULSE: readonly NeighborhoodPulse[] = [
  { members: 128, postsThisWeek: 34, localBusinesses: 12 },
];

/**
 * The business-rail display dataset — 6 Arabic businesses spanning the
 * trades a real neighborhood actually has, each carrying the trust
 * vocabulary the product defined above (rating/verified/offerings).
 * No links, «بيانات عرض» on the section, ids `demo-` prefixed.
 */
export const DEMO_BUSINESSES: readonly NeighborhoodBusiness[] = [
  {
    id: "demo-biz-dar-elthafera",
    name: "دار الضيافة",
    trade: "إقامة وشاليهات",
    tagline: "شاليهات عائلية بإطلالة الخور — حجز مباشر عبر المنصة",
    rating: 4.8,
    reviews: 26,
    verified: true,
    offerings: 3,
  },
  {
    id: "demo-biz-arkan-clean",
    name: "أركان النظافة",
    trade: "خدمات منزلية",
    tagline: "تنظيف عميق ومواعيد أسبوعية ثابتة للجيران",
    rating: 4.6,
    reviews: 41,
    verified: true,
    offerings: 2,
  },
  {
    id: "demo-biz-bait-tashhir",
    name: "بيت التشطيب",
    trade: "صيانة وتشطيب",
    tagline: "صبغ، دهانات، وإصلاحات سريعة بضمان الزيارة",
    rating: 4.4,
    reviews: 17,
    verified: false,
    offerings: 1,
  },
  {
    id: "demo-biz-mathaf-nakheel",
    name: "مطمور النخيل",
    trade: "تموين وأغذية",
    tagline: "سلال أسبوعية من المزارع القريبة — تسليم باب الحي",
    rating: null,
    reviews: 0,
    verified: false,
    offerings: 1,
  },
  {
    id: "demo-biz-saydaliat-alhay",
    name: "صيدلية الحي",
    trade: "صحة ورفاه",
    tagline: "استشارة دوائية مجانية لأعضاء الحارة وتوصيل مسائي",
    rating: 4.9,
    reviews: 58,
    verified: true,
    offerings: 0,
  },
  {
    id: "demo-biz-maktab-safar",
    name: "مكتب السفر",
    trade: "خدمات سفر",
    tagline: "تأشيرات وحجوزات طيران — خصم جيران ٥٪",
    rating: 4.2,
    reviews: 9,
    verified: false,
    offerings: 0,
  },
];

/** The rail's display size (the horizontal scroll keeps the rail one
 * visual row on every viewport — the product's own layout decision). */
export const BUSINESS_RAIL_SIZE = 6;

/** Format an aggregate rating for display: one decimal, Arabic
 * numerals (the same Intl discipline as the feed's counts). Null
 * stays null — an unrated business renders its honest «جديد» state. */
export function formatRating(rating: number | null): string | null {
  if (rating === null) return null;
  return new Intl.NumberFormat("ar", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
}
