/**
 * The community CONTRACT — measured types and vocabulary, pure and
 * import-safe from BOTH sides of the server/client boundary (client
 * forms and server pages share one source; the data CHANNEL stays in
 * src/lib/api/community.ts, which rides server-only imports).
 *
 * Sources (measured from backend source + live API, 2026-09-22):
 * NeighborhoodMembershipView / NeighborhoodPostView records and the
 * PostCategory enum (L43-widened vocabulary) in marketplace-community;
 * controller bounds: title ≤ 200, body ≤ 2000.
 */

/** L41 membership read model (NeighborhoodMembershipView). */
export interface NeighborhoodMembership {
  id: string;
  userId: string;
  locationId: string;
  /**
   * The enum name — measured from the verification lifecycle (PR #483):
   * UNVERIFIED | PENDING | VERIFIED | REJECTED. The pre-lifecycle
   * SELF_DECLARED (V77 migrates every existing member to UNVERIFIED)
   * renders through the transitional fallback below — never an
   * invented «موثق».
   */
  verificationState: string;
  memberSince: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The MEASURED verification vocabulary (NeighborhoodVerificationState
 * — the residency-trust lifecycle, D-N3). The values and their gates are
 * the backend's own; the Arabic labels are this surface's rendering of
 * them. SELF_DECLARED rides the array as the TRANSITIONAL pre-V77 state
 * (an honest render for a not-yet-migrated membership — softened to
 * «عضو», exactly the gap-analysis discipline).
 */
export const VERIFICATION_STATES = [
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "SELF_DECLARED",
] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

/** Arabic UI labels of the MEASURED verification vocabulary. */
export const VERIFICATION_LABELS: Record<VerificationState, string> = {
  UNVERIFIED: "عضو",
  PENDING: "توثيق قيد المراجعة",
  VERIFIED: "جار موثق",
  REJECTED: "عضو",
  SELF_DECLARED: "عضو",
};

/**
 * The chip tone per verification state — «جار موثق» earns the design's
 * verified look (tertiary); PENDING is primary (in flight); everything
 * else renders neutral (the honest member floor).
 */
export const VERIFICATION_TONES: Record<VerificationState, string> = {
  VERIFIED: "tertiary",
  PENDING: "primary",
  UNVERIFIED: "neutral",
  REJECTED: "neutral",
  SELF_DECLARED: "neutral",
};

/**
 * The honest one-line explanation under the badge — what the state means
 * for the member themselves (the write block lives on REJECTED only,
 * D-N3's own split).
 */
export const VERIFICATION_NOTES: Record<VerificationState, string> = {
  UNVERIFIED: "عضوية سارية — يمكنك طلب توثيق السكن من مسؤولي الحي.",
  PENDING: "طلبك عند مسؤولي الحي — ستظهر حالته هنا عند البتّ.",
  VERIFIED: "سكنك موثّق بمراجعة إدارية — علامة الثقة كاملة.",
  REJECTED: "طلب توثيق سكنك مرفوض — النشر والتعليق معطّلان، والقراءة كاملة.",
  SELF_DECLARED: "حالة توثيق قديمة تُحدّث مع الترحيلة — كل الوصول كما هو.",
};

/**
 * Parse any backend verificationState into the render vocabulary —
 * unknown values (a future state this surface has not learned) render
 * the honest «عضو» floor, never an invented label.
 */
export function parseVerificationState(raw: string): VerificationState {
  return (VERIFICATION_STATES as readonly string[]).includes(raw)
    ? (raw as VerificationState)
    : "UNVERIFIED";
}

/** The states that may ASK for a review (the request contract's own gate). */
export const VERIFICATION_REQUESTABLE: readonly VerificationState[] = [
  "UNVERIFIED",
  "REJECTED",
  "SELF_DECLARED",
];

/** L42 feed read model (NeighborhoodPostView) — widened by L47 with
 *  the two reaction facts the feed read carries (measured 2026-09-30:
 *  reactionsCount + reactedByMe ride every row of the paged body), then
 *  by L48 with the post's photos (media rides the same row — one
 *  grouped read, no second call). */
export interface NeighborhoodPost {
  id: string;
  /** Opaque by contract — display layers must not invent an author identity. */
  authorId: string;
  locationId: string;
  category: PostCategory;
  title: string;
  body: string;
  status: string;
  /** L47: the post's LIVE thanks — the grouped count over the page's ids. */
  reactionsCount: number;
  /**
   * L47: the caller's own LIVE voice on this post — the filled heart
   * renders from the contract alone, no second read.
   */
  reactedByMe: boolean;
  /**
   * L48: the post's photos, in display order (position 1-based). Empty
   * for every photo-less post — an honest list, never undefined. The
   * URLs are time-limited presigned GETs computed for THIS feed read
   * (the media module owns storage; no object key crosses the
   * contract).
   */
  media: PostMedia[];
  createdAt: string;
  updatedAt: string;
}

/**
 * L48 media read model (PostMediaView) — one photo of a post as the
 * feed row carries it. thumbUrl follows the backend's L28 contract:
 * null until background processing has run (fall back to url), equal
 * to url when the original is its own thumbnail by design.
 */
export interface PostMedia {
  mediaId: string;
  url: string;
  thumbUrl: string | null;
  contentType: string;
  position: number;
}

/**
 * L47 reaction read model (PostReactionView) — the member stays an
 * opaque UUID by the same projection discipline as the comments.
 */
export interface PostReaction {
  id: string;
  postId: string;
  memberId: string;
  createdAt: string;
  updatedAt: string;
}

/** The measured L43-widened category vocabulary (PostCategory enum). */
export const POST_CATEGORIES = ["GENERAL", "CLASSIFIED", "LOST_FOUND", "RECOMMENDATION"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

/** Arabic UI labels of the MEASURED PostCategory vocabulary. */
export const CATEGORY_LABELS: Record<PostCategory, string> = {
  GENERAL: "عام",
  CLASSIFIED: "مُبوب",
  LOST_FOUND: "مفقودات",
  RECOMMENDATION: "توصيات",
};

/**
 * The category chip's tone — the design's four colored vocabularies
 * (the S10 owner design's own mapping; shared by every wing surface
 * that renders a category chip — the feed, and N1's member profile).
 */
export const CATEGORY_TONES: Record<PostCategory, string> = {
  RECOMMENDATION: "tertiary",
  LOST_FOUND: "primary",
  CLASSIFIED: "secondary",
  GENERAL: "neutral",
};

/** The my-neighborhood feed page size. */
export const FEED_PAGE_SIZE = 10;

/** First comments page size per post (the on-demand disclosure's read). */
export const COMMENTS_PAGE_SIZE = 20;

/**
 * L42 comment read model (PostCommentView) — the author stays an
 * opaque UUID by the same projection discipline as the posts.
 */
export interface PostComment {
  id: string;
  postId: string;
  /** Opaque by contract — no invented identity display. */
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The MEASURED report vocabulary (L45 — ContentReportController's own
 * type gates): targetType POST|COMMENT, reason SPAM|HARASSMENT|
 * INAPPROPRIATE|OTHER. The backend parses both BEFORE any service call
 * and answers the house 400 listing the valid values for anything else.
 */
/**
 * W1 (V86 — content_reports.target_type widened by REVIEW, the two-phase
 * NOT VALID → VALIDATE pair): a REVIEW target reports the review itself
 * (the flag surface — the backend's own error vocabulary now reads
 * "POST, COMMENT, REVIEW").
 */
export const REPORT_TARGET_TYPES = ["POST", "COMMENT", "REVIEW"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = ["SPAM", "HARASSMENT", "INAPPROPRIATE", "OTHER"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Arabic UI labels of the MEASURED report vocabulary. */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "محتوى مزعج/إعلاني",
  HARASSMENT: "تحرّش أو استهداف",
  INAPPROPRIATE: "محتوى غير لائق",
  OTHER: "سبب آخر",
};

/** The backend's own authored-note bound (ContentReportController). */
export const MAX_REPORT_NOTE_LENGTH = 2000;

/** L45 report read model (ContentReportView) — echoed on creation. */
export interface ContentReportView {
  id: string;
  reporterId: string;
  targetType: ReportTargetType | string;
  targetId: string;
  reason: ReportReason | string;
  status: string;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// L49 — the neighborhood events board + RSVP (gap #4, served 2026-10-01)
// ---------------------------------------------------------------------------

/**
 * The event category vocabulary — the product's own five filter chips,
 * measured verbatim from the backend's EventCategory enum (V83's CHECK
 * pins the same membership on the SQL side; src/lib/neighborhood-events.ts
 * carried these chips as display data since S9 — one vocabulary, zero
 * translation).
 */
export const EVENT_CATEGORIES = [
  "SPORTS_FAMILY",
  "VOLUNTEER",
  "SOCIAL",
  "MARKET",
  "WORKSHOP",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** Arabic UI labels of the event category vocabulary. */
export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  SPORTS_FAMILY: "رياضية وعائلية",
  VOLUNTEER: "تطوعية",
  SOCIAL: "اجتماعية",
  MARKET: "سوق ومقايضة",
  WORKSHOP: "ورش تعليمية",
};

/**
 * The registration vocabulary — the design's own three states. The
 * registration and the capacity are ONE rule: OPEN carries no capacity
 * (the whole neighborhood may come), the two seated states carry a
 * strictly positive one the RSVP gate counts seats against.
 */
export const EVENT_REGISTRATIONS = ["OPEN", "LIMITED_SEATS", "TABLE_RESERVATION"] as const;
export type EventRegistration = (typeof EVENT_REGISTRATIONS)[number];

/** Arabic UI labels of the registration states. */
export const EVENT_REGISTRATION_LABELS: Record<EventRegistration, string> = {
  OPEN: "مفتوح للجميع",
  LIMITED_SEATS: "مقاعد محدودة",
  TABLE_RESERVATION: "حجز طاولات",
};

/** The events board's page size — the feed's own discipline. */
export const EVENTS_PAGE_SIZE = 20;

/**
 * L49 board read model (NeighborhoodEventView): the stored facts plus
 * the two caller-scoped attendance facts — attending (the live seat
 * count, grouped over the page's ids) and rsvpedByMe (the caller's own
 * live seat, so the joined state renders from the contract alone, no
 * second read — the L47 reaction shape verbatim).
 */
export interface NeighborhoodEvent {
  id: string;
  /** Opaque by contract — display layers must not invent an organizer identity. */
  authorId: string;
  locationId: string;
  category: EventCategory;
  title: string;
  description: string;
  /** ISO timestamp — strictly in the future at creation (the board is forward-looking). */
  startsAt: string;
  /** ISO timestamp — optional (a gathering may be open-ended). */
  endsAt: string | null;
  /** The in-neighborhood meeting spot's display label, as the organizer wrote it. */
  locationLabel: string;
  /** The organizing body's display label. */
  organizerLabel: string;
  /** Seats (or tables) — null = OPEN to all. */
  capacity: number | null;
  registration: EventRegistration;
  /**
   * The weekly-initiative flag — a read-side fact the create contract
   * does NOT accept (surfacing a curation write is a documented product
   * decision); the board's «مبادرة الأسبوع» takes the first featured
   * row and renders nothing when none is.
   */
  featured: boolean;
  /** The live seat count on this event (the same number for every reader). */
  attending: number;
  /** The caller's own live seat — the joined state's one per-reader fact. */
  rsvpedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The RSVP write's echo (EventRsvpView) — the stored facts, nothing else. */
export interface EventRsvp {
  id: string;
  eventId: string;
  memberId: string;
  createdAt: string;
  updatedAt: string;
}

/** The organize input — the backend's own type gates are the bounds. */
export interface CreateNeighborhoodEventInput {
  locationId: string;
  category: EventCategory;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string;
  organizerLabel: string;
  capacity: number | null;
  registration: EventRegistration;
}

/** The backend's own authored bounds (NeighborhoodEventController). */
export const MAX_EVENT_TITLE_LENGTH = 200;
export const MAX_EVENT_DESCRIPTION_LENGTH = 2000;
export const MAX_EVENT_LABEL_LENGTH = 200;
export const MAX_EVENT_CAPACITY = 500;
