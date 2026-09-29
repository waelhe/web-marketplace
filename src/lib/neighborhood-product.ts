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

/* ─────────────────────────────────────────────────────────────────────────────
 * The S8 product-defined contracts — the rich feed layer (owner-supplied
 * design spec 2026-09-29: «خلاصة الحي ومنشورات الجيران» — the composer with
 * quick types, the featured zone (pinned alert + interactive poll), and the
 * smart sidebar widgets). Same discipline, same kill-switch.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The neighborhood weather contract — the sidebar's «طقس الحي» widget:
 * current conditions + air quality + walkability (the design's three
 * signals in one read). ONE read the product defines; the backend serves
 * it later (the natural seam: an external weather provider behind a
 * per-location aggregate).
 */
export interface NeighborhoodWeather {
  /** Current temperature, °C. */
  temperature: number;
  /** The condition's display label, Arabic. */
  condition: string;
  /** Air Quality Index 0–200 (the display bands: 0–50 جيدة…). */
  airQuality: number;
  /** The walkability verdict's display label, Arabic. */
  walkability: string;
}

/**
 * The neighborhood poll contract — the featured zone's interactive
 * استطلاع رأي: ONE question, 2–5 options, each with a live vote count.
 * The product defines the shape; the backend serves it later (the
 * natural seam: a poll entity + one-vote-per-member write). The demo
 * poll's voting is a display interaction (client state only — never a
 * fake write), honestly labeled.
 */
export interface NeighborhoodPoll {
  /** `demo-` prefixed in the display dataset — never a UUID. */
  id: string;
  /** The question, Arabic. */
  question: string;
  /** The poll's author display (a committee/role label, not a person). */
  author: string;
  options: ReadonlyArray<{
    /** The option's display label. */
    label: string;
    /** Votes so far (the demo seed counts). */
    votes: number;
  }>;
  /** Creation timestamp (ISO). */
  createdAt: string;
}

/**
 * The pinned alert contract — the featured zone's «تنبيه عاجل ومثبت»:
 * urgent neighborhood news the committee pins above the feed, with the
 * «أكد العلم» acknowledgment the design specifies (a display
 * interaction — the real ack write joins when the backend serves the
 * contract).
 */
export interface NeighborhoodAlert {
  /** `demo-` prefixed in the display dataset — never a UUID. */
  id: string;
  /** The alert's headline. */
  title: string;
  /** The body — what, where, the alternative arrangements. */
  body: string;
  /** The issuing body's display label. */
  issuer: string;
  /** Urgency band for the accent color (the product's own vocabulary). */
  severity: "HIGH" | "MEDIUM";
  /** «أكد العلم» acknowledgment count so far (demo seed). */
  acknowledgments: number;
  /** Creation timestamp (ISO). */
  createdAt: string;
}

/**
 * The neighborhood group contract — the sidebar's «مجموعات الجيران»:
 * the interest clubs a real neighborhood runs (the design's widget).
 * Display chips only — never links (no group surfaces exist yet).
 */
export interface NeighborhoodGroup {
  /** `demo-` prefixed in the display dataset — never a UUID. */
  id: string;
  /** The group's display name, Arabic. */
  name: string;
  /** One-line description — display copy. */
  description: string;
  /** Member count (demo seed). */
  members: number;
}

/** The weather display dataset — ONE row, one disclosure. */
export const DEMO_WEATHER: readonly NeighborhoodWeather[] = [
  { temperature: 32, condition: "مشمس", airQuality: 42, walkability: "ممتازة للمشي مساءً" },
];

/** The poll display dataset — ONE active poll (the featured zone). */
export const DEMO_POLL: readonly NeighborhoodPoll[] = [
  {
    id: "demo-poll-mamsha-hours",
    question: "ما المواعيد الأنسب لفتح الممشى المظلل خلال الصيف؟",
    author: "لجنة تطوير الحي",
    options: [
      { label: "الفجر — ٥:٣٠ إلى ٨:٠٠", votes: 9 },
      { label: "المساء — ٥:٠٠ إلى ٨:٣٠", votes: 11 },
      { label: "كلا الفترتين", votes: 5 },
    ],
    createdAt: "2026-09-27T18:00:00Z",
  },
];

/** The pinned-alert display dataset — ONE active alert (the featured zone). */
export const DEMO_ALERTS: readonly NeighborhoodAlert[] = [
  {
    id: "demo-alert-fiber-maintenance",
    title: "أعمال صيانة وتمديد ألياف بصرية — شارع النخيل والحارة الشرقية",
    body:
      "ستبدأ لجنة تطوير الحي أعمال تمديد الألياف البصرية صباح الخميس وتستمر ثلاثة أيام. " +
      "مسارات بديلة للمشاة: ممر المسجد ثم شارع الحديقة. عربات النقل الصغير تعمل من البوابة الجنوبية. " +
      "قد يقتصر ضغط المياه نهارًا في الحارة الشرقية يومي الخميس والجمعة.",
    issuer: "لجنة تطوير الحي",
    severity: "HIGH",
    acknowledgments: 47,
    createdAt: "2026-09-28T07:30:00Z",
  },
];

/** The groups display dataset — the clubs a real neighborhood runs. */
export const DEMO_GROUPS: readonly NeighborhoodGroup[] = [
  {
    id: "demo-group-walking",
    name: "نادي المشي المسائي",
    description: "جولة يومية بعد المغرب من بوابة الحديقة",
    members: 34,
  },
  {
    id: "demo-group-garden",
    name: "فريق تشجير الحي",
    description: "العناية بأشجار الشوارع والمسطحات",
    members: 18,
  },
  {
    id: "demo-group-mothers",
    name: "صباح الأمهات",
    description: "لقاء أسبوعي وأنشطة للأطفال الصغار",
    members: 22,
  },
  {
    id: "demo-group-diy",
    name: "ورشة أدوات الجيران",
    description: "أدوات مشتركة ومساعدة في الصيانة المنزلية",
    members: 12,
  },
];

/** The sidebar's groups display size (one compact column widget). */
export const GROUPS_WIDGET_SIZE = 4;

/** Total votes across a poll's options (the percentage denominators). */
export function pollTotalVotes(poll: NeighborhoodPoll): number {
  return poll.options.reduce((sum, option) => sum + option.votes, 0);
}

/**
 * The AQI display band — the walkability/air-quality verdicts the
 * product renders (its own vocabulary, bounded like the rating band).
 */
export function airQualityBand(aqi: number): string {
  if (aqi <= 50) return "جيدة";
  if (aqi <= 100) return "متوسطة";
  return "ضعيفة";
}
