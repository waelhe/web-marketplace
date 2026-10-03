import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getSession } from "@/lib/dal";
import { backendGet } from "@/lib/api/server";
import { problemMessage } from "@/lib/problem";
import { formatDate } from "@/lib/format";
import { getMyBackendUser } from "@/lib/api/inbox";
import {
  getMyWrittenReviews,
  getReviewsOfConsumer,
} from "@/lib/api/reputation";
import { getMyFollows } from "@/lib/api/follows";
import { MY_FOLLOWS_PAGE_SIZE } from "@/lib/api/follows-contract";
import { getMyFavorites } from "@/lib/api/favorites";
import {
  LISTING_STATUS_LABELS,
  MY_FAVORITES_PAGE_SIZE,
  type ListingFavoriteView,
} from "@/lib/api/favorites-contract";
import {
  MY_REVIEWS_PAGE_SIZE,
  REVIEW_DIRECTION_LABELS,
  REVIEW_MODERATION_LABELS,
  REVIEW_ORIGIN_LABELS,
  type ReviewView,
} from "@/lib/api/reputation-contract";
import { getMyMembership } from "@/lib/api/community";
import { findGeoNodeById } from "@/lib/api/geo";
import {
  NEIGHBOR_KIND_LABELS,
  DISPLAY_BADGE_LABEL,
  visionDisplayEnabled,
} from "@/lib/vision-institutions";
import { SignOutButton } from "../auth-buttons";
import { ReviewEditForm, UnfollowForm, UnsaveFavoriteForm } from "./forms";

// بطاقة الجار — the full-vision spec §4: ONE profile with FOUR floors
// (identity / composed reputation / presence / privacy & sessions), each
// floor's reads REAL where the backend serves them (the me chain, the
// reviews pair, follows, favorites, the membership) and badged display
// where the P1 wave's contracts are pending (the marketplace rating, the
// business recommendations, the session manager). The floors are <section>
// landmarks — one screen, one card, scrollable like the owner's HTML.
//
// The DAL discipline is unchanged: session + DIRECT backend fetch (no
// self HTTP round trip — official BFF guide). The /me payload shape is
// intentionally loose until the typed API layer lands with the OpenAPI
// export (recorded debt: exact DTO types come from the backend contract).
type MePayload = Record<string, unknown>;

// Private surface — `noindex` is the honest robots contract for
// session-scoped content (the one private route that was missing it;
// surfaced by the production battery's anonymous-privacy probe, 2026-09-22).
export const metadata: Metadata = {
  title: "بطاقة الجار",
  description: "جلستك الحالية وبيانات حسابك من الخادم",
  robots: { index: false },
};

/** One review row — rating, comment, reply, direction label, dates.
 *  Optional children (the edit form) render INSIDE the row's <li>: a
 *  <ul> may only hold <li> directly, and the row IS the <li> — wrapping
 *  it in another <li> is invalid HTML and fails hydration (measured in
 *  the dev log, fixed 2026-09-25). */
function ReviewRow({
  review,
  children,
}: {
  review: ReviewView;
  children?: ReactNode;
}) {
  return (
    <li className="card post-card">
      <p className="listing-meta">
        <span className="listing-category" aria-label="التقييم">
          {new Intl.NumberFormat("ar").format(review.rating)} / ٥
        </span>
        <span>·</span>
        {/* W1: the origin badge — «موثّقة» rides the BOOKING origin,
            «عامة» the ORGANIC one (the V85 provenance column). */}
        <span className="listing-category">
          {REVIEW_ORIGIN_LABELS[review.origin] ?? review.origin}
        </span>
        <span>·</span>
        <span>{REVIEW_DIRECTION_LABELS[review.direction] ?? review.direction}</span>
        <span>·</span>
        <span>{formatDate(review.createdAt)}</span>
      </p>
      {/* W1: the honest moderation state — the author sees every state
          on his own reviewer read (the visibility gate's author path);
          a non-PUBLISHED badge is the queue's own words, never a guess.
          helpfulCount rides the row too (the votes the review earned). */}
      {review.moderationStatus && review.moderationStatus !== "PUBLISHED" ? (
        <p className="page-note" role="status">
          حالة المراجعة: {REVIEW_MODERATION_LABELS[review.moderationStatus] ?? review.moderationStatus}
          {review.moderationStatus === "PENDING_REVIEW"
            ? " — ستظهر للجميع بعد موافقة الإشراف"
            : " — أخفاها الإشراف فلا تظهر للجميع"}
        </p>
      ) : null}
      {review.comment ? <p className="post-body">{review.comment}</p> : null}
      {review.reply ? (
        <p className="listing-meta">
          <span>ردّ المزوّد:</span>
          <span> </span>
          <span>{review.reply}</span>
        </p>
      ) : null}
      {typeof review.helpfulCount === "number" && review.helpfulCount > 0 ? (
        <p className="listing-meta">
          <span>وسمها {new Intl.NumberFormat("ar").format(review.helpfulCount)} من الجيران بمفيدة</span>
        </p>
      ) : null}
      {children}
    </li>
  );
}

/**
 * W3 (G19): one saved-listing row — the listing's CURRENT truth rendered
 * honestly. The detail read 404s on INACTIVE/ARCHIVED listings (the
 * public surface's own contract), so ONLY an ACTIVE listing carries its
 * link — a later-expired or withdrawn save stays saved (the relation is
 * the member's own data) and renders its title plain with the status
 * badge; a null title block is the honest unknown-state floor. The
 * price arrives in CENTS (the view's own contract — unlike the browse
 * summary's major units) and renders through formatPrice's twin with
 * the major-unit conversion.
 */
function FavoriteRow({ favorite }: { favorite: ListingFavoriteView }) {
  const statusLabel =
    favorite.status !== null
      ? (LISTING_STATUS_LABELS[favorite.status] ?? favorite.status)
      : null;
  const active = favorite.status === "ACTIVE";
  return (
    <p className="listing-meta">
      {favorite.title !== null && active ? (
        <Link href={`/listings/${favorite.listingId}`}>{favorite.title}</Link>
      ) : favorite.title !== null ? (
        <span aria-label={`إعلان ${statusLabel ?? "غير متاح"}`}>{favorite.title}</span>
      ) : (
        <span aria-label="إعلان غير معروف">إعلان لم يعد قابلاً للقراءة</span>
      )}
      {statusLabel !== null ? (
        <>
          <span>·</span>
          <span>{statusLabel}</span>
        </>
      ) : null}
      {typeof favorite.priceCents === "number" && favorite.currency !== null ? (
        <>
          <span>·</span>
          <span>
            {new Intl.NumberFormat("ar", {
              style: "currency",
              currency: favorite.currency,
              maximumFractionDigits: 2,
            }).format(favorite.priceCents / 100)}
          </span>
        </>
      ) : null}
      <span>·</span>
      <span>حفظته {formatDate(favorite.savedAt)}</span>
    </p>
  );
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>بطاقة الجار</h1>
        <p className="page-note">
          لم تسجّل الدخول. <Link href="/">تسجيل الدخول</Link>
        </p>
      </main>
    );
  }

  const [me, backendUser, membership] = await Promise.all([
    backendGet<MePayload>("/api/v1/users/me"),
    // The ME chain — the caller's backend user id powers the two
    // my-reviews reads (never a client-sent id).
    getMyBackendUser(),
    // The full-vision identity floor: the membership (the caller's own
    // neighborhood + kind badge world) — the same read the wing rides.
    getMyMembership(),
  ]);
  const membershipOk = membership?.ok ? membership.data : null;
  const hoodName = membershipOk
    ? (await findGeoNodeById(membershipOk.locationId))?.nameAr ?? null
    : null;
  const visionOn = visionDisplayEnabled();

  // The my-reviews pair keyed by the caller's own user id (batch-2
  // spec §3): what I wrote rides the SESSION-authenticated author path
  // (N7-b: the W1 visibility gate serves the author every moderation
  // state — the anonymous read would filter his own pending/hidden rows
  // out, measured live on Noor's profile); what providers said about me
  // stays the public trust view (its contract has no author path).
  // W4 (G21): the follows read joins the same me-chain family — the
  // caller's follow rows, newest first (the follow's own "me" owner
  // key — the client never sends an id).
  // W3 (G19): the favorites read joins the same family — the caller's
  // saved listings, newest-saved first, each row carrying the listing's
  // CURRENT truth (a later-expired save stays saved and shows it).
  const [written, aboutMe, follows, favorites] = backendUser.ok
    ? await Promise.all([
        getMyWrittenReviews(backendUser.id, 0, MY_REVIEWS_PAGE_SIZE),
        getReviewsOfConsumer(backendUser.id, 0, MY_REVIEWS_PAGE_SIZE),
        getMyFollows(0, MY_FOLLOWS_PAGE_SIZE),
        getMyFavorites(0, MY_FAVORITES_PAGE_SIZE),
      ])
    : [null, null, null, null];

  // The reputation composition's REAL cells (the P1 wave composes these
  // server-side later; today the page derives them from the same reads
  // it already holds — no extra roundtrip, no invented numbers).
  const writtenCount = written?.ok ? written.data.totalElements : null;
  const receivedCount = aboutMe?.ok ? aboutMe.data.totalElements : null;

  return (
    <main>
      <h1>بطاقة الجار</h1>

      {/* ══ الطابق الأول — الهوية (spec §4.1) ══════════════════════ */}
      <section className="card" aria-labelledby="identity-heading">
        <h2 id="identity-heading">الهوية</h2>
        <p className="listing-meta">
          <span>{session.name || session.email}</span>
          {hoodName ? (
            <>
              <span>·</span>
              <span>
                {membershipOk?.verificationState === "VERIFIED"
                  ? `جار مقيم موثّق في ${hoodName}`
                  : `جار في ${hoodName}`}
              </span>
            </>
          ) : (
            <>
              <span>·</span>
              <span>بلا عضوية حي بعد — انضم من «حيّنا»</span>
            </>
          )}
        </p>
        {me.ok ? (
          <>
            {typeof me.data.createdAt === "string" && me.data.createdAt ? (
              <p className="page-note">عضو منذ {formatDate(me.data.createdAt)}</p>
            ) : null}
            {/* GDPR Art. 20 (batch-2 spec §3): the data-subject export —
                a native browser download served by the app's own
                authenticated endpoint (the backend's document verbatim). */}
            <p>
              <a className="button" href="/api/account/export" download>
                صدّر بياناتي (JSON)
              </a>
            </p>
          </>
        ) : me.status === 0 ? (
          <p className="page-note" role="status">
            الخادم الخلفي غير متاح حالياً — لا يمكن قراءة البيانات الآن.
          </p>
        ) : (
          <p className="page-note" role="status">
            {problemMessage(me.problem, `تعذّر قراءة البيانات (رمز ${me.status}).`)}
          </p>
        )}
        {visionOn ? (
          <p className="page-note">
            شارة نوع الجار ({NEIGHBOR_KIND_LABELS.RESIDENT} /{" "}
            {NEIGHBOR_KIND_LABELS.EXPAT}) تُفعّل بعضوية الحي عند هبوط عقد G1
            لدى الباك اند — {DISPLAY_BADGE_LABEL}.
          </p>
        ) : null}
      </section>

      <div className="profile-floors">
        {/* ══ الطابق الثاني — السمعة المركبة (spec §4.2) ═══════════ */}
        <section className="card" aria-labelledby="reputation-heading">
          <h2 id="reputation-heading">السمعة المركبة</h2>
          <p className="page-note">
            سمعتك من كل أعمدة المنصة — كمزوّد، وكزبون، وجار. الخلايا المقيسة من
            قراءاتك الحقيقية؛ وخلايا المتجر والتوصيات بانتظار عقودها.
          </p>
          <ul className="reputation-grid">
            {writtenCount !== null ? (
              <li className="reputation-cell">
                <span className="reputation-value">
                  {new Intl.NumberFormat("ar").format(writtenCount)}
                </span>
                <span>مراجعة كتبتها</span>
              </li>
            ) : null}
            {receivedCount !== null ? (
              <li className="reputation-cell">
                <span className="reputation-value">
                  {new Intl.NumberFormat("ar").format(receivedCount)}
                </span>
                <span>مراجعة قالها المزوّدون عنك</span>
              </li>
            ) : null}
            {visionOn ? (
              <>
                <li className="reputation-cell">
                  <span className="reputation-value">—</span>
                  <span>تقييمك كبائع متجر (عقد M5) {DISPLAY_BADGE_LABEL}</span>
                </li>
                <li className="reputation-cell">
                  <span className="reputation-value">—</span>
                  <span>«شكرًا» استلمتها (عقد P1) {DISPLAY_BADGE_LABEL}</span>
                </li>
                <li className="reputation-cell">
                  <span className="reputation-value">—</span>
                  <span>وسام نشاط المجتمع (عقد P1) {DISPLAY_BADGE_LABEL}</span>
                </li>
              </>
            ) : null}
          </ul>
        </section>

        {/* ══ الطابق الثالث — الحضور (spec §4.3) ═══════════════════ */}
        <section className="card" aria-labelledby="presence-heading">
          <h2 id="presence-heading">الحضور</h2>
          <p className="page-note">
            أعضوياتك ونشاطك في نسيج المنصة: الحي والجامعة والأقسام والمجموعات،
            والفعاليات ومعروضات الحراج.
          </p>
          <ul className="reputation-grid">
            <li className="reputation-cell">
              <span className="reputation-value">
                {hoodName ? "١" : "٠"}
              </span>
              <span>
                {hoodName ? (
                  <Link href="/neighborhood">عضوية {hoodName}</Link>
                ) : (
                  <Link href="/neighborhoods">انضم إلى حيّك</Link>
                )}
              </span>
            </li>
            <li className="reputation-cell">
              <span className="reputation-value">
                {follows?.ok ? new Intl.NumberFormat("ar").format(follows.data.totalElements) : "—"}
              </span>
              <span>مزوّدًا تتابعه (تنبيه عند إعلانهم الجديد)</span>
            </li>
            <li className="reputation-cell">
              <span className="reputation-value">
                {favorites?.ok ? new Intl.NumberFormat("ar").format(favorites.data.totalElements) : "—"}
              </span>
              <span>إعلانًا محفوظًا</span>
            </li>
            <li className="reputation-cell">
              <span className="reputation-value">→</span>
              <span>
                <Link href="/neighborhood/events">فعاليات الحي</Link> ·{" "}
                <Link href="/neighborhood/market">معروضاتي في الحراج</Link> ·{" "}
                <Link href="/neighborhood/groups">مجموعاتي</Link>
              </span>
            </li>
          </ul>
        </section>

        {/* ══ الطابق الرابع — الخصوصية والجلسات (spec §4.4) ═══════ */}
        <section className="card" aria-labelledby="privacy-heading">
          <h2 id="privacy-heading">الخصوصية والجلسات</h2>
          <ul className="reputation-grid">
            <li className="reputation-cell">
              <span className="reputation-value">✓</span>
              <span>
                <Link href="/neighborhood/notifications">مصفوفة الإشعارات</Link> —
                مفعّلة بعقدها الحي
              </span>
            </li>
            <li className="reputation-cell">
              <span className="reputation-value">✓</span>
              <span>تصدير البيانات (GDPR) — زر الطابق الأول</span>
            </li>
            <li className="reputation-cell">
              <span className="reputation-value">…</span>
              <span>
                مدير الجلسات والأجهزة (عقد S3) — «لا انتهاء بلا تسجيل خروج»
                {visionOn ? ` ${DISPLAY_BADGE_LABEL}` : ""}
              </span>
            </li>
          </ul>
          <p className="page-note">
            معيار الجلسة العالمي: الجلسة لا تنتهي بلا خروج صريح — إبطال الجلسات
            عن بعد يُفتح بموجة S3 لدى الباك اند.
          </p>
        </section>
      </div>

      {/* ══ المراجعات بالتفصيل (الطابق الثاني مفتوحًا) ══════════════ */}
      {written !== null ? (
        <section className="card" aria-labelledby="written-reviews-heading">
          <h2 id="written-reviews-heading">مراجعاتي</h2>
          {written.ok ? (
            written.data.content.length === 0 ? (
              <p className="page-note" role="status">
                لم تكتب مراجعات بعد — تُفتح بعد إتمام حجوزاتك.
              </p>
            ) : (
              <ul className="feed-list">
                {written.data.content.map((review) => (
                  <ReviewRow key={review.id} review={review}>
                    {/* The edit (PUT /reviews/{id}) — the original reviewer
                        alone; the backend's own 403 is the authority. */}
                    <ReviewEditForm
                      reviewId={review.id}
                      rating={review.rating}
                      comment={review.comment}
                    />
                  </ReviewRow>
                ))}
              </ul>
            )
          ) : (
            <p className="page-note" role="status">
              {problemMessage(written.problem, `تعذّرت قراءة مراجعاتك (رمز ${written.status}).`)}
            </p>
          )}
        </section>
      ) : (
        <p className="page-note" role="status">
          تعذّر تحديد هوية حسابك الخلفي — سجّل الدخول من جديد لقراءة مراجعاتك.
        </p>
      )}

      {aboutMe !== null ? (
        <section className="card" aria-labelledby="about-me-reviews-heading">
          <h2 id="about-me-reviews-heading">ما قاله المزوّدون عني</h2>
          {aboutMe.ok ? (
            aboutMe.data.content.length === 0 ? (
              <p className="page-note" role="status">
                لا مراجعات عنك بعد — تظهر هنا بعد حجوزاتك المكتملة.
              </p>
            ) : (
              <ul className="feed-list">
                {aboutMe.data.content.map((review) => (
                  <ReviewRow key={review.id} review={review} />
                ))}
              </ul>
            )
          ) : (
            <p className="page-note" role="status">
              {problemMessage(
                aboutMe.problem,
                `تعذّرت قراءة المراجعات عنك (رمز ${aboutMe.status}).`,
              )}
            </p>
          )}
        </section>
      ) : null}

      {follows !== null ? (
        <section className="card" aria-labelledby="my-follows-heading">
          <h2 id="my-follows-heading">متابعاتي</h2>
          {follows.ok ? (
            follows.data.content.length === 0 ? (
              <p className="page-note" role="status">
                لا تتابع مزوّداً بعد — زر «تابع هذا المزوّد» في صفحة أي مزوّد
                يطلق تنبيهاً واحداً عند إعلانه إعلاناً جديداً.
              </p>
            ) : (
              <>
                <p className="page-note">
                  {new Intl.NumberFormat("ar").format(follows.data.totalElements)} متابعة —
                  الأحدث أولاً
                </p>
                <ul className="feed-list">
                  {follows.data.content.map((follow) => (
                    <li key={follow.id} className="card post-card">
                      <p className="listing-meta">
                        {follow.providerId && follow.providerDisplayName ? (
                          <Link href={`/providers/${follow.providerId}`}>
                            {follow.providerDisplayName}
                          </Link>
                        ) : (
                          <span aria-label="مزوّد محذوف">مزوّد لم يعد متاحاً</span>
                        )}
                        <span>·</span>
                        <span>تتابعه منذ {formatDate(follow.createdAt)}</span>
                      </p>
                      <UnfollowForm followId={follow.id} />
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : (
            <p className="page-note" role="status">
              {problemMessage(
                follows.problem,
                `تعذّرت قراءة متابعاتك (رمز ${follows.status}).`,
              )}
            </p>
          )}
        </section>
      ) : null}

      {favorites !== null ? (
        <section className="card" aria-labelledby="my-favorites-heading">
          <h2 id="my-favorites-heading">مفضلاتي</h2>
          {favorites.ok ? (
            favorites.data.content.length === 0 ? (
              <p className="page-note" role="status">
                لا إعلانات محفوظة بعد — زر «احفظ لاحقاً» في صفحة أي إعلان
                يجمعها هنا لتعود إليها.
              </p>
            ) : (
              <>
                <p className="page-note">
                  {new Intl.NumberFormat("ar").format(favorites.data.totalElements)} إعلاناً
                  محفوظاً — الأحدث حفظاً أولاً
                </p>
                <ul className="feed-list">
                  {favorites.data.content.map((favorite) => (
                    <li key={favorite.listingId} className="card post-card">
                      <FavoriteRow favorite={favorite} />
                      <UnsaveFavoriteForm listingId={favorite.listingId} />
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : (
            <p className="page-note" role="status">
              {problemMessage(
                favorites.problem,
                `تعذّرت قراءة مفضلاتك (رمز ${favorites.status}).`,
              )}
            </p>
          )}
        </section>
      ) : null}

      <p>
        <Link href="/">الرئيسية</Link> <SignOutButton />
      </p>
    </main>
  );
}
