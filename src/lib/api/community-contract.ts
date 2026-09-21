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
