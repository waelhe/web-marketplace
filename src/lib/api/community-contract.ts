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
  /** The enum name — measured: SELF_DECLARED (verification is a pending product gate). */
  verificationState: string;
  memberSince: string;
  createdAt: string;
  updatedAt: string;
}

/** L42 feed read model (NeighborhoodPostView). */
export interface NeighborhoodPost {
  id: string;
  /** Opaque by contract — display layers must not invent an author identity. */
  authorId: string;
  locationId: string;
  category: PostCategory;
  title: string;
  body: string;
  status: string;
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
export const REPORT_TARGET_TYPES = ["POST", "COMMENT"] as const;
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
