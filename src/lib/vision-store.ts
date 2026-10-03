/**
 * The commerce marketplace's DISPLAY layer + the cart's own cookie-backed
 * contract (the 2026-10-04 full-vision spec §5.2 — the Amazon column).
 *
 * SPLIT OF AUTHORITY (the honest split, stated once):
 * - The PRODUCT WORLD is display data: the backend does not yet serve
 *   Product/Order entities (backend follow-plan waves M1–M6). Every
 *   product row carries the «بيانات عرض» badge and a `demo-` id; the
 *   store surfaces render it and the real contract will replace the
 *   dataset in place (the standing in-place substitution discipline —
 *   zero surface changes when the L-wave lands).
 * - The CART is REAL frontend state on the framework's own official
 *   persistence: Next.js `cookies()` written only inside Server Actions
 *   and Route Handlers (the official cookie contract — the same
 *   constraint the S2 web-session wave is scoped against). No client
 *   state, no localStorage: the cart survives sessions the honest way.
 *
 * The display discipline (inherited verbatim from demo-listings.ts):
 * success-path only · the badge on every section · `demo-` ids · ONE
 * env off-switch (`DEMO_VISION` — shared with the vision layer).
 */

import { cookies } from "next/headers";
import { visionDisplayEnabled } from "@/lib/vision-institutions";

/* ── The product world (display) ───────────────────────────────────────── */

/** The store's own category vocabulary — an OWNER gate (spec §9.1, the
 * charter register): this display set follows the seed's own world and
 * self-retires when the owner's dictionary lands with M1. */
export interface StoreCategory {
  code: string;
  labelAr: string;
  /** The category plate's own symbol (Material Symbols name). */
  symbol: string;
}

export const STORE_CATEGORIES: readonly StoreCategory[] = [
  { code: "home", labelAr: "المنزل والمطبخ", symbol: "kitchen" },
  { code: "electronics", labelAr: "إلكترونيات", symbol: "devices" },
  { code: "phones", labelAr: "الجوال وملحقاته", symbol: "smartphone" },
  { code: "fashion", labelAr: "الأزياء", symbol: "apparel" },
  { code: "kids", labelAr: "عالم الطفل", symbol: "child_care" },
  { code: "sports", labelAr: "الرياضة والهوايات", symbol: "sports_basketball" },
  { code: "beauty", labelAr: "الجمال والعناية", symbol: "spa" },
  { code: "grocery", labelAr: "المواد الغذائية", symbol: "grocery" },
];

/** A display product row. Prices in CENTS (the backend's own money
 * discipline — whole-riyal inputs convert losslessly at the boundary). */
export interface StoreProduct {
  /** `demo-` prefixed — never a UUID. */
  id: string;
  titleAr: string;
  category: string;
  /** Whole riyals (display world is whole-riyal like the seed). */
  priceMajor: number;
  currency: "SAR";
  /** The vendor's display name — «من المنصة» when the platform itself
   *  is the vendor (spec §7.3 first-party sales). */
  vendorAr: string;
  firstParty: boolean;
  /** Vendor rating display (null → the honest «بائع جديد» line). */
  vendorRating: number | null;
  vendorRatingCount: number;
  /** Fulfillment promise display (days). */
  shipDays: number;
  /** Stock display for the honest add-to-cart gate. */
  inStock: boolean;
  /** The plate's own symbol (the honest no-image display: a styled
   *  category plate, never a faked photo). */
  symbol: string;
  summaryAr: string;
  /** Display Q&A rows count on the product page. */
  qaCount: number;
}

/** The display product world — 12 rows across 6 categories, whole-riyal
 * SAR, two first-party rows («من المنصة»). */
export const STORE_PRODUCTS: readonly StoreProduct[] = [
  {
    id: "demo-product-blender",
    titleAr: "خلاط زجاجي 1.5 لتر بثلاث سرعات",
    category: "home",
    priceMajor: 180,
    currency: "SAR",
    vendorAr: "أدوات المطبخ الشامية",
    firstParty: false,
    vendorRating: 4.6,
    vendorRatingCount: 89,
    shipDays: 2,
    inStock: true,
    symbol: "kitchen",
    summaryAr: "وعاء زجاجي مقاوم للحرارة، شفرات ستانلس، ضمان سنة من البائع",
    qaCount: 3,
  },
  {
    id: "demo-product-airfryer",
    titleAr: "قلاية هوائية 5.5 لتر بشاشة رقمية",
    category: "home",
    priceMajor: 425,
    currency: "SAR",
    vendorAr: "أدوات المطبخ الشامية",
    firstParty: false,
    vendorRating: 4.6,
    vendorRatingCount: 89,
    shipDays: 2,
    inStock: true,
    symbol: "kitchen",
    summaryAr: "ثمانية برامج جاهزة، سلة غير لاصقة، كتاب وصفات عربي مرفق",
    qaCount: 5,
  },
  {
    id: "demo-product-lamp",
    titleAr: "مصباح أرضي خشبي بإضاءة دافئة قابلة للعتم",
    category: "home",
    priceMajor: 145,
    currency: "SAR",
    vendorAr: "لمسة ديكور",
    firstParty: false,
    vendorRating: 4.2,
    vendorRatingCount: 34,
    shipDays: 3,
    inStock: true,
    symbol: "kitchen",
    summaryAr: "قاعدة خشب طبيعي، ثلاث درجات إضاءة، لمبة E27 مرفقة",
    qaCount: 1,
  },
  {
    id: "demo-product-earbuds",
    titleAr: "سماعات لاسلكية بعزل ضجيج نشط",
    category: "electronics",
    priceMajor: 210,
    currency: "SAR",
    vendorAr: "تقنية الواجهة",
    firstParty: false,
    vendorRating: 4.4,
    vendorRatingCount: 156,
    shipDays: 1,
    inStock: true,
    symbol: "devices",
    summaryAr: "بلوتوث 5.3، ثلاثون ساعة مع العلبة، مقاومة رشاش IPX4",
    qaCount: 7,
  },
  {
    id: "demo-product-powerbank",
    titleAr: "بطارية متنقلة 20000 مللي أمبير بشاشة",
    category: "electronics",
    priceMajor: 155,
    currency: "SAR",
    vendorAr: "من المنصة",
    firstParty: true,
    vendorRating: null,
    vendorRatingCount: 0,
    shipDays: 1,
    inStock: true,
    symbol: "devices",
    summaryAr: "شحن سريع 22.5 واط، منفذان USB ومنفذ Type-C — تشحنها وتتركها",
    qaCount: 2,
  },
  {
    id: "demo-product-smartwatch",
    titleAr: "ساعة ذكية بشاشة أموليد ومقاومة ماء",
    category: "electronics",
    priceMajor: 380,
    currency: "SAR",
    vendorAr: "تقنية الواجهة",
    firstParty: false,
    vendorRating: 4.4,
    vendorRatingCount: 156,
    shipDays: 2,
    inStock: false,
    symbol: "devices",
    summaryAr: "قياس نبض وأكسجين، أكثر من مئة نمط رياضي، بطارية عشرة أيام",
    qaCount: 4,
  },
  {
    id: "demo-product-phonecase",
    titleAr: "غطاء جوال جلدي بحماية كاميرا مزدوجة",
    category: "phones",
    priceMajor: 65,
    currency: "SAR",
    vendorAr: "إكسسوارات المزة",
    firstParty: false,
    vendorRating: 4.0,
    vendorRatingCount: 21,
    shipDays: 3,
    inStock: true,
    symbol: "smartphone",
    summaryAr: "جلد طبيعي مدبوغ، حافة مرتفعة حول الكاميرا، ألوان قابلة للنقش",
    qaCount: 2,
  },
  {
    id: "demo-product-charger",
    titleAr: "شاحن جداري 65 واط بثلاث مخارج",
    category: "phones",
    priceMajor: 95,
    currency: "SAR",
    vendorAr: "من المنصة",
    firstParty: true,
    vendorRating: null,
    vendorRatingCount: 0,
    shipDays: 1,
    inStock: true,
    symbol: "smartphone",
    summaryAr: "GaN مدمج، يشحن الجوال والحاسوب معًا — بضمان المنصة نفسها",
    qaCount: 0,
  },
  {
    id: "demo-product-abaya",
    titleAr: "عباية صيفية بقماش نخيلي مزدوج",
    category: "fashion",
    priceMajor: 240,
    currency: "SAR",
    vendorAr: "أزياء الياسمين",
    firstParty: false,
    vendorRating: 4.8,
    vendorRatingCount: 67,
    shipDays: 4,
    inStock: true,
    symbol: "apparel",
    summaryAr: "قماش يتنفس، خياطة يدوية على الأكمام، مقاسات 52 إلى 60",
    qaCount: 3,
  },
  {
    id: "demo-product-sneakers",
    titleAr: "حذاء رياضي للمشي اليومي بنعل مريح",
    category: "fashion",
    priceMajor: 195,
    currency: "SAR",
    vendorAr: "خُطى",
    firstParty: false,
    vendorRating: 4.1,
    vendorRatingCount: 48,
    shipDays: 3,
    inStock: true,
    symbol: "apparel",
    summaryAr: "نعل إيفا خفيف، شبك علوي يتنفس، مقاسات 39 إلى 45",
    qaCount: 1,
  },
  {
    id: "demo-product-stroller",
    titleAr: "عربة أطفال قابلة للطي بيد واحدة",
    category: "kids",
    priceMajor: 520,
    currency: "SAR",
    vendorAr: "عالم الصغير",
    firstParty: false,
    vendorRating: 4.7,
    vendorRatingCount: 52,
    shipDays: 5,
    inStock: true,
    symbol: "child_care",
    summaryAr: "مقعد قابل للاستلقاء الكامل، سلة تسوق كبيرة، كفرات مطاطية",
    qaCount: 6,
  },
  {
    id: "demo-product-football",
    titleAr: "كرة قدم محلية بحشوة غاز منخفض",
    category: "sports",
    priceMajor: 85,
    currency: "SAR",
    vendorAr: "ملعب الحارة",
    firstParty: false,
    vendorRating: 4.3,
    vendorRatingCount: 19,
    shipDays: 2,
    inStock: true,
    symbol: "sports_basketball",
    summaryAr: "خياطة 32 قطعة، مقاس 5، تناسب ملاعب الحواري الصغيرة",
    qaCount: 0,
  },
];

/** Find one display product (id is the page's own param — `demo-` guarded
 * at the parse boundary: an id without the prefix answers not-found). */
export function findStoreProduct(id: string): StoreProduct | null {
  return STORE_PRODUCTS.find((p) => p.id === id) ?? null;
}

/** The store browse read: category filter + text filter, newest-first
 * display order preserved as-is (the dataset's own order). */
export function browseStoreProducts(opts: {
  category?: string;
  q?: string;
}): readonly StoreProduct[] {
  let rows = STORE_PRODUCTS;
  if (opts.category) rows = rows.filter((p) => p.category === opts.category);
  if (opts.q) {
    const needle = opts.q.trim();
    if (needle) {
      rows = rows.filter(
        (p) => p.titleAr.includes(needle) || p.summaryAr.includes(needle),
      );
    }
  }
  return rows;
}

/** The riyal grammar (measured from the design's own market labels — the
 * same classical rule, restated for the store's whole-riyal world). */
export function riyalGrammar(major: number): string {
  if (major === 1) return "ريال";
  if (major === 2) return "ريالان";
  const tail = major % 100;
  if (tail >= 3 && tail <= 10) return "ريالات";
  if (tail >= 11) return "ريالاً";
  return "ريال";
}

/** The store price line: «N ريالات» with the grammar above (latn digits —
 * the owner's HTML number style). */
export function storePriceLine(major: number): string {
  const digits = new Intl.NumberFormat("ar-u-nu-latn").format(major);
  return `${digits} ${riyalGrammar(major)}`;
}

/** The vendor line: the honest first-party badge or the rating pair. */
export function vendorLine(p: StoreProduct): string {
  if (p.firstParty) return "من المنصة";
  if (p.vendorRating === null || p.vendorRatingCount === 0) {
    return `${p.vendorAr} — بائع جديد`;
  }
  const digits = new Intl.NumberFormat("ar-u-nu-latn", {
    maximumFractionDigits: 1,
  }).format(p.vendorRating);
  return `${p.vendorAr} — ${digits} من ٥ (${p.vendorRatingCount} تقييمًا)`;
}

/* ── The cart (REAL cookie state — the framework's official contract) ──── */

/** The cart cookie's name — one cookie, JSON body, the framework writes it
 * only through Server Actions (the official cookies() mutation rule). */
export const CART_COOKIE = "marketplace-cart";

/** One cart line (product id + quantity). */
export interface CartLine {
  productId: string;
  qty: number;
}

/** The cart cookie's parsed shape (versioned for future migration). */
export interface CartCookieShape {
  v: 1;
  lines: CartLine[];
}

/** Read the cart — anonymous-safe (no cookie → empty cart). */
export async function readCart(): Promise<CartLine[]> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartCookieShape;
    if (parsed?.v !== 1 || !Array.isArray(parsed.lines)) return [];
    return parsed.lines.filter(
      (l) =>
        typeof l?.productId === "string" &&
        typeof l?.qty === "number" &&
        Number.isInteger(l.qty) &&
        l.qty > 0 &&
        l.qty <= 9,
    );
  } catch {
    return [];
  }
}

/** Serialize the cart for the cookie write (max-age 90 days — the cart is
 * deliberately long-lived, distinct from the session cookies). */
export function encodeCart(lines: CartLine[]): string {
  return JSON.stringify({ v: 1, lines } satisfies CartCookieShape);
}

/** The cart lines' products joined to their display rows (unknown ids
 * dropped honestly — a stale cookie never breaks the page). */
export function cartLinesWithProducts(
  lines: CartLine[],
): ReadonlyArray<{ product: StoreProduct; qty: number }> {
  return lines.flatMap((l) => {
    const product = findStoreProduct(l.productId);
    return product ? [{ product, qty: l.qty }] : [];
  });
}

/** The cart's vendor grouping (spec §5.2: multi-vendor cart — the checkout
 * settles per vendor). First-party rows group under «من المنصة». */
export function groupCartByVendor(
  joined: ReadonlyArray<{ product: StoreProduct; qty: number }>,
): ReadonlyArray<{
  vendorAr: string;
  firstParty: boolean;
  rows: ReadonlyArray<{ product: StoreProduct; qty: number }>;
  totalMajor: number;
}> {
  const groups = new Map<string, { vendorAr: string; firstParty: boolean; rows: Array<{ product: StoreProduct; qty: number }> }>();
  for (const row of joined) {
    const key = row.product.firstParty ? "\u0000platform" : row.product.vendorAr;
    let g = groups.get(key);
    if (!g) {
      g = { vendorAr: row.product.vendorAr, firstParty: row.product.firstParty, rows: [] };
      groups.set(key, g);
    }
    g.rows.push(row);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    totalMajor: g.rows.reduce((sum, r) => sum + r.product.priceMajor * r.qty, 0),
  }));
}

/** The cart's grand total (whole riyals). */
export function cartGrandTotal(
  joined: ReadonlyArray<{ product: StoreProduct; qty: number }>,
): number {
  return joined.reduce((sum, r) => sum + r.product.priceMajor * r.qty, 0);
}

/* ── The order world (display history in its own cookie) ───────────────── */

/** The orders cookie — display order history, same official cookie rule. */
export const ORDERS_COOKIE = "marketplace-orders";

/** One display order: placed per vendor-group with the lifecycle states
 * the M3 wave will formalize (spec §5.2 — honest state vocabulary). */
export type OrderState =
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "RECEIVED";

export const ORDER_STATE_LABELS: Readonly<Record<OrderState, string>> = {
  PREPARING: "قيد التحضير",
  SHIPPED: "قيد الشحن",
  DELIVERED: "تم التسليم",
  RECEIVED: "تم الاستلام",
};

/** The order's own display row. */
export interface DisplayOrder {
  /** `demo-order-` prefixed. */
  id: string;
  /** ISO instant of placement. */
  placedAt: string;
  state: OrderState;
  vendorAr: string;
  firstParty: boolean;
  rows: ReadonlyArray<{ titleAr: string; qty: number; priceMajor: number }>;
  totalMajor: number;
}

/** The orders cookie's parsed shape (bounded — the last 20 orders kept). */
export interface OrdersCookieShape {
  v: 1;
  orders: DisplayOrder[];
}

export async function readOrders(): Promise<DisplayOrder[]> {
  const jar = await cookies();
  const raw = jar.get(ORDERS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OrdersCookieShape;
    if (parsed?.v !== 1 || !Array.isArray(parsed.orders)) return [];
    return parsed.orders.slice(0, 20);
  } catch {
    return [];
  }
}

export function encodeOrders(orders: DisplayOrder[]): string {
  return JSON.stringify({ v: 1, orders } satisfies OrdersCookieShape);
}

/** The store display gate (the whole store world's engagement rule). */
export function storeDisplayEnabled(): boolean {
  return visionDisplayEnabled();
}
