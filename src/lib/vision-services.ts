/**
 * The services Wyzant layer's display world (the 2026-10-04 full-vision
 * spec §5.5 — T2/T3 over the served provider/availability/pricing core).
 *
 * SPLIT OF AUTHORITY: the quote-request MODE PAIRING is the REAL served
 * leads channel surfaced as an explicit alternative to instant-book (T1 —
 * the leads contract already exists); the PACKAGES and the
 * background-check badge are display data (T2/T3 — backend waves pending),
 * carrying the «بيانات عرض» badge and self-retiring when the contracts
 * land.
 */

import { visionDisplayEnabled } from "@/lib/vision-institutions";

/* ── Service packages (display, T2) ────────────────────────────────────── */

/** A session-bundle display row: N sessions, per-session price, progress. */
export interface ServicePackageRow {
  /** `demo-` prefixed. */
  id: string;
  titleAr: string;
  sessionsTotal: number;
  /** Whole riyals per session (display world is whole-riyal). */
  perSessionMajor: number;
  /** The bundle's own promise line. */
  promiseAr: string;
  /** Lesson-material display (Wyzant's own surface). */
  materialAr: string;
}

/** The seeded package world for the Qudsayya providers. */
export const SERVICE_PACKAGES: readonly ServicePackageRow[] = [
  {
    id: "demo-package-english-10",
    titleAr: "حزمة الإنجليزية العامة — ١٠ جلسات",
    sessionsTotal: 10,
    perSessionMajor: 120,
    promiseAr: "خطة تعلم مكتوبة + تقييم مستوى قبل البدء وبعد الحزمة",
    materialAr: "ملفات تمارين PDF بعد كل جلسة + تسجيل الجلسة للمذاكرة",
  },
  {
    id: "demo-package-quran-5",
    titleAr: "حزمة تحسين التلاوة — ٥ جلسات",
    sessionsTotal: 5,
    perSessionMajor: 80,
    promiseAr: "تصحيح مخارج حرفًا حرفًا مع خطة واجد أسبوعية",
    materialAr: "مقطع مراجعة صوتي بعد كل جلسة",
  },
  {
    id: "demo-package-plumbing-3",
    titleAr: "حزمة صيانة منزلية موسمية — ٣ زيارات",
    sessionsTotal: 3,
    perSessionMajor: 150,
    promiseAr: "فحص شامل للسباكة والكهرباء قبل الشتاء مع تقرير مصور",
    materialAr: "تقرير حالة بعد كل زيارة في حسابك",
  },
];

/** The bundle price line: «N جلسات × سعر = إجمالي» (latn digits). */
export function packageTotalLine(p: ServicePackageRow): string {
  const total = p.sessionsTotal * p.perSessionMajor;
  const digits = new Intl.NumberFormat("ar-u-nu-latn").format(total);
  return `${p.sessionsTotal} جلسات × ${p.perSessionMajor} ريال = ${digits} ريالًا للحزمة`;
}

/** The per-session display with honest progress grammar for a buyer who
 * consumed `done` of the bundle's sessions. */
export function packageProgressLine(p: ServicePackageRow, done: number): string {
  const clamped = Math.max(0, Math.min(done, p.sessionsTotal));
  if (clamped === 0) return "لم تبدأ الحزمة بعد";
  if (clamped === p.sessionsTotal) return "الحزمة مكتملة — كل الجلسات منتهية";
  return `أنجزت ${clamped} من ${p.sessionsTotal} جلسات`;
}

/* ── The booking-mode pairing (REAL served contracts, T1) ──────────────── */

/** The pairing's own two-mode vocabulary — the service card's explicit
 * choice (the leads channel is served: the CTA is real). */
export const BOOKING_MODES = {
  instant: {
    labelAr: "حجز فوري",
    hintAr: "اختر فتحة من تقويم التوافر واحجز مباشرة",
  },
  quote: {
    labelAr: "طلب عرض سعر",
    hintAr: "أرسل وصف حاجتك ويرد المزوّد بعرض — بلا التزام",
  },
} as const;

/* ── The background-check badge (display, T3) ──────────────────────────── */

/** The badge's own line — the verification lifecycle reused (the G-wave
 * will formalize the distinct document kind). */
export interface BackgroundBadge {
  verified: boolean;
  /** The badge's own label. */
  labelAr: string;
  /** The honest note under the label. */
  noteAr: string;
}

export const BACKGROUND_BADGE_VERIFIED: BackgroundBadge = {
  verified: true,
  labelAr: "خلفية موثّقة",
  noteAr: "فحص خلفية موثّق للعمل المنزلي — وثيقة معتمدة لدى إدارة المنصة",
};

export const BACKGROUND_BADGE_PENDING: BackgroundBadge = {
  verified: false,
  labelAr: "توثيق الخلفية قيد المراجعة",
  noteAr: "طلب توثيق الخلفية مُقدَّم ولم يكتمل بعد — يظهر الشعار عند إقرار الإدارة",
};

/** The display gate for the whole services layer. */
export function servicesDisplayEnabled(): boolean {
  return visionDisplayEnabled();
}
