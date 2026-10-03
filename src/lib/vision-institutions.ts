/**
 * The place & institution graph's DISPLAY layer (the 2026-10-04 full-vision
 * spec §2 — the vision's skeleton). The backend does not yet serve the
 * Institution entity or membership kinds (backend follow-plan waves G1–G5);
 * until it does, this layer serves the fabric's display world so the
 * navigation, the sections rail, and the resident/expat badge exist as REAL
 * product surfaces — not mockups.
 *
 * THE DISCIPLINE (inherited verbatim from demo-listings.ts /
 * neighborhood-design.ts — the owner's standing seed decision):
 * 1. Display data rides the SUCCESS path only and never masks an outage
 *    of any real read on the same surface.
 * 2. Every display section carries the «بيانات عرض» badge.
 * 3. Display ids carry the `demo-` prefix — they can never parse as
 *    backend UUIDs (isUuid-guarded surfaces stay safe).
 * 4. Display institutions are never presented as backend-verified: the
 *    sections' rosters and the university communities carry the badge and
 *    honest «بانتظار عقد الباك اند» gates on their write affordances.
 * 5. ONE env off-switch (`DEMO_VISION=0|false`) — unset keeps it on.
 */

import type { ReactNode } from "react";

/** `DEMO_VISION=0|false` disables the whole vision display layer. */
export function visionDisplayEnabled(): boolean {
  const raw = process.env.DEMO_VISION?.trim().toLowerCase();
  return raw !== "0" && raw !== "false";
}

/* ── The neighbor kind (spec §2.4) ─────────────────────────────────────── */

/** The membership kind the G1 wave will migrate onto the membership row. */
export type NeighborKind = "RESIDENT" | "EXPAT";

/** The kind's honest badge vocabulary (the spec's single trust formula). */
export const NEIGHBOR_KIND_LABELS: Readonly<Record<NeighborKind, string>> = {
  RESIDENT: "جار مقيم",
  EXPAT: "جار مغترب",
};

/**
 * The kind label as the spec's trust formula renders it:
 * `{الشارة} في {الحي}` — e.g. «جار مغترب في قدسيا البلد».
 */
export function neighborKindLine(kind: NeighborKind, place: string): string {
  return `${NEIGHBOR_KIND_LABELS[kind]} في ${place}`;
}

/* ── Institutions (spec §2.2 — the university is a city within the city) ── */

/** The institution kinds the G2 wave will formalize. */
export type InstitutionKind =
  | "UNIVERSITY"
  | "COLLEGE"
  | "SCHOOL"
  | "INSTITUTE"
  | "MOSQUE";

export const INSTITUTION_KIND_LABELS: Readonly<Record<InstitutionKind, string>> = {
  UNIVERSITY: "جامعة",
  COLLEGE: "كلية",
  SCHOOL: "مدرسة",
  INSTITUTE: "معهد",
  MOSQUE: "مسجد",
};

/** A display institution node of the place graph. */
export interface DisplayInstitution {
  /** `demo-` prefixed — never a UUID. */
  id: string;
  kind: InstitutionKind;
  nameAr: string;
  /** The parent place's display name (city for universities, حي for sections). */
  parentPlaceAr: string;
  /** Community size display (students for colleges, worshippers for mosques…). */
  communitySize: number;
  /** The honest one-line description shown on the picker/board. */
  summaryAr: string;
}

/**
 * The seeded national picker world (spec §9.4 — first-coverage scope is an
 * OWNER gate; this display set is explicitly labeled and self-retiring).
 */
export const DISPLAY_UNIVERSITIES: readonly DisplayInstitution[] = [
  {
    id: "demo-uni-damascus",
    kind: "UNIVERSITY",
    nameAr: "جامعة دمشق",
    parentPlaceAr: "دمشق",
    communitySize: 128000,
    summaryAr: "أقدم جامعات سوريا — كلياتها مجتمعات كاملة بنمط الحارة",
  },
  {
    id: "demo-uni-aleppo",
    kind: "UNIVERSITY",
    nameAr: "جامعة حلب",
    parentPlaceAr: "حلب",
    communitySize: 87000,
    summaryAr: "مجتمع جامعي واسع تغذّيه الكليات الهندسية والطب",
  },
  {
    id: "demo-uni-tishreen",
    kind: "UNIVERSITY",
    nameAr: "جامعة تشرين",
    parentPlaceAr: "اللاذقية",
    communitySize: 61000,
    summaryAr: "جامعة الساحل — كلياتها على أبواب المدينة",
  },
];

/* ── Private sections inside the حي (spec §2.3) ────────────────────────── */

/** A private section of one حي — member-only board, roster, moderator. */
export interface DisplaySection {
  /** `demo-` prefixed — never a UUID. */
  id: string;
  kind: Exclude<InstitutionKind, "UNIVERSITY" | "COLLEGE">;
  nameAr: string;
  /** The حي this section belongs to (display name). */
  hoodAr: string;
  /** Roster size display. */
  members: number;
  /** The board's pinned announcement (the section's own voice). */
  pinnedAr: string;
  /** The section moderator's display name. */
  moderatorAr: string;
}

/** The sections rail's own order (the spec's: المساجد · المدارس · المعاهد). */
export const SECTION_RAIL_ORDER: readonly DisplaySection["kind"][] = [
  "MOSQUE",
  "SCHOOL",
  "INSTITUTE",
];

/** The seeded sections of the Qudsayya hoods (the R__ seed's own world). */
export const DISPLAY_SECTIONS: readonly DisplaySection[] = [
  {
    id: "demo-section-mosque-qudsia",
    kind: "MOSQUE",
    nameAr: "مسجد قدسيا الكبير",
    hoodAr: "قدسيا البلد",
    members: 214,
    pinnedAr: "قيام رمضان يبدأ بعد صلاة العشاء بعشر دقائق — أبواب الجهة الشرقية تُفتح للعائلات",
    moderatorAr: "أبو محمد الحمصي",
  },
  {
    id: "demo-section-school-qudsia",
    kind: "SCHOOL",
    nameAr: "مدرسة قدسيا الرسمية",
    hoodAr: "قدسيا البلد",
    members: 186,
    pinnedAr: "اجتماع أولياء الأمور الخميس 10:00 — صالة المدرسة؛ الحضور يوثّق للمتابعة",
    moderatorAr: "أم سامر",
  },
  {
    id: "demo-section-institute-alwafa",
    kind: "INSTITUTE",
    nameAr: "معهد الوفاء لتعليم الحاسوب",
    hoodAr: "حي القصر",
    members: 92,
    pinnedAr: "دورة بايثون المسائية تبدأ الأسبوع القادم — المقاعد محدودة والتسجيل عند الإدارة",
    moderatorAr: "مهندس رامي",
  },
];

/** Sections of one hood, in the rail's own order. */
export function sectionsOfHood(hoodAr: string): readonly DisplaySection[] {
  return DISPLAY_SECTIONS.filter((s) => s.hoodAr === hoodAr).sort(
    (a, b) =>
      SECTION_RAIL_ORDER.indexOf(a.kind) - SECTION_RAIL_ORDER.indexOf(b.kind),
  );
}

/** The section's own board rows (the member-only display feed). */
export interface SectionBoardRow {
  /** `demo-` prefixed. */
  id: string;
  authorAr: string;
  /** The row's kind chip: إعلان / حاجة / خدمة. */
  kindAr: "إعلان" | "حاجة" | "خدمة";
  bodyAr: string;
  /** Relative-hour display age (the design's own grammar inputs). */
  hoursAgo: number;
}

/** One pinned row + the honest member-gate framing. */
export const SECTION_BOARD_ROWS: readonly SectionBoardRow[] = [
  {
    id: "demo-section-row-quran-circle",
    authorAr: "أبو أحمد",
    kindAr: "خدمة",
    bodyAr: "حلقة تحفيظ للصغار بعد المغرب في مكتبة المسجد — التسجيل مفتوح لأبناء الجيران",
    hoursAgo: 3,
  },
  {
    id: "demo-section-row-desk-donation",
    authorAr: "أم كرم",
    kindAr: "إعلان",
    bodyAr: "أسرة تستقبل مقاعد مدرسية مستعملة بحالة جيدة لأبناء الحارة قبل بدء الفصل",
    hoursAgo: 11,
  },
  {
    id: "demo-section-row-carpool",
    authorAr: "أبو محمد الحمصي",
    kindAr: "حاجة",
    bodyAr: "من يتبرع بترتيب صفارة الوضوء الشرقية؟ السباك جاهز والقطع بسيطة",
    hoursAgo: 26,
  },
];

/** The relative-time grammar (the design's own, measured from the HTML):
 * «الآن»، «منذ ساعتين»، «منذ 4 ساعات»، «منذ يوم»، «منذ يومين»، «منذ N أيام». */
export function sectionRelativeTime(hoursAgo: number): string {
  if (hoursAgo < 1) return "الآن";
  if (hoursAgo === 1) return "منذ ساعة";
  if (hoursAgo === 2) return "منذ ساعتين";
  if (hoursAgo <= 10) return `منذ ${hoursAgo} ساعات`;
  const days = Math.round(hoursAgo / 24);
  if (days === 1) return "منذ يوم";
  if (days === 2) return "منذ يومين";
  return `منذ ${days} أيام`;
}

/** The sections rail's own count line — «N قسمًا خاصًا في الحي». */
export function sectionsRailLine(count: number): string {
  if (count === 0) return "لا أقسام خاصة بعد";
  if (count === 1) return "قسم خاص واحد";
  if (count === 2) return "قسمان خاصان";
  if (count <= 10) return `${count} أقسام خاصة`;
  return `${count} قسمًا خاصًا`;
}

/** Latn-digit Arabic-locale count (the owner's HTML number style). */
export function visionCount(n: number): string {
  return new Intl.NumberFormat("ar-u-nu-latn").format(n);
}

/** The badge's own React-free label (components render it with the badge
 * class; keeping the string here lets unit tests pin the exact words). */
export const DISPLAY_BADGE_LABEL = "بيانات عرض";

/** Type-only re-export so sections pages can type React fragments without
 * importing React runtime pieces through data modules. */
export type DisplayChildren = ReactNode;
