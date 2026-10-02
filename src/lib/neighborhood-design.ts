/**
 * The OWNER-DESIGN layer — the design source of truth made executable
 * (owner directive 2026-09-29T07:09: «سازودك بكود html. كمرفق» + the
 * verdict «نتيجة فاشلة مازلت تغلف ولاتبني منتج» — the attached HTML
 * IS the product's face). The attachment arrived as repo files
 * (code.md + screen.png, commits 23a03ee / PR #23) — an 860-line RTL
 * dashboard («حيّنا») with a Material-3-style emerald token system.
 *
 * WHAT THIS IS: the product-defined display contracts for the four
 * screens the owner's spec names (خلاصة الحي / سوق الحي والحراج /
 * دليل الخدمات والتوصيات / تنبيهات الأمان والمفقودات), carrying the
 * OWNER'S OWN content — the exact posts, widgets, and vocabulary of
 * the supplied HTML, transplanted verbatim. Where the backend already
 * serves a need, the surface rides the real measured channel (the
 * feed, the membership, the location-scoped listings read — unchanged
 * from S7/S8/S9). Where it does not yet, this layer serves the
 * owner's content in the exact shape the product defined.
 *
 * THE DISCIPLINE (inherited from neighborhood-product.ts):
 * 1. Display data rides the SUCCESS path only and never masks an
 *    outage of any real read on the same surface.
 * 2. Every display section carries the «بيانات عرض» badge.
 * 3. Display ids carry the `demo-` prefix — they can never parse as
 *    backend UUIDs (isUuid-guarded surfaces stay safe).
 * 4. Display rows are NEVER links: the public provider-page read would
 *    404 for a demo id, and faking a page would poison trust.
 * 5. ONE env off-switch (`DEMO_NEIGHBORHOOD=0|false`) — the owner's
 *    seed directive stays the default.
 *
 * The design's own numbers are LATIN digits inside Arabic text (832
 * عائلة، 412 جار، 99%) — the count() helpers below reproduce exactly
 * that (ar locale + latn numbering), the owner's visual verbatim.
 */

/** Latin-digit Arabic-locale count — the owner's HTML number style. */
export function ownerCount(n: number): string {
  return new Intl.NumberFormat("ar-u-nu-latn").format(n);
}

/** Latin-digit percent — «42%» exactly as the supplied HTML renders it. */
export function ownerPercent(share: number): string {
  return `${new Intl.NumberFormat("ar-u-nu-latn", { maximumFractionDigits: 0 }).format(share * 100)}%`;
}

/* ===================================================================
 * SCREEN ① — خلاصة الحي: the mood banner + the pinned urgent alert.
 * =================================================================== */

/** The mood banner's ambient facts (the design's greeting strip). */
export interface OwnerMood {
  /** The welcome line's leading phrase — «صباح الخير والمودّة». */
  greeting: string;
  /** The safety-zone chip — «مربع 4 - واحة الأمان». */
  zoneChip: string;
  /** The community strength line — «مجتمع متماسك يعتني بجيرانه • 832 عائلة…». */
  strength: string;
  /** Registered active families (the chip's number). */
  families: number;
  /** The gate-watch line — «حراسة البوابات 100% متيقظة». */
  gateWatch: string;
}

export const DEMO_MOOD: readonly OwnerMood[] = [
  {
    greeting: "صباح الخير والمودّة",
    zoneChip: "مربع 4 - واحة الأمان",
    strength: "مجتمع متماسك يعتني بجيرانه",
    families: 832,
    gateWatch: "حراسة البوابات 100% متيقظة",
  },
];

/**
 * The pinned urgent alert — the design's «تنبيه حيوي مثبت»: committee
 * infrastructure news above the feed, with the works map snippet, the
 * movement guidelines, and the acknowledgment counter.
 */
export interface OwnerAlert {
  /** `demo-` prefixed — never a UUID. */
  id: string;
  /** The issuer identity — «لجنة تطوير الحي بالتنسيق مع أمانة الرياض». */
  issuer: string;
  /** The pinned badge — «تنبيه حيوي مثبت». */
  badge: string;
  /** «قبل ساعة واحدة • نطاق التنفيذ: شارع وادي السرحان». */
  when: string;
  title: string;
  body: string;
  /** The works-location snippet label — «مسار الأعمال الميدانية». */
  mapLabel: string;
  /** Movement guidelines (the design's two-item list). */
  guidelines: readonly string[];
  /** The temporary-parking note — «مواقف مخصصة مؤقتة بجوار مجمع المدارس». */
  parkingNote: string;
  /** «تفاصيل المسار» — a display affordance, no route yet. */
  routeDetailLabel: string;
  views: number;
  acknowledgments: number;
  ackLabel: string;
}

export const DEMO_OWNER_ALERTS: readonly OwnerAlert[] = [
  {
    id: "demo-alert-fiber-works",
    issuer: "لجنة تطوير الحي بالتنسيق مع أمانة الرياض",
    badge: "تنبيه حيوي مثبت",
    when: "قبل ساعة واحدة • نطاق التنفيذ: شارع وادي السرحان",
    title: "أعمال صيانة وتمديد ألياف بصرية ذكية في شارع وادي السرحان تبدأ غداً",
    body:
      "نود إحاطة الجيران الكرام ببدء أعمال ترقية البنية التحتية للألياف الضوئية غداً الأربعاء من الساعة 8:00 صباحاً وحتى 4:00 عصراً. سيتم إغلاق جزئي للمسار الأيمن بين تقاطع شارع اليمامة وشارع وادي حنيفة، وتتوفر مسارات التفافية آمنة.",
    mapLabel: "مسار الأعمال الميدانية",
    guidelines: [
      "استخدام شارع الإمام سعود بن عبد العزيز كممر رئيسي للدخول للبوابة رقم 2.",
      "يرجى من السكان المحاذيين عدم ركن السيارات على جانبي الرصيف الشرقي.",
    ],
    parkingNote: "مواقف مخصصة مؤقتة بجوار مجمع المدارس",
    routeDetailLabel: "تفاصيل المسار",
    views: 628,
    acknowledgments: 84,
    ackLabel: "تأكيد العلم والمتابعة",
  },
];

/* ===================================================================
 * SCREEN ① — the feed's display posts: recommendation, lost&found,
 * and the new-neighbor welcome (the poll keeps its S8 contract —
 * neighborhood-product.ts NeighborhoodPoll — the interaction is real
 * client state since S8; only its skin moves to the owner's design).
 * =================================================================== */

/** The embedded service card inside a recommendation post. */
export interface OwnerServiceCard {
  /** The provider's display name — «أبو حاتم - صيانة التكييف المتقدمة». */
  name: string;
  /** Rating aggregate (1–5) — display. */
  rating: number;
  /** Review count — «(31 تقييم من أهل الحي)». */
  reviews: number;
  /** The trade + coverage line. */
  coverage: string;
  /** The trade icon name (Material Symbols Outlined vocabulary). */
  icon: string;
}

/** The one preview comment the design shows under its posts. */
export interface OwnerCommentPreview {
  /** Comment author — «سعد العريفي (شارع اليمامة)». */
  author: string;
  when: string;
  body: string;
  /** «عرض بقية التعليقات (11 تعليقاً)...» */
  moreLabel: string;
}

export type OwnerFeedPostKind = "RECOMMENDATION" | "LOST_FOUND" | "WELCOME";

export interface OwnerFeedPost {
  /** `demo-` prefixed — never a UUID. */
  id: string;
  kind: OwnerFeedPostKind;
  /** Author display name — the owner's own content (display layer). */
  author: string;
  /** Author initials for the avatar circle. */
  initials: string;
  /** The avatar's tone: primary / tertiary / secondary. */
  tone: "primary" | "tertiary" | "secondary";
  /** The meta line — street + relative time. */
  meta: string;
  /** The verified chip — «جار موثق» / «توصية مجربة» / «جار جديد بالحي». */
  chip: string;
  /** Material Symbols Outlined icon for the chip. */
  chipIcon: string;
  /** Optional section chip — «مفقودات الحي». */
  sectionChip?: string;
  title?: string;
  body: string;
  /** The embedded service card (RECOMMENDATION only). */
  service?: OwnerServiceCard;
  /** The image placeholder's icon + alt (LOST_FOUND only). */
  imageIcon?: string;
  imageAlt?: string;
  /** Action-bar counts (thanks / interactions). */
  thanks?: number;
  thanksLabel?: string;
  commentsCount?: number;
  /** The single preview comment. */
  commentPreview?: OwnerCommentPreview;
  /** The primary CTA (display interaction or honest gate). */
  ctaLabel?: string;
  /** The secondary CTA — «مشاركة في واتساب مربع 2». */
  ctaSecondary?: string;
  /** The footer status line — «سيتم تسليمه لحراسة البوابة الشمالية…». */
  footNote?: string;
  /** WELCOME: the welcoming-neighbors count + stacked initials. */
  welcomedBy?: number;
  welcomeStack?: readonly string[];
}

export const DEMO_OWNER_POSTS: readonly OwnerFeedPost[] = [
  {
    id: "demo-post-abu-hatem-recommendation",
    kind: "RECOMMENDATION",
    author: "د. خالد التميمي",
    initials: "خ.ت",
    tone: "tertiary",
    meta: "شارع اليمامة - فيلا 42 • منذ 3 ساعات",
    chip: "توصية مجربة",
    chipIcon: "verified",
    body:
      "مساء الخير يا جيران، مع موجة الحر الحالية تعطل فجأة مكيف الصالة المركزي الرئيسي. تواصلت مع الفني «أبو حاتم التونسي» بعد نصيحة سابقة، وجاء في غضون 40 دقيقة، شخص أمين وفاهم جداً، فحص تسريب الفريون ونظف الفلاتر بسعر منصف وبدون مبالغة. أنصح به بشدة لأي جار محتاج صيانة فورية.",
    service: {
      name: "أبو حاتم - صيانة التكييف المتقدمة",
      rating: 4.9,
      reviews: 31,
      coverage: "خدمة تبريد وتكييف • متواجد داخل نطاق شمال الرياض",
      icon: "hvac",
    },
    thanks: 34,
    thanksLabel: "شكراً يا دكتور",
    commentsCount: 12,
    commentPreview: {
      author: "سعد العريفي (شارع اليمامة)",
      when: "منذ ساعتين",
      body:
        "فعلاً أؤكد كلامك يا دكتور! أبو حاتم صلح عندنا مكيف المطبخ قبل أسبوعين وما زال أداؤه ممتاز ومتقن.",
      moreLabel: "عرض بقية التعليقات (11 تعليقاً)...",
    },
    ctaLabel: "34 شكراً يا دكتور",
  },
  {
    id: "demo-post-white-cat-lostfound",
    kind: "LOST_FOUND",
    author: "العم أبو طارق السديري",
    initials: "أ.ط",
    tone: "primary",
    meta: "قرب مسجد الفرقان - مربع 2 • منذ 5 ساعات",
    chip: "تم العثور عليه بنجاح",
    chipIcon: "check_circle",
    sectionChip: "مفقودات الحي",
    title: "قط أليف أبيض اللون وُجد متجولاً بحديقة مسجد الفرقان",
    body:
      "وجدنا بعد صلاة الظهر هذا القط الأليف النظيف (يرتدي طوقاً جلدياً أحمر اللون بدون شريحة اسم واضحة). القط بصحة ممتازة وهو حالياً في ضيافتنا بالفيلا لحين وصول صاحبه من الجيران.",
    imageIcon: "pets",
    imageAlt: "صورة القط الأبيض المفقود",
    thanks: 27,
    thanksLabel: "تفاعل ودعاء بالتيسير",
    commentsCount: 8,
    ctaLabel: "تواصل مع العم أبو طارق",
    ctaSecondary: "مشاركة في واتساب مربع 2",
    footNote: "سيتم تسليمه لحراسة البوابة الشمالية في حال عدم التعرف",
  },
  {
    id: "demo-post-faisal-welcome",
    kind: "WELCOME",
    author: "المهندس فيصل العتيبي",
    initials: "ف.ع",
    tone: "secondary",
    meta: "انتقل حديثاً إلى: شارع الشيخ عبدالعزيز بن باز - فيلا 18",
    chip: "جار جديد بالحي",
    chipIcon: "celebration",
    body:
      "«السلام عليكم ورحمة الله وبركاته، يشرفني وأسرتي الكريمة الانضمام إلى هذا الحي الراقي وطيب الجيرة. سعداء جداً بتواجدنا بينكم ونتطلع للتعرف على الجيران الكرام والمشاركة الفعالة في ديوانية ومبادرات الحي».",
    ctaLabel: "رحّب بالجار الجديد",
    welcomedBy: 49,
    welcomeStack: ["أ.ن", "خ.م", "س.ع"],
  },
];

/* ===================================================================
 * SCREEN ① — the sidebar widgets: neighborhood pulse, the emergency
 * directory, and the specialist groups (weather keeps its S8
 * contract — NeighborhoodWeather; events preview rides the S9
 * DEMO_EVENTS source — one source of truth per product contract).
 * =================================================================== */

/** نبض الحي اليوم — the design's pulse widget (412 online / 18 done). */
export interface OwnerPulse {
  /** Active neighbors right now — «412 جار متصل». */
  onlineNow: number;
  /** Solved requests this week — «18 مبادرة منجزة». */
  solvedThisWeek: number;
  /** The safety ring percent — 99. */
  safetyPercent: number;
  /** The ring's caption lines. */
  safetyTitle: string;
  safetyNote: string;
}

export const DEMO_OWNER_PULSE: readonly OwnerPulse[] = [
  {
    onlineNow: 412,
    solvedThisWeek: 18,
    safetyPercent: 99,
    safetyTitle: "نسبة الأمان والسكينة السكنية",
    safetyNote: "صفر بلاغات حرجة للشهر الحالي",
  },
];

/** One emergency quick-contact row — the design's طوارئ widget. */
export interface OwnerEmergencyContact {
  /** `demo-` prefixed. */
  id: string;
  name: string;
  note: string;
  /** Material Symbols icon. */
  icon: string;
  /** The row's icon tone: primary / secondary / neutral. */
  tone: "primary" | "secondary" | "neutral";
}

export const DEMO_EMERGENCY_CONTACTS: readonly OwnerEmergencyContact[] = [
  {
    id: "demo-emergency-gates",
    name: "غرفة الحراسة والبوابات",
    note: "الفرقة الأمنية - بوابة 1 و 2",
    icon: "shield_person",
    tone: "primary",
  },
  {
    id: "demo-emergency-municipality",
    name: "طوارئ أمانة الشمال (940)",
    note: "إنارة الطرق والأشجار المتساقطة",
    icon: "location_city",
    tone: "secondary",
  },
  {
    id: "demo-emergency-water",
    name: "طوارئ المياه والشبكات",
    note: "مكتب الدعم الميداني المباشر",
    icon: "water_drop",
    tone: "neutral",
  },
];

/** The visitor-pass affordance — honestly gated (no QR contract yet). */
export interface OwnerVisitorPass {
  title: string;
  note: string;
  actionLabel: string;
  gatedReason: string;
}

export const DEMO_VISITOR_PASS: readonly OwnerVisitorPass[] = [
  {
    title: "إصدار تصريح زائر سريع",
    note: "رمز QR فوري لمرور سيارات الضيوف",
    actionLabel: "إنشاء",
    gatedReason: "قريبًا — بانتظار عقد تصاريح الزوار لدى الباك اند",
  },
];

/** One specialist group row — the design's مجموعات widget. */
export interface OwnerGroupRow {
  /** `demo-` prefixed. */
  id: string;
  name: string;
  /** «85 عضواً • تجمّع يومي 5:30 فجراً». */
  meta: string;
  members: number;
  icon: string;
  tone: "primary" | "secondary" | "tertiary";
  /** The join affordance's honest gate (no group-membership write yet). */
  joinGate: string;
}

export const DEMO_OWNER_GROUPS: readonly OwnerGroupRow[] = [
  {
    id: "demo-group-cycling",
    name: "فريق دراجي ومشي النخيل",
    meta: "85 عضواً • تجمّع يومي 5:30 فجراً",
    members: 85,
    icon: "directions_bike",
    tone: "primary",
    joinGate: "قريبًا — الانضمام للمجموعات بانتظار عقد الباك اند",
  },
  {
    id: "demo-group-parents",
    name: "مجلس أولياء أمور المدارس",
    meta: "120 عضواً • نقاش الباصات والأنشطة",
    members: 120,
    icon: "school",
    tone: "secondary",
    joinGate: "قريبًا — الانضمام للمجموعات بانتظار عقد الباك اند",
  },
  {
    id: "demo-group-readers",
    name: "نادي قراء ومثقفي النخيل",
    meta: "45 عضواً • مناقشة كتاب شهرياً",
    members: 45,
    icon: "menu_book",
    tone: "tertiary",
    joinGate: "قريبًا — الانضمام للمجموعات بانتظار عقد الباك اند",
  },
];

/** ميثاق الجيرة الطيبة — the sidebar's closing charter badge. */
export interface OwnerCharter {
  title: string;
  quote: string;
  rulesLabel: string;
  /** The disclosure's own guidelines (the neighborhood's safety rules). */
  rules: readonly string[];
}

export const DEMO_CHARTER: readonly OwnerCharter[] = [
  {
    title: "ميثاق الجيرة الطيبة",
    quote:
      "«ما زال جبريل يوصيني بالجار حتى ظننت أنه سيورثه» • جميع التعاملات تخضع لمبادئ الخصوصية والاحترام المتبادل.",
    rulesLabel: "اطّلع على دليل لوائح وسلوكيات الحي",
    rules: [
      "لا تنشر تفاصيل سفرك أو مفاتيح بيتك في المنشورات العامة.",
      "زرّ «التبليغ» أسفل كل منشور يصلك مقلقًا — الإدارة تراجعه.",
      "الرسائل مع الجيران محفوظة داخل المنصة — لا تشارك بياناتك البنكية أبدًا.",
      "التعاملات في سوق الحي تسجل داخل المنصة — لا تحول مالاً خارجها.",
    ],
  },
];

/* ===================================================================
 * SCREEN ② — سوق الحي والحراج: the market display grid.
 *
 * L50 (gap #5 served, 2026-10-02): the category vocabulary now re-
 * exports from the SERVED contract (community-contract.ts measured it
 * from the backend's MarketCategory enum; the display dataset and the
 * served rows share the same membership — one vocabulary, zero drift,
 * the neighborhood-events.ts discipline verbatim).
 * =================================================================== */

export {
  MARKET_CATEGORIES,
  MARKET_CATEGORY_LABELS,
} from "@/lib/api/community-contract";
import {
  MARKET_CATEGORIES,
  MARKET_CATEGORY_LABELS,
  type MarketCategory,
} from "@/lib/api/community-contract";

/** The display-layer alias (the S10 module's historical name). */
export type OwnerMarketCategory = MarketCategory;

export interface OwnerMarketItem {
  /** `demo-` prefixed. */
  id: string;
  title: string;
  /** Price label — «مجاني — إهداء» or «120 ريالاً». */
  priceLabel: string;
  /** True when the item is a free gift (the design's green gift band). */
  free: boolean;
  category: OwnerMarketCategory;
  /** Condition chip — «كالجديد» / «جيد». */
  condition: string;
  /** Location — «شارع اليمامة - مربع 2». */
  location: string;
  /** Relative time — «منذ 3 ساعات». */
  when: string;
  /** Material Symbols icon for the item's image block. */
  icon: string;
  /** Seller's badge — «جار موثق». */
  sellerBadge: string;
}

export const DEMO_MARKET_ITEMS: readonly OwnerMarketItem[] = [
  {
    id: "demo-market-desk-free",
    title: "مكتب دراسي خشبي بحالة ممتازة — إهداء لأسرة طلاب",
    priceLabel: "مجاني — إهداء",
    free: true,
    category: "FREE",
    condition: "كالجديد",
    location: "شارع اليمامة - مربع 2",
    when: "منذ ساعتين",
    icon: "desk",
    sellerBadge: "جار موثق",
  },
  {
    id: "demo-market-ac-unit",
    title: "تكييف شباك 1.5 طن يعمل بكفاءة — صيانته حديثة",
    priceLabel: "350 ريالاً",
    free: false,
    category: "ELECTRONICS",
    condition: "جيد",
    location: "شارع وادي حنيفة - مربع 3",
    when: "منذ 4 ساعات",
    icon: "ac_unit",
    sellerBadge: "جار موثق",
  },
  {
    id: "demo-market-children-books",
    title: "موسوعة علمية للأطفال (12 مجلداً) — إهداء",
    priceLabel: "مجاني — إهداء",
    free: true,
    category: "FREE",
    condition: "كالجديد",
    location: "شارع الشيخ عبدالعزيز بن باز",
    when: "منذ 6 ساعات",
    icon: "menu_book",
    sellerBadge: "جار موثق",
  },
  {
    id: "demo-market-sofa",
    title: "أريكة جلسة عائلية 7 مقاعد — قماش قابل للغسل",
    priceLabel: "480 ريالاً",
    free: false,
    category: "FURNITURE",
    condition: "جيد",
    location: "شارع الإمام سعود بن عبد العزيز",
    when: "منذ 8 ساعات",
    icon: "chair",
    sellerBadge: "جار موثق",
  },
  {
    id: "demo-market-saw",
    title: "منشار كهربائي محمول + طقم ملحقاته الكامل",
    priceLabel: "260 ريالاً",
    free: false,
    category: "TOOLS",
    condition: "جيد",
    location: "شارع اليمامة - مربع 4",
    when: "منذ 11 ساعة",
    icon: "carpenter",
    sellerBadge: "جار موثق",
  },
  {
    id: "demo-market-bike",
    title: "دراجة أطفال 16 بوصة — تحتاج تبطين إطارات فقط",
    priceLabel: "120 ريالاً",
    free: false,
    category: "OTHER",
    condition: "جيد",
    location: "شارع وادي السرحان",
    when: "منذ يوم",
    icon: "pedal_bike",
    sellerBadge: "جار موثق",
  },
  {
    id: "demo-market-plants-free",
    title: "شتلات نعناع وريحان وزعتر — إهداء لبستنة الجيران",
    priceLabel: "مجاني — إهداء",
    free: true,
    category: "FREE",
    condition: "كالجديد",
    location: "حي النخيل الغربي - مربع 1",
    when: "منذ يوم",
    icon: "potted_plant",
    sellerBadge: "جار موثق",
  },
  {
    id: "demo-market-tv-stand",
    title: "طقم طاولة تلفزيون زجاجي مع رفّين خشبيين",
    priceLabel: "150 ريالاً",
    free: false,
    category: "FURNITURE",
    condition: "جيد",
    location: "شارع اليمامة - مربع 2",
    when: "منذ يومين",
    icon: "tv",
    sellerBadge: "جار موثق",
  },
];

/** Parse ?cat= against the market vocabulary — invalid values drop to null. */
export function parseMarketCategory(
  raw: string | string[] | undefined,
): OwnerMarketCategory | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return MARKET_CATEGORIES.includes(value as OwnerMarketCategory)
    ? (value as OwnerMarketCategory)
    : null;
}

/** Case-insensitive display-item text match for the market's ?q= read. */
export function marketItemMatches(item: OwnerMarketItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  const haystack = `${item.title} ${item.location} ${MARKET_CATEGORY_LABELS[item.category]} ${item.priceLabel}`;
  return haystack.toLowerCase().includes(q);
}

/** ركن الإهداء — the free-gifts rail summary. */
export function freeGiftCount(items: readonly OwnerMarketItem[]): number {
  return items.filter((item) => item.free).length;
}

/** نصائح بيع آمن — the market's honest-transaction rules strip. */
export const MARKET_SAFETY_RULES: readonly string[] = [
  "استلم البضاعة وافحصها قبل الدفع — التعامل وجهًا لوجه عند بوابات الحي.",
  "لا تحوّل أي مبلغ خارج المنصة مهما كان العذر.",
  "احتفظ بسجل المحادثة داخل صندوق رسائل الجيران.",
  "الإعلانات المجانية (الإهداء) بلا مقابل — من يشترط مقابلًا يُبلَّغ عنه.",
];

/* ===================================================================
 * SCREEN ③ — دليل الخدمات والتوصيات: the trades filter vocabulary
 * (over the SAME NeighborhoodBusiness contract the feed rail rides —
 * one source of truth; the owner's own service card rides first).
 * =================================================================== */

export const SERVICE_TRADES = [
  "ALL",
  "COOLING",
  "HOME_CARE",
  "STAY",
  "MAINTENANCE",
] as const;

export type ServiceTrade = (typeof SERVICE_TRADES)[number];

export const SERVICE_TRADE_LABELS: Record<ServiceTrade, string> = {
  ALL: "كل الخدمات",
  COOLING: "تكييف وتبريد",
  HOME_CARE: "خدمات منزلية",
  STAY: "إقامة وشاليهات",
  MAINTENANCE: "صيانة عامة",
};

/** The owner's own service card — the directory's featured first row. */
export interface OwnerFeaturedService {
  /** `demo-` prefixed. */
  id: string;
  name: string;
  trade: ServiceTrade;
  tradeLabel: string;
  rating: number;
  reviews: number;
  reviewsLabel: string;
  coverage: string;
  icon: string;
  /** «توصية د. خالد التميمي: أمين وفاهم جداً وبدون مبالغة». */
  neighborNote: string;
}

export const DEMO_FEATURED_SERVICE: readonly OwnerFeaturedService[] = [
  {
    id: "demo-service-abu-hatem",
    name: "أبو حاتم - صيانة التكييف المتقدمة",
    trade: "COOLING",
    tradeLabel: "تكييف وتبريد",
    rating: 4.9,
    reviews: 31,
    reviewsLabel: "31 تقييم من أهل الحي",
    coverage: "خدمة تبريد وتكييف • متواجد داخل نطاق شمال الرياض",
    icon: "hvac",
    neighborNote: "توصية د. خالد التميمي: «شخص أمين وفاهم جداً، بسعر منصف وبدون مبالغة»",
  },
];

/** Parse ?trade= against the services vocabulary — invalid values drop to null. */
export function parseServiceTrade(raw: string | string[] | undefined): ServiceTrade | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return SERVICE_TRADES.includes(value as ServiceTrade) ? (value as ServiceTrade) : null;
}

/** Case-insensitive directory match for the services' ?q= read. */
export function serviceMatches(
  name: string,
  trade: string,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return `${name} ${trade}`.toLowerCase().includes(q);
}

/* ===================================================================
 * SCREEN ④ — تنبيهات الأمان والمفقودات: the neighborhood zone map,
 * the safety incidents, and the lost&found board.
 * =================================================================== */

export type ZoneStatus = "SAFE" | "NOTICE" | "WORKS";

export const ZONE_STATUS_LABELS: Record<ZoneStatus, string> = {
  SAFE: "آمن ومستقر",
  NOTICE: "تنبيه سلوكي",
  WORKS: "أعمال جارية",
};

export interface OwnerZone {
  /** `demo-` prefixed. */
  id: string;
  /** The map block's label — «مربع 1». */
  label: string;
  /** The zone's descriptive name — «بوابة النخيل الرئيسية». */
  name: string;
  status: ZoneStatus;
  /** The status note under the block. */
  note: string;
  /** True when the zone is the viewer's own (the design's chip). */
  mine?: boolean;
}

export const DEMO_ZONES: readonly OwnerZone[] = [
  {
    id: "demo-zone-1",
    label: "مربع 1",
    name: "بوابة النخيل الرئيسية",
    status: "SAFE",
    note: "دورية الحراسة نشطة الآن",
  },
  {
    id: "demo-zone-2",
    label: "مربع 2",
    name: "مسجد الفرقان والحدائق",
    status: "SAFE",
    note: "التقاط مفقودات نشط — مربع المفقودات",
  },
  {
    id: "demo-zone-3",
    label: "مربع 3",
    name: "شارع وادي حنيفة",
    status: "WORKS",
    note: "أعمال ألياف بصرية — من غدٍ",
  },
  {
    id: "demo-zone-4",
    label: "مربع 4",
    name: "واحة الأمان السكنية",
    status: "SAFE",
    note: "صفر بلاغات حرجة هذا الشهر",
    mine: true,
  },
  {
    id: "demo-zone-5",
    label: "مربع 5",
    name: "مجمع المدارس",
    status: "NOTICE",
    note: "تنبيه سرعة — تفعيل الرادارات الأسبوع القادم",
  },
  {
    id: "demo-zone-6",
    label: "مربع 6",
    name: "حديقة الوادي والممشى",
    status: "SAFE",
    note: "ورشة الري الذكي الثلاثاء",
  },
];

export interface OwnerIncident {
  /** `demo-` prefixed. */
  id: string;
  /** «تنبيه أمان» / «تنبيه مروري». */
  kind: string;
  icon: string;
  title: string;
  body: string;
  when: string;
  /** The affected zone label — «مربع 5». */
  zone: string;
  /** Confirmed-by count. */
  confirmed: number;
}

export const DEMO_INCIDENTS: readonly OwnerIncident[] = [
  {
    id: "demo-incident-fiber",
    kind: "تنبيه مروري",
    icon: "alt_route",
    title: "إغلاق جزئي بمسار شارع وادي السرحان غداً (أعمال ألياف بصرية)",
    body:
      "بين تقاطعي اليمامة ووادي حنيفة من 8:00 صباحاً حتى 4:00 عصراً — مسارات التفافية آمنة عبر شارع الإمام سعود بن عبد العزيز.",
    when: "قبل ساعة",
    zone: "مربع 3",
    confirmed: 84,
  },
  {
    id: "demo-incident-speed",
    kind: "تنبيه أمان",
    icon: "speed",
    title: "تفعيل رادارات السرعة بمحيط مجمع المدارس الأسبوع القادم",
    body:
      "بعد ملاحظات الجيران على السرعات وقت خروج الطلاب — يرجى الالتزام بـ 40 كم/س داخل المربع كاملاً.",
    when: "منذ 3 ساعات",
    zone: "مربع 5",
    confirmed: 126,
  },
  {
    id: "demo-incident-light",
    kind: "تنبيه أمان",
    icon: "lightbulb",
    title: "إنارة حديقة الوادي: إصلاح 3 أعمدة عبر طوارئ أمانة الشمال (940)",
    body:
      "بلاغ الأمانة مسجّل — يُتوقع الإنجاز خلال 48 ساعة. الجيران مدعوون لتأكيد الملاحظة أسفل التنبيه.",
    when: "منذ 6 ساعات",
    zone: "مربع 6",
    confirmed: 41,
  },
];

export type LostFoundStatus = "FOUND" | "STILL_LOST";

export const LOST_FOUND_STATUS_LABELS: Record<LostFoundStatus, string> = {
  FOUND: "تم العثور عليه بنجاح",
  STILL_LOST: "ما زال مفقوداً — نبحث عنه",
};

export interface OwnerLostFoundEntry {
  /** `demo-` prefixed. */
  id: string;
  status: LostFoundStatus;
  title: string;
  body: string;
  where: string;
  when: string;
  icon: string;
  /** Interaction count — prayers / help offers. */
  support: number;
  supportLabel: string;
  contactLabel: string;
}

export const DEMO_LOST_FOUND: readonly OwnerLostFoundEntry[] = [
  {
    id: "demo-lost-white-cat",
    status: "FOUND",
    title: "قط أليف أبيض اللون (طوق جلدي أحمر) — وجد بحديقة مسجد الفرقان",
    body:
      "بصحة ممتازة وفي ضيافة العم أبو طارق لحين وصول صاحبه — يُسلَّم لحراسة البوابة الشمالية في حال عدم التعرف.",
    where: "قرب مسجد الفرقان - مربع 2",
    when: "منذ 5 ساعات",
    icon: "pets",
    support: 27,
    supportLabel: "تفاعل ودعاء بالتيسير",
    contactLabel: "تواصل مع العم أبو طارق",
  },
  {
    id: "demo-lost-keys",
    status: "FOUND",
    title: "حزمة مفاتيح معدنية ملقاة قرب بوابة 2 — لدى غرفة الحراسة",
    body:
      "عليها علامة مميزة (تعليق خشبي). صاحبها يدعيها عند غرفة الحراسة مع وصف دقيق — تسليم بعد التحقق.",
    where: "بوابة 2 - مربع 1",
    when: "منذ يوم",
    icon: "key",
    support: 12,
    supportLabel: "مشاركة",
    contactLabel: "غرفة الحراسة والبوابات",
  },
  {
    id: "demo-lost-toddlers-shoe",
    status: "STILL_LOST",
    title: "حذاء طفل صغير (سن 3 تقريباً) عند مخرج حديقة الوادي",
    body:
      "أسرة جارة تبحث عنه — لونه أزرق بحيلة كرتونية. من وجده يراسل الأسرة عبر رسائل الجيران أو يسلّمه للحراسة.",
    where: "مخرج حديقة الوادي - مربع 6",
    when: "منذ يومين",
    icon: "footprint",
    support: 19,
    supportLabel: "مشاركة ومتابعة",
    contactLabel: "راسل الأسرة عبر المنصة",
  },
];

/** Parse ?zone= (block number 1-6) for the map's incident filter. */
export function parseZoneLabel(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const match = /^مربع\s+(\d+)$/.exec(value.trim());
  return match ? `مربع ${match[1]}` : null;
}

/** The map legend's vocabulary — status → row label. */
export function zoneLegendRow(status: ZoneStatus): { label: string; note: string } {
  return {
    label: ZONE_STATUS_LABELS[status],
    note:
      status === "SAFE"
        ? "لا تنبيهات مفتوحة في المربع"
        : status === "NOTICE"
          ? "تنبيه سلوكي قائم — يُتسغرق متابعته"
          : "أعمال صيانة مجدولة — مسارات بديلة",
  };
}
