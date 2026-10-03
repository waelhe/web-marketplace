/**
 * The favorites contract (W3 — yelp-level plan §5/G19, #492): the
 * authenticated /me saved-listings surface. Pure types and vocabularies
 * only, client-safe by construction (no next/headers transit; the same
 * separation discipline as follows-contract vs follows).
 *
 * Every shape here is measured from the backend source
 * (ListingFavoritesService.ListingFavoriteView, marketplace-catalog):
 * - `GET /api/v1/me/favorites` — the caller's live favorites,
 *   newest-saved first (the sort FORCED server-side on the complete
 *   (createdAt, id) key — the D-N5 total-order law), each row composed
 *   with the listing's CURRENT truth (a saved listing that later
 *   expires, pauses or is withdrawn by its provider stays saved and
 *   shows the truth — one batch resolution for the whole page).
 * - `POST /api/v1/me/favorites/{listingId}` — 201 + the view. The
 *   backend's own gate order teaches: the listing resolves FIRST (404
 *   unknown listing, before any write), then the live pair answers 409
 *   (the partial unique key's read form — the backend's own words name
 *   the withdraw channel).
 * - `DELETE /api/v1/me/favorites/{listingId}` — 204; the house soft
 *   delete (the row stays for the audit trail, the reads stop returning
 *   it). A pair with no live favorite answers the honest 404. A re-save
 *   is a FRESH row, never a resurrection.
 *
 * ID SPACES: the pair key is the LISTING id (the public detail page's
 * own key) — both the save and the withdraw address it directly, unlike
 * the follows surface whose withdraw carries the follow ROW id. The
 * `listingId` member is therefore both the row's listing key and the
 * write path's parameter.
 */

/**
 * ListingFavoriteView — one saved row as the /me surface renders it.
 * The title/priceCents/currency/status block is the listing's CURRENT
 * truth (the batch-composed read); a null block is the honest
 * unknown-status floor (structurally present per the FK + soft-delete
 * discipline — rendered as the unknown state, never invented).
 */
export interface ListingFavoriteView {
  listingId: string;
  savedAt: string;
  title: string | null;
  priceCents: number | null;
  currency: string | null;
  status: string | null;
}

/** The my-favorites list page size — one page covers a member's saved set. */
export const MY_FAVORITES_PAGE_SIZE = 20;

/**
 * The listing status vocabulary the favorites list can carry — the
 * backend's own ProviderListingStatus enum (the listing's CURRENT
 * truth, whatever it became AFTER the save). The Arabic labels are the
 * display map for the honest status badge; an unseen value renders as
 * the raw enum name (never a silent blank).
 */
export const LISTING_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشط",
  PAUSED: "موقوف",
  EXPIRED: "منتهي",
  DRAFT: "مسودة",
  ARCHIVED: "مؤرشف",
};

/** The save write's re-auth note — the action's honest anonymous gate. */
export const FAVORITE_REAUTH_MESSAGE =
  "سجّل الدخول أولًا — حفظ الإعلانات لعملاء المنصة المسجّلين.";

/** The min-rating filter's honest bounds — the backend's own gate
 *  (SearchCriteria: minRating must be within [1, 5], a 400 before any
 *  query). The select's fixed options are safe by construction; the
 *  parse boundary re-checks the pair for URL-arrived values. */
export const MIN_RATING_FLOOR = 1;
export const MIN_RATING_CEILING = 5;
