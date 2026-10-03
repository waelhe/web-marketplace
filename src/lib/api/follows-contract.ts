/**
 * The follows contract (W4 — yelp-level plan §5/G21, #494): the
 * authenticated /me follows surface. Pure types and vocabularies only,
 * client-safe by construction (no next/headers transit; the same
 * separation discipline as provider-contract vs provider).
 *
 * Every shape here is measured from the backend source (the
 * ProviderFollow* family, marketplace-identity):
 * - `POST /api/v1/me/follows` `{providerId}` — 201 + the follow row
 *   composed with the provider's current public identity. The backend's
 *   own gates teach the caller: 400 following YOUR OWN provider profile,
 *   409 a live duplicate, 404 an unknown profile. Rate-limited (429
 *   RL-001 — a follow is a cheap write).
 * - `GET /api/v1/me/follows` — the caller's follows, newest first
 *   (deterministic order), paged, each row composed with the followed
 *   provider's current public identity (ONE batch resolution for the
 *   whole page — the W1 findAllByIds N+1 rule).
 * - `DELETE /api/v1/me/follows/{id}` — 204; a foreign id answers 404
 *   ("it is not in your list"); the pair is freed, so re-following the
 *   same provider is legal.
 *
 * ID SPACES (the ProviderFollowView contract): `providerId` is the
 * provider PROFILE id (the public page's own key — the client's
 * navigation link), resolved back from the stored user id at read time;
 * the provider's user id never appears. The honest fallback for a row
 * the batch lookup cannot see (a soft-deleted profile) is the null pair
 * — the row itself stays (the member's own record), rendered without
 * its link.
 */

/**
 * ProviderFollowView — one follow row as the /me surface renders it.
 * The null `providerId`/`providerDisplayName` pair is the honest
 * soft-deleted-profile fallback (the row stays, its link does not).
 */
export interface ProviderFollowView {
  id: string;
  providerId: string | null;
  providerDisplayName: string | null;
  createdAt: string;
}

/** The my-follows list page size — the backend's own default (20). */
export const MY_FOLLOWS_PAGE_SIZE = 20;

/**
 * The follow write's teaching words — the backend's own gates rendered
 * in the action's honest-failure surface (problem+json stays verbatim
 * through problemMessage; these are only the re-auth note and the
 * anonymous gate's honest UI shape).
 */
export const FOLLOW_REAUTH_MESSAGE =
  "سجّل الدخول أولًا — متابعة المزوّدين لعملاء المنصة المسجّلين.";
