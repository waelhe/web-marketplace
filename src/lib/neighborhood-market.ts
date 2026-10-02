/**
 * The market board's DISPLAY layer (L50 — gap #5 served): the served
 * contract's rendering helpers — the price label with the design's own
 * Arabic money grammar, the relative time with the design's own Arabic
 * grammar, and the category's own icon. Formatting happens in RSC only
 * (the src/lib/format.ts discipline): results ride the serialized
 * payload, so there is no client re-format and no hydration drift.
 *
 * Every rule here is MEASURED from the design's own display dataset
 * (src/lib/neighborhood-design.ts DEMO_MARKET_ITEMS — its labels are
 * the grammar's ground truth): «350 ريالاً»، «مجاني — إهداء»، «منذ
 * ساعتين»، «منذ 4 ساعات»، «منذ 11 ساعة»، «منذ يوم»، «منذ يومين».
 */

import {
  MARKET_CATEGORY_LABELS,
  type MarketCategory,
} from "@/lib/api/community-contract";

/* ── The price label ──────────────────────────────────────────────────────── */

/**
 * The riyal unit's Arabic grammar (the design's own usage, measured):
 * 1 → ريال، 2 → ريالان، 3–10 → ريالات، 11–99 → ريالاً، exact
 * hundreds/thousands → ريال. Compound numbers follow their own tail
 * (120/150/350/480/260 all carry ريالاً — the tens component
 * governs), which is exactly the classical rule.
 */
function riyalUnit(major: number): string {
  if (major === 1) return "ريال";
  if (major === 2) return "ريالان";
  const tail = major % 100;
  if (tail >= 3 && tail <= 10) return "ريالات";
  if (tail >= 11) return "ريالاً";
  return "ريال";
}

/** Whole-riyal prices only (the design's own display vocabulary). */
function formatMajor(cents: number): number {
  return cents / 100;
}

/**
 * The price label — the design's own two shapes: a gift renders the
 * green band's own words («مجاني — إهداء»), a priced possession
 * renders «N ريالاً» with the grammar above. Non-SAR currencies (a
 * future contract) fall to the house Intl currency formatter — never
 * an invented label.
 */
export function formatMarketPrice(
  priceCents: number | null,
  priceCurrency: string | null,
): string {
  if (priceCents === null || priceCurrency === null) {
    return "مجاني — إهداء";
  }
  if (priceCurrency !== "SAR") {
    return new Intl.NumberFormat("ar", {
      style: "currency",
      currency: priceCurrency,
      maximumFractionDigits: 2,
    }).format(formatMajor(priceCents));
  }
  const major = formatMajor(priceCents);
  return `${new Intl.NumberFormat("ar").format(major)} ${riyalUnit(major)}`;
}

/** The card's free-band fact — the ONE pricing rule's own render. */
export function isFreeGift(priceCents: number | null): boolean {
  return priceCents === null;
}

/* ── The relative time ────────────────────────────────────────────────────── */

/** The digits in the design's own rendering (western, measured). */
const count = (n: number) => new Intl.NumberFormat("ar").format(n);

/**
 * The relative time label with the design's own Arabic grammar
 * (measured): منذ دقيقة/دقيقتين/N دقائق/N دقيقة، منذ ساعة/ساعتين/
 * N ساعات/N ساعة، منذ يوم/يومين/N أيام/N يومًا، منذ شهر/شهرين/
 * N أشهر/N شهرًا — the dual, the 3–10 plural and the 11+ singular
 * accusative each in their place.
 */
export function formatMarketWhen(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor((now.getTime() - then) / 60_000));
  if (minutes < 1) return "الآن";
  if (minutes === 1) return "منذ دقيقة";
  if (minutes === 2) return "منذ دقيقتين";
  if (minutes <= 10) return `منذ ${count(minutes)} دقائق`;
  if (minutes < 60) return `منذ ${count(minutes)} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "منذ ساعة";
  if (hours === 2) return "منذ ساعتين";
  if (hours <= 10) return `منذ ${count(hours)} ساعات`;
  if (hours < 24) return `منذ ${count(hours)} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "منذ يوم";
  if (days === 2) return "منذ يومين";
  if (days <= 10) return `منذ ${count(days)} أيام`;
  if (days < 30) return `منذ ${count(days)} يومًا`;
  const months = Math.floor(days / 30);
  if (months === 1) return "منذ شهر";
  if (months === 2) return "منذ شهرين";
  if (months <= 10) return `منذ ${count(months)} أشهر`;
  return `منذ ${count(months)} شهرًا`;
}

/* ── The card's category icon ─────────────────────────────────────────────── */

/**
 * The thumb's Material Symbols icon, derived from the category (the
 * design's display dataset carried per-item icons; the served
 * contract carries no icon field — the category's own icon is the
 * honest derivation, one mapping, zero invented fields).
 */
export function marketCategoryIcon(category: MarketCategory): string {
  switch (category) {
    case "FREE": return "redeem";
    case "FURNITURE": return "chair";
    case "ELECTRONICS": return "devices";
    case "TOOLS": return "carpenter";
    default: return "sell";
  }
}

/** The seller badge's own words — earned, never claimed. */
export function sellerBadgeLabel(sellerVerified: boolean): string {
  return sellerVerified ? "جار موثق" : "جار";
}

/** The category chip's own label (the contract's own vocabulary). */
export function marketCategoryLabel(category: MarketCategory): string {
  return MARKET_CATEGORY_LABELS[category];
}
