/**
 * The real-estate Redfin layer's display blocks + the mortgage calculator's
 * REAL math (the 2026-10-04 full-vision spec §5.4/§5.6 — E1/E2/E5 over the
 * served 60+ op core).
 *
 * SPLIT OF AUTHORITY (stated once, the honest split):
 * - The MORTGAGE MATH is pure real computation (E5: «أداة أمامية نقية») —
 *   the standard annuity formula, unit-tested here, no backend involved.
 * - The ESTIMATE and the NEIGHBORHOOD INSIGHTS are display data (E1/E2 —
 *   the backend aggregates don't exist yet): every block carries the
 *   «بيانات عرض» badge AND its computation date (the spec's own rule:
 *   «الأرقام تحمل تواريخ حسابها»), and the estimate is framed «تقدير»
 *   with the method note — never a stated price.
 * - The CONTEXT CARD's nearby-businesses block rides the REAL served
 *   radius search (GET /search?lat&lng&radiusKm — the W3 stars ride
 *   along in ListingSummary); the composition helper here just shapes
 *   what the page passes it.
 */

import { visionDisplayEnabled } from "@/lib/vision-institutions";

/* ── The estimate block (display, E2) ──────────────────────────────────── */

/** The property estimate's display shape (spec §5.4: model + confidence
 * interval + method note + computation date). */
export interface DisplayEstimate {
  /** The point estimate, whole riyals. */
  pointMajor: number;
  /** The confidence interval's low/high, whole riyals. */
  lowMajor: number;
  highMajor: number;
  /** The model's own inputs summary (the method note's honest content). */
  methodAr: string;
  /** ISO date of the estimate's computation (displayed, never hidden). */
  computedAt: string;
}

/** The estimate for the Qudsayya seed world (the seed's own listings — the
 * numbers derive from the seed's asking prices, stated as the method). */
export const DISPLAY_ESTIMATE_QUDSAYYA: DisplayEstimate = {
  pointMajor: 1_850_000,
  lowMajor: 1_620_000,
  highMajor: 2_080_000,
  methodAr:
    "تقدير نموذج أولي من صفقات مسجلة وخصائص العقار واتجاه الحي — يحسّن مع كل صفقة جديدة تسجّلها المنصة",
  computedAt: "2026-10-04",
};

/** The estimate block's framing rule (the spec's own words): the word
 * «تقدير» leads, never a bare number. */
export function estimateHeadline(e: DisplayEstimate): string {
  const digits = new Intl.NumberFormat("ar-u-nu-latn").format(e.pointMajor);
  return `تقدير القيمة: ${digits} ريال`;
}

/** The confidence interval line: «المدى المحتمل N – M ريال». */
export function estimateRangeLine(e: DisplayEstimate): string {
  const low = new Intl.NumberFormat("ar-u-nu-latn").format(e.lowMajor);
  const high = new Intl.NumberFormat("ar-u-nu-latn").format(e.highMajor);
  return `المدى المحتمل: ${low} – ${high} ريال`;
}

/* ── The neighborhood insights block (display, E1) ─────────────────────── */

/** One insight row: the aggregate's own number + its computation date. */
export interface DisplayInsight {
  id: string;
  labelAr: string;
  valueAr: string;
  computedAt: string;
}

/** The Qudsayya insights world (three hoods' honest aggregate display). */
export const DISPLAY_INSIGHTS_QUDSAYYA: readonly DisplayInsight[] = [
  {
    id: "demo-insight-band",
    labelAr: "نطاق أسعار الإقامة في الحي",
    valueAr: "٧٠ – ٤٥٠ ريالًا لليلة",
    computedAt: "2026-10-01",
  },
  {
    id: "demo-insight-dom",
    labelAr: "متوسط أيام بقاء الإعلان في السوق",
    valueAr: "٢١ يومًا",
    computedAt: "2026-10-01",
  },
  {
    id: "demo-insight-demand",
    labelAr: "نشاط الطلب على الإقامة",
    valueAr: "مرتفع — موسم الشتاء يقترب",
    computedAt: "2026-10-01",
  },
  {
    id: "demo-insight-sales",
    labelAr: "صفقات البيع المسجلة (الربع الحالي)",
    valueAr: "٣ صفقات — أحدثها بنتهاوس المزة",
    computedAt: "2026-10-01",
  },
];

/* ── The context card's display blocks (K-series pending) ──────────────── */

/** Nearby institutions (G-series pending): display rows with distance. */
export interface NearbyInstitution {
  id: string;
  nameAr: string;
  kindAr: string;
  /** Walking distance display (the spec's «نطاق المشي»). */
  walkMinutes: number;
}

/** The seed world's institutions near the Qudsayya listings. */
export const NEARBY_INSTITUTIONS_QUDSAYYA: readonly NearbyInstitution[] = [
  { id: "demo-nearby-school", nameAr: "مدرسة قدسيا الرسمية", kindAr: "مدرسة", walkMinutes: 6 },
  { id: "demo-nearby-mosque", nameAr: "مسجد قدسيا الكبير", kindAr: "مسجد", walkMinutes: 4 },
  { id: "demo-nearby-pharmacy", nameAr: "صيدلية الشفاء", kindAr: "معهد/خدمة صحية", walkMinutes: 3 },
];

/** The market-trend chip (the context card's honest trend line). */
export const MARKET_TREND_LINE_QUDSAYYA =
  "اتجاه الحي: طلب مستقر على الإقامة العائلية — أسعار الشتاء أعلى بنحو ١٢٪";

/** The context card's engagement gate (all display blocks together). */
export function propertyDisplayEnabled(): boolean {
  return visionDisplayEnabled();
}

/* ── The mortgage calculator (REAL pure math, E5) ──────────────────────── */

/** The monthly annuity payment — the standard amortization formula:
 *  M = P · r(1+r)^n / ((1+r)^n − 1), with r = annualRate/12 and n in
 *  months. Zero rate → the straight division (the formula's own limit). */
export function monthlyPayment(
  principalMajor: number,
  annualRatePercent: number,
  years: number,
): number {
  const n = Math.round(years * 12);
  if (n <= 0) return principalMajor;
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return principalMajor / n;
  const growth = Math.pow(1 + r, n);
  return (principalMajor * r * growth) / (growth - 1);
}

/** The total repaid over the loan's life. */
export function totalRepaid(
  principalMajor: number,
  annualRatePercent: number,
  years: number,
): number {
  return monthlyPayment(principalMajor, annualRatePercent, years) * Math.round(years * 12);
}

/** The whole-cost line: «الإجمالي المسدد N ريال — منها M فائدة». */
export function mortgageTotalLine(
  principalMajor: number,
  annualRatePercent: number,
  years: number,
): string {
  const total = totalRepaid(principalMajor, annualRatePercent, years);
  const interest = Math.max(0, total - principalMajor);
  const digits = new Intl.NumberFormat("ar-u-nu-latn", { maximumFractionDigits: 0 }).format(Math.round(total));
  const interestDigits = new Intl.NumberFormat("ar-u-nu-latn", { maximumFractionDigits: 0 }).format(Math.round(interest));
  return `الإجمالي المسدد: ${digits} ريال — منها ${interestDigits} ريال فائدة`;
}

/** The calculator's own bounds (mirrored into the form's HTML validation
 * — the house rule: HTML bounds mirror the tool's own limits). */
export const MORTGAGE_BOUNDS = {
  principalMin: 50_000,
  principalMax: 10_000_000,
  rateMin: 0,
  rateMax: 25,
  yearsMin: 1,
  yearsMax: 30,
  defaultPrincipal: 1_500_000,
  defaultRate: 4.5,
  defaultYears: 20,
} as const;
