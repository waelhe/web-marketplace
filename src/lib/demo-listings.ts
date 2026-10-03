/**
 * The display-data (بيانات عرض) layer — the owner's seed-content decision
 * (2026-09-29: «في حال عدم وجود محتوى حقيقي ازرع بيانات عرض»).
 *
 * WHAT THIS IS: a clearly-labeled demo showcase that keeps the storefront
 * alive while the marketplace has no real content. WHAT THIS IS NOT: fake
 * backend data. The rules, stated once and enforced everywhere:
 *
 * 1. DEMO RIDES THE SUCCESS PATH ONLY — the demo showcase appears when the
 *    backend's own browse read answered 200. A backend outage (status 0) or
 *    an error keeps the honest failure states; display data must never
 *    mask an outage.
 * 2. THE UNFILTERED STOREFRONT ONLY — the showcase lives on the bare
 *    browse surfaces (homepage strips + /listings without criteria). Any
 *    filter, sort, or search stays 100% real data: the search/filter
 *    contract is the user's trust, and an honest zero there is a real
 *    answer, not a gap to decorate.
 * 3. SELF-RETIRING — engaged only BELOW the storefront floor (fewer than
 *    DEMO_STOREFRONT_FLOOR real ACTIVE listings). The moment real content
 *    reaches the floor, every demo surface disappears on its own; no code
 *    change, no deploy, no flag flip.
 * 4. CLEARLY LABELED, NEVER CLICKABLE — every demo card carries the
 *    «بيانات عرض» badge and NO detail link: the demo ids are not backend
 *    UUIDs, the public detail read would 404, and faking a detail page
 *    (or its schema.org JSON-LD) would poison the SEO surface the S5
 *    layer just built. Demo cards are display cards, period.
 * 5. ONE ENV OFF-SWITCH — `DEMO_LISTINGS=0|false` kills the whole layer
 *    permanently. Unset (or any other value) keeps it ON: the owner's
 *    directive IS the default decision, and production (Railway env we
 *    cannot touch today — token lost, known) therefore ships WITH the
 *    showcase without needing a console change.
 *
 * The dataset's category codes stay inside the live registry's vocabulary
 * (charter J2/S2: no invented vocabulary — measured 2026-09-29: V70 seeds
 * exactly one category, stay/Stay/إقامة), and its ids carry the `demo-`
 * prefix so they can never parse as backend UUIDs (isUuid-guarded
 * surfaces stay safe).
 */

import type { ListingCategory, ListingSummary } from "@/lib/api/types";

/** The storefront floor — fewer real ACTIVE listings than this and there
 * is no real storefront to browse (a product decision, stated plainly:
 * one or two rows — today's production carries a single e2e verification
 * artifact — are not a marketplace). At >= FLOOR the demo retires itself. */
export const DEMO_STOREFRONT_FLOOR = 4;

/** `DEMO_LISTINGS=0|false` disables the layer; anything else (including
 * unset) keeps it on — the owner's seed-content directive is the default. */
export function demoListingsEnabled(): boolean {
  const raw = process.env.DEMO_LISTINGS?.trim().toLowerCase();
  return raw !== "0" && raw !== "false";
}

/** The engagement rule (rules 1+3): the backend answered 200 AND the real
 * total is below the floor AND the env off-switch is not set. */
export function isDemoStorefront(realTotal: number): boolean {
  return demoListingsEnabled() && realTotal < DEMO_STOREFRONT_FLOOR;
}

/** The display dataset — 8 stay-category listings, Arabic, SAR. Ids are
 * `demo-` prefixed (never UUIDs); providerNames are display names of
 * demo providers, never a real account's. */
export const DEMO_LISTINGS: readonly ListingSummary[] = [
  {
    id: "demo-chalet-north-creek",
    title: "شاليه بإطلالة على الخور الشمالي — إقامة عائلية",
    category: "stay",
    price: 850,
    currency: "SAR",
    providerName: "استراحات الواجهة",
    providerRating: null,
    providerReviewCount: 0,
  },
  {
    id: "demo-apartment-qudsia",
    title: "شقة مفروشة حديثة في قدسيا — غرفتان وصالة",
    category: "stay",
    price: 2400,
    currency: "SAR",
    providerName: "بيوت المدينة",
    providerRating: null,
    providerReviewCount: 0,
  },
  {
    id: "demo-villa-palm-garden",
    title: "فيلا حديقة النخيل — مسبح خاص ومساحة للعائلة",
    category: "stay",
    price: 5200,
    currency: "SAR",
    providerName: "دار الضيافة",
    providerRating: null,
    providerReviewCount: 0,
  },
  {
    id: "demo-loft-old-town",
    title: "لوفت بعلّية في البلدة القديمة — مدخل مستقل",
    category: "stay",
    price: 1100,
    currency: "SAR",
    providerName: "أركان الحي",
    providerRating: null,
    providerReviewCount: 0,
  },
  {
    id: "demo-studio-ribbon-front",
    title: "استوديو واجهة الكورنيش — مناسب للإقامة القصيرة",
    category: "stay",
    price: 460,
    currency: "SAR",
    providerName: "إقامة الركن",
    providerRating: null,
    providerReviewCount: 0,
  },
  {
    id: "demo-resthouse-orchard",
    title: "استراحة البستان — قاعة مناسبات ومسبح خارجي",
    category: "stay",
    price: 3300,
    currency: "SAR",
    providerName: "استراحات الواجهة",
    providerRating: null,
    providerReviewCount: 0,
  },
  {
    id: "demo-apartment-medina-view",
    title: "شقة بإطلالة على الوادي — تشطيب جديد كامل",
    category: "stay",
    price: 1750,
    currency: "SAR",
    providerName: "بيوت المدينة",
    providerRating: null,
    providerReviewCount: 0,
  },
  {
    id: "demo-guesthouse-lavender",
    title: "بيت ضيافة الخزامى — هدوء وأفق مفتوح",
    category: "stay",
    price: 980,
    currency: "SAR",
    providerName: "دار الضيافة",
    providerRating: null,
    providerReviewCount: 0,
  },
];

/** The category label a demo card shows: the live registry's own naming
 * chain (nameAr → nameEn → code — the S2 resolution order, never
 * invention) when the registry read succeeded, else the raw code — the
 * degraded honesty every picker already practices. */
export function demoCategoryLabel(
  categories: readonly ListingCategory[] | null,
  code: string,
): string {
  const hit = categories?.find((c) => c.code === code);
  if (!hit) return code;
  return hit.nameAr ?? hit.nameEn ?? hit.code;
}
