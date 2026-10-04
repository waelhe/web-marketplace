/**
 * The commerce marketplace's DISPLAY layer + the cart's own cookie-backed
 * contract (the 2026-10-04 full-vision spec §5.2 — the Amazon column).
 * The product world follows the owner's attached binding design (PR #502,
 * 2026-10-04 «استفد والتزم بالتصميم المرفق») — the سوق الحي neighborhood
 * market storefront; see docs/superpowers/specs/2026-10-04-suq-storefront-design-adherence-spec.md.
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
 * charter register). The 2026-10-04 attached design (PR #502, the binding
 * «استفد والتزم بالتصميم المرفق») delivers the owner's dictionary:
 * the سوق الحي food-and-craft market — the eight categories below. This
 * display set self-retires when the owner's M1 dictionary lands. */
export interface StoreCategory {
  code: string;
  labelAr: string;
  /** The category plate's own symbol (Material Symbols name). */
  symbol: string;
}

export const STORE_CATEGORIES: readonly StoreCategory[] = [
  { code: "bakery", labelAr: "مخابز وحلويات", symbol: "bakery_dining" },
  { code: "produce", labelAr: "خضار وفواكه", symbol: "eco" },
  { code: "meats", labelAr: "لحوم ودواجن", symbol: "restaurant" },
  { code: "coffee", labelAr: "قهوة وتحميص", symbol: "coffee" },
  { code: "fashion", labelAr: "أزياء وعبايات", symbol: "apparel" },
  { code: "kids", labelAr: "أطفال ومواليد", symbol: "child_care" },
  { code: "homekitchen", labelAr: "أسر منتجة ومطابخ", symbol: "outdoor_grill" },
  { code: "perfumes", labelAr: "عطور وعناية", symbol: "spa" },
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
  /** The design's own chip on the card (ساخن الآن…) — optional display
   *  badge, absent on most rows. */
  badgeAr?: string;
}

/** The display product world — the attached design's سوق الحي: 29 rows
 * across the eight categories (the design's own products, vendors, and
 * section chips; prices honest whole-riyal SAR — the platform's currency,
 * not the mockup's demo lira; one platform-curated basket rides the
 * offers rail as the first-party row). */
export const STORE_PRODUCTS: readonly StoreProduct[] = [
  {
    id: "demo-suq-bread-tourist",
    titleAr: "خبز سياحي ممتاز وصمون",
    category: "bakery",
    priceMajor: 15,
    currency: "SAR",
    vendorAr: "مخبز ضاحية قدسيا",
    firstParty: false,
    vendorRating: 4.6,
    vendorRatingCount: 89,
    shipDays: 1,
    inStock: true,
    symbol: "bakery_dining",
    summaryAr: "طازج من الفرن مباشرة — يُخبز فجر كل يوم",
    qaCount: 2,
    badgeAr: "ساخن الآن",
  },
  {
    id: "demo-suq-mamoul-pistachio",
    titleAr: "معمول فستق حلبي وجوز",
    category: "bakery",
    priceMajor: 85,
    currency: "SAR",
    vendorAr: "حلويات ومعجنات الشام - قدسيا",
    firstParty: false,
    vendorRating: 4.2,
    vendorRatingCount: 37,
    shipDays: 1,
    inStock: true,
    symbol: "cake",
    summaryAr: "نصف كيلو فاخر محمّص بالسمن البلدي",
    qaCount: 3,
  },
  {
    id: "demo-suq-kaak-sesame",
    titleAr: "كعك شامي بالسمسم والزعتر",
    category: "bakery",
    priceMajor: 20,
    currency: "SAR",
    vendorAr: "أفران كعك الميدان",
    firstParty: false,
    vendorRating: null,
    vendorRatingCount: 0,
    shipDays: 1,
    inStock: true,
    symbol: "bakery_dining",
    summaryAr: "طازج ومقرمش يوميًا — مع شاي الصباح",
    qaCount: 0,
  },
  {
    id: "demo-suq-cherry-fig-basket",
    titleAr: "سلة كرز وتين وادي بردى",
    category: "bakery",
    priceMajor: 45,
    currency: "SAR",
    vendorAr: "بساتين وادي بردى",
    firstParty: false,
    vendorRating: null,
    vendorRatingCount: 0,
    shipDays: 1,
    inStock: false,
    symbol: "nutrition",
    summaryAr: "قطوف الموسم — سلة عائلية (الموسم انتهى، تعود مع القطاف)",
    qaCount: 1,
    badgeAr: "موسمي",
  },
  {
    id: "demo-suq-strawberry-maddaya",
    titleAr: "فراولة مضايا الجبلية العسلية",
    category: "produce",
    priceMajor: 25,
    currency: "SAR",
    vendorAr: "بساتين ريف دمشق",
    firstParty: false,
    vendorRating: 4.5,
    vendorRatingCount: 120,
    shipDays: 1,
    inStock: true,
    symbol: "eco",
    summaryAr: "كيلو مقطوف صباح اليوم من مشاتل مضايا",
    qaCount: 2,
    badgeAr: "قطاف اليوم",
  },
  {
    id: "demo-suq-olive-daraawi",
    titleAr: "زيتون درعاوي متبل بلدي",
    category: "produce",
    priceMajor: 30,
    currency: "SAR",
    vendorAr: "بساتين ريف دمشق",
    firstParty: false,
    vendorRating: 4.5,
    vendorRatingCount: 120,
    shipDays: 1,
    inStock: true,
    symbol: "eco",
    summaryAr: "كيلو معصور بيتي بتتبيلة الليمون والفليفلة",
    qaCount: 1,
  },
  {
    id: "demo-suq-mint-parsley",
    titleAr: "نعناع شامي وبقدونس بلدي",
    category: "produce",
    priceMajor: 8,
    currency: "SAR",
    vendorAr: "مزارع الغوطة",
    firstParty: false,
    vendorRating: null,
    vendorRatingCount: 0,
    shipDays: 1,
    inStock: true,
    symbol: "grass",
    summaryAr: "حزمة صباحية مغسولة وجاهزة للطبخ",
    qaCount: 0,
  },
  {
    id: "demo-suq-lamb-awaas",
    titleAr: "لحم غنم عواس بلدي طازج",
    category: "meats",
    priceMajor: 95,
    currency: "SAR",
    vendorAr: "قصابة ضاحية قدسيا البلدية",
    firstParty: false,
    vendorRating: 4.7,
    vendorRatingCount: 64,
    shipDays: 1,
    inStock: true,
    symbol: "restaurant",
    summaryAr: "كيلو مُقطّع حسب الطلب — ذبح يومي فجرًا",
    qaCount: 4,
    badgeAr: "ذبح يومي",
  },
  {
    id: "demo-suq-chicken-breast",
    titleAr: "صدور فروج بلدي مسحب",
    category: "meats",
    priceMajor: 38,
    currency: "SAR",
    vendorAr: "قصابة ضاحية قدسيا البلدية",
    firstParty: false,
    vendorRating: 4.7,
    vendorRatingCount: 64,
    shipDays: 1,
    inStock: true,
    symbol: "restaurant",
    summaryAr: "كيلو طازج اليوم — بدون عظم وجلد",
    qaCount: 2,
  },
  {
    id: "demo-suq-kebab-halabi",
    titleAr: "كباب حلبي متبل للشوي",
    category: "meats",
    priceMajor: 78,
    currency: "SAR",
    vendorAr: "قصابة ضاحية قدسيا البلدية",
    firstParty: false,
    vendorRating: 4.7,
    vendorRatingCount: 64,
    shipDays: 1,
    inStock: true,
    symbol: "outdoor_grill",
    summaryAr: "كيلو بتتبيلة الجرّان — جاهز للشوي مباشرة",
    qaCount: 3,
  },
  {
    id: "demo-suq-chicken-whole",
    titleAr: "فروج بلدي كامل طازج",
    category: "meats",
    priceMajor: 55,
    currency: "SAR",
    vendorAr: "مداجن ريف دمشق",
    firstParty: false,
    vendorRating: 4.1,
    vendorRatingCount: 28,
    shipDays: 1,
    inStock: true,
    symbol: "restaurant",
    summaryAr: "فروج كامل منظّف — وزن ١٫٥ كيلو تقريبًا",
    qaCount: 1,
  },
  {
    id: "demo-suq-coffee-syrian-cardamom",
    titleAr: "بن سوري مع هال إكسترا ذهبي",
    category: "coffee",
    priceMajor: 60,
    currency: "SAR",
    vendorAr: "بن الحموي - فرع الشام",
    firstParty: false,
    vendorRating: 4.8,
    vendorRatingCount: 210,
    shipDays: 1,
    inStock: true,
    symbol: "coffee",
    summaryAr: "نصف كيلو محمّص اليوم — درجة تحميص وسطى",
    qaCount: 5,
    badgeAr: "تحميص اليوم",
  },
  {
    id: "demo-suq-coffee-turkish-iced",
    titleAr: "قهوة تركية شامية مثلجة",
    category: "coffee",
    priceMajor: 28,
    currency: "SAR",
    vendorAr: "بن الحموي - فرع الشام",
    firstParty: false,
    vendorRating: 4.8,
    vendorRatingCount: 210,
    shipDays: 1,
    inStock: true,
    symbol: "local_cafe",
    summaryAr: "عبوة ٢٥٠ غرامًا — تُحضّر باردة على الطريقة الشامية",
    qaCount: 2,
  },
  {
    id: "demo-suq-coffee-arabic-saffron",
    titleAr: "خلطة بن عربي بالهيل والزعفران",
    category: "coffee",
    priceMajor: 75,
    currency: "SAR",
    vendorAr: "محامص الشام المختصة",
    firstParty: false,
    vendorRating: null,
    vendorRatingCount: 0,
    shipDays: 2,
    inStock: true,
    symbol: "coffee",
    summaryAr: "نصف كيلو — خلطة الضيافة بلمسة زعفران",
    qaCount: 1,
  },
  {
    id: "demo-suq-tea-jasmine",
    titleAr: "شاي سيلاني بالياسمين الدمشقي",
    category: "coffee",
    priceMajor: 22,
    currency: "SAR",
    vendorAr: "عطارة الياسمين",
    firstParty: false,
    vendorRating: 4.0,
    vendorRatingCount: 19,
    shipDays: 2,
    inStock: true,
    symbol: "emoji_food_beverage",
    summaryAr: "٢٠٠ غرام — عبق الياسمين مع الشاي الأسود",
    qaCount: 0,
  },
  {
    id: "demo-suq-abaya-brocard",
    titleAr: "عباية بروكار بتطريز يدوي شامي",
    category: "fashion",
    priceMajor: 405,
    currency: "SAR",
    vendorAr: "دار الياسمين الدمشقي",
    firstParty: false,
    vendorRating: 4.9,
    vendorRatingCount: 77,
    shipDays: 3,
    inStock: true,
    symbol: "apparel",
    summaryAr: "قماش صيفي مزدوج — تطريز البروكار الدمشقي الأصلي",
    qaCount: 4,
    badgeAr: "بروكار دمشقي",
  },
  {
    id: "demo-suq-dress-linen",
    titleAr: "فستان كتان شامي ناعم ومطرز",
    category: "fashion",
    priceMajor: 320,
    currency: "SAR",
    vendorAr: "دار الياسمين الدمشقي",
    firstParty: false,
    vendorRating: 4.9,
    vendorRatingCount: 77,
    shipDays: 3,
    inStock: true,
    symbol: "apparel",
    summaryAr: "كتان طبيعي — مقاسات ٣٨ إلى ٤٦",
    qaCount: 2,
  },
  {
    id: "demo-suq-shawl-kashmiri",
    titleAr: "شال كشميري مطرز حرير",
    category: "fashion",
    priceMajor: 145,
    currency: "SAR",
    vendorAr: "دار الياسمين الدمشقي",
    firstParty: false,
    vendorRating: 4.9,
    vendorRatingCount: 77,
    shipDays: 3,
    inStock: true,
    symbol: "dry_cleaning",
    summaryAr: "قطعة يدوية وحيدة — تطريز حرير على كشمير",
    qaCount: 1,
  },
  {
    id: "demo-suq-jalabiya-cotton",
    titleAr: "جلابية دمشقية قطنية",
    category: "fashion",
    priceMajor: 180,
    currency: "SAR",
    vendorAr: "مشغل دمشق للجلابيات",
    firstParty: false,
    vendorRating: null,
    vendorRatingCount: 0,
    shipDays: 3,
    inStock: true,
    symbol: "apparel",
    summaryAr: "قطن صيفي ١٠٠٪ — قصات واسعة مريحة",
    qaCount: 0,
  },
  {
    id: "demo-suq-newborn-set",
    titleAr: "طقم استقبال مولود قطن حماوي",
    category: "kids",
    priceMajor: 130,
    currency: "SAR",
    vendorAr: "براعم الشام - دمر",
    firstParty: false,
    vendorRating: 4.4,
    vendorRatingCount: 31,
    shipDays: 2,
    inStock: true,
    symbol: "child_care",
    summaryAr: "سبع قطع قطن سوري — هدية المولود التقليدية",
    qaCount: 3,
  },
  {
    id: "demo-suq-baby-cradle-wool",
    titleAr: "مهد أطفال صوف دافئ يدوي",
    category: "kids",
    priceMajor: 220,
    currency: "SAR",
    vendorAr: "أسر منتجة - قدسيا",
    firstParty: false,
    vendorRating: null,
    vendorRatingCount: 0,
    shipDays: 4,
    inStock: true,
    symbol: "crib",
    summaryAr: "غزل صوف يدوي — من صناعة أسر الحي",
    qaCount: 1,
    badgeAr: "صناعة يدوية",
  },
  {
    id: "demo-suq-pajamas-cotton",
    titleAr: "طقم بيجامات قطن ناعم",
    category: "kids",
    priceMajor: 65,
    currency: "SAR",
    vendorAr: "براعم الشام - دمر",
    firstParty: false,
    vendorRating: 4.4,
    vendorRatingCount: 31,
    shipDays: 2,
    inStock: true,
    symbol: "checkroom",
    summaryAr: "قطعتان — قطن مصري مغسول مسبقًا",
    qaCount: 0,
  },
  {
    id: "demo-suq-balance-tower",
    titleAr: "برج توازن خشبي تنموي للأطفال",
    category: "kids",
    priceMajor: 150,
    currency: "SAR",
    vendorAr: "ورشة خشب الحرفة",
    firstParty: false,
    vendorRating: null,
    vendorRatingCount: 0,
    shipDays: 4,
    inStock: true,
    symbol: "toys",
    summaryAr: "خشب زان طبيعي بدهان مائي آمن — لعبة تنموية",
    qaCount: 2,
  },
  {
    id: "demo-suq-kibbeh-shami",
    titleAr: "كبة شامية مقلية بلحم العواس",
    category: "homekitchen",
    priceMajor: 70,
    currency: "SAR",
    vendorAr: "مطبخ أم محمد - قدسيا",
    firstParty: false,
    vendorRating: 5.0,
    vendorRatingCount: 45,
    shipDays: 1,
    inStock: true,
    symbol: "outdoor_grill",
    summaryAr: "كيلو مقرمش بالجوز والصنوبر — يُقلى يوم التسليم",
    qaCount: 3,
    badgeAr: "طازج اليوم",
  },
  {
    id: "demo-suq-makdus-eggplant",
    titleAr: "مكدوس باذنجان بلدي بزيت الزيتون",
    category: "homekitchen",
    priceMajor: 90,
    currency: "SAR",
    vendorAr: "مطبخ أم محمد - قدسيا",
    firstParty: false,
    vendorRating: 5.0,
    vendorRatingCount: 45,
    shipDays: 1,
    inStock: true,
    symbol: "takeout_dining",
    summaryAr: "عبوة كيلو — باذنجان بلدي صغير بجوز ومعصور بيتي",
    qaCount: 2,
  },
  {
    id: "demo-suq-yabraa-olive-oil",
    titleAr: "يبرق بلدي بزيت الزيتون والرمان",
    category: "homekitchen",
    priceMajor: 110,
    currency: "SAR",
    vendorAr: "مطبخ السيدة هدية - دمر",
    firstParty: false,
    vendorRating: null,
    vendorRatingCount: 0,
    shipDays: 1,
    inStock: true,
    symbol: "dinner_dining",
    summaryAr: "صينية عائلية — ورق عنب بصلصة الرمان المكثفة",
    qaCount: 1,
  },
  {
    id: "demo-suq-halawet-jibn",
    titleAr: "حلاوة الجبن الحمصية الفاخرة",
    category: "homekitchen",
    priceMajor: 120,
    currency: "SAR",
    vendorAr: "حلاوات الشام",
    firstParty: false,
    vendorRating: 4.3,
    vendorRatingCount: 52,
    shipDays: 1,
    inStock: true,
    symbol: "icecream",
    summaryAr: "كيلو قشطة قنديّة بالفستق الحلبي المطحون",
    qaCount: 2,
  },
  {
    id: "demo-suq-breakfast-basket",
    titleAr: "سلة صباح قدسيا المتكاملة",
    category: "bakery",
    priceMajor: 195,
    currency: "SAR",
    vendorAr: "من المنصة",
    firstParty: true,
    vendorRating: null,
    vendorRatingCount: 0,
    shipDays: 1,
    inStock: true,
    symbol: "shopping_basket",
    summaryAr: "خبز الضاحية + جبن عكاوي + زعتر بلدي + زيت زيتون — تنسيق المنصة",
    qaCount: 4,
    badgeAr: "تنسيق المنصة",
  },
  {
    id: "demo-suq-vegetable-box",
    titleAr: "صندوق خضار ريف دمشق الموفر",
    category: "produce",
    priceMajor: 95,
    currency: "SAR",
    vendorAr: "بساتين ريف دمشق",
    firstParty: false,
    vendorRating: 4.5,
    vendorRatingCount: 120,
    shipDays: 1,
    inStock: true,
    symbol: "shopping_basket",
    summaryAr: "خيار بلدي، بندورة حورانية، نعناع — صندوق الأسبوع",
    qaCount: 3,
    badgeAr: "قطاف الغوطة",
  },
];

/** The storefront's own section headers — the attached design's seven
 * market sections (title, stores line, the section's chip). The eighth
 * category (عطور وعناية) has no section yet: its chip renders, its
 * section waits for rows (the honest empty rule). */
export interface SuqSection {
  category: string;
  titleAr: string;
  /** The stores line under the section title (the design's own). */
  vendorsLineAr: string;
  /** The section chip (ساخن الآن / قطاف الزبداني…). */
  chipAr: string;
  symbol: string;
}

export const SUQ_SECTIONS: readonly SuqSection[] = [
  { category: "bakery", titleAr: "أفران ومعجنات دمر والشام", vendorsLineAr: "مخبز ضاحية قدسيا الآلي • أفران ساحة قدسيا • تنور الشام", chipAr: "ساخن الآن", symbol: "bakery_dining" },
  { category: "produce", titleAr: "الخضار والفواكه", vendorsLineAr: "مزارع وبساتين طازجة", chipAr: "قطاف الزبداني", symbol: "eco" },
  { category: "meats", titleAr: "اللحوم والدواجن", vendorsLineAr: "لحوم بلدية ودواجن طازجة", chipAr: "ذبح يومي عواس", symbol: "restaurant" },
  { category: "coffee", titleAr: "القهوة والمحامص", vendorsLineAr: "بن محمّص ومشروبات مختصة", chipAr: "تحميص اليوم", symbol: "coffee" },
  { category: "fashion", titleAr: "الأزياء والملابس", vendorsLineAr: "أقمشة وأزياء متنوعة", chipAr: "بروكار دمشقي", symbol: "apparel" },
  { category: "kids", titleAr: "الأطفال والمواليد", vendorsLineAr: "مستلزمات وألعاب الأطفال", chipAr: "قطن سوري ١٠٠٪", symbol: "child_care" },
  { category: "homekitchen", titleAr: "الأسر المنتجة", vendorsLineAr: "مأكولات ومؤونة منزلية", chipAr: "طبخ منزلي شامي", symbol: "outdoor_grill" },
];

/** The offers rail — the design's three quick offers, each linking to its
 * REAL product row (display badge + honest product price). */
export interface SuqOffer {
  badgeAr: string;
  productId: string;
  /** The offer's own line (the design's vendor note). */
  noteAr: string;
}

export const SUQ_OFFERS: readonly SuqOffer[] = [
  { badgeAr: "خصم ٣٠٪", productId: "demo-suq-breakfast-basket", noteAr: "فرن الضاحية + مزارع ريف دمشق" },
  { badgeAr: "قطاف الغوطة", productId: "demo-suq-vegetable-box", noteAr: "خيار بلدي، بندورة حورانية، نعناع" },
  { badgeAr: "عرض العصرونية", productId: "demo-suq-coffee-syrian-cardamom", noteAr: "نصف كيلو بن مع هال إكسترا" },
];

/** The storefront sections joined to their product rows (the browse
 * composition: sections in the design's own order, each with its rows in
 * the dataset's own order). A section with no rows is dropped honestly. */
export function suqStorefrontSections(): ReadonlyArray<SuqSection & { rows: readonly StoreProduct[] }> {
  return SUQ_SECTIONS.flatMap((s) => {
    const rows = STORE_PRODUCTS.filter((p) => p.category === s.category);
    return rows.length > 0 ? [{ ...s, rows }] : [];
  });
}

/** The offers rail joined to its products (an offer whose product is
 * missing drops honestly — same rule as the cart's stale ids). */
export function suqOffers(): ReadonlyArray<SuqOffer & { product: StoreProduct }> {
  return SUQ_OFFERS.flatMap((o) => {
    const product = findStoreProduct(o.productId);
    return product ? [{ ...o, product }] : [];
  });
}

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

/** The store price line: «N ريالات» with the grammar above. Digits follow
 * the attached storefront design's own style (Arabic-Indic — the PR #502
 * mockup renders ١٢,٠٠٠ everywhere; measured 2026-10-04). */
export function storePriceLine(major: number): string {
  const digits = new Intl.NumberFormat("ar-SA").format(major);
  return `${digits} ${riyalGrammar(major)}`;
}

/** The vendor line: the honest first-party badge or the rating pair. */
export function vendorLine(p: StoreProduct): string {
  if (p.firstParty) return "من المنصة";
  if (p.vendorRating === null || p.vendorRatingCount === 0) {
    return `${p.vendorAr} — بائع جديد`;
  }
  const digits = new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 1,
  }).format(p.vendorRating);
  const count = new Intl.NumberFormat("ar-SA").format(p.vendorRatingCount);
  return `${p.vendorAr} — ${digits} من ٥ (${count} تقييمًا)`;
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
