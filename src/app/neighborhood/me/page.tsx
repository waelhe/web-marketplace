import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { problemMessage } from "@/lib/problem";
import { getMyBackendUser, getMyUnreadNotificationCount } from "@/lib/api/inbox";
import { getMyMembership, getMyFeed } from "@/lib/api/community";
import { VerificationCard } from "../forms";
import { CATEGORY_LABELS, CATEGORY_TONES, parseVerificationState, type PostCategory } from "@/lib/api/community-contract";
import { findGeoNodeById } from "@/lib/api/geo";

/**
 * ملف الجار — the wing's member profile (slice N1, the Nextdoor-2026
 * completeness wave): the REAL identity + membership + own-posts
 * projection, rendered in the owner's حيّنا design.
 *
 * Honesty rules this page end to end:
 * - The display name/email ride the session (the BFF's own identity
 *   seam) — the backend id renders as an opaque tail only.
 * - The membership's verificationState renders as MEASURED through the
 *   verification lifecycle's own vocabulary (VERIFIED = «جار موثق»،
 *   PENDING = «توثيق قيد المراجعة»، the honest «عضو» floor otherwise)
 *   — gap #3 in docs/nextdoor-gap-analysis.md is now a served contract
 *   (PR #483); the review request rides the same card.
 * - «منشوراتي» is THIS page of the neighborhood feed filtered to the
 *   caller's authorId — the backend exposes no author-scoped read
 *   (gap #12); the honest note says exactly that.
 * - The messages entry links to /inbox — the backend exposes no
 *   conversation-list read (gap #11, measured, ARCHITECTURE §10).
 *
 * `noindex` is the honest robots contract for session-scoped content.
 */

export const metadata: Metadata = {
  title: "ملف الجار — حيّنا",
  robots: { index: false },
};

type MePageProps = PageProps<"/neighborhood/me">;

/** Parse ?page= (1-based for humans) into the backend's 0-based page. */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return parsed - 1;
}

export default async function MePage({ searchParams }: MePageProps) {
  const sp = await searchParams;
  const page = parsePage(sp?.page);

  const session = await getSession();
  if (!session) {
    return (
      <main>
        <section className="hy-card" aria-labelledby="me-heading">
          <h1 id="me-heading" className="hy-section-title">
            <span className="material-symbols-outlined" aria-hidden="true">person</span>
            ملف الجار
          </h1>
          <p className="hy-state" role="status">
            الملف للأعضاء المسجّلين — سجّل الدخول لرؤية هويتك وعضويتك ونشاطك في حيّك.
          </p>
          <SignInButton callbackURL="/neighborhood/me" />
        </section>
      </main>
    );
  }

  const [me, membership, unread] = await Promise.all([
    getMyBackendUser(),
    getMyMembership(),
    getMyUnreadNotificationCount(),
  ]);

  const myBackendId = me.ok ? me.id : null;
  const membershipOk = membership?.ok ? membership.data : null;
  const hood = membershipOk ? await findGeoNodeById(membershipOk.locationId) : null;

  // «منشوراتي»: this feed page filtered to my authorId (the honest
  // projection of the only read the backend exposes — gap #12).
  const feed = membershipOk ? await getMyFeed(page, 20, null) : null;
  const myPosts =
    feed?.ok && myBackendId
      ? feed.data.content.filter((post) => post.authorId === myBackendId)
      : [];

  const initials =
    session.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join(" ") ?? "؟";

  /** The pager's href — the inbox's own convention: human pages are
   * 1-based and page 1 is the CLEAN canonical URL. */
  const pageHref = (humanPage: number): string =>
    humanPage > 1 ? `/neighborhood/me?page=${humanPage}` : "/neighborhood/me";

  return (
    <main>
      {/* ---- Identity: the session's own seams, honestly ---- */}
      <section className="hy-card" aria-labelledby="identity-heading">
        <div className="hy-real-head">
          <h1 id="identity-heading" className="hy-section-title">
            <span className="material-symbols-outlined" aria-hidden="true">person</span>
            ملف الجار
          </h1>
          {unread.ok && unread.data.unreadCount > 0 ? (
            <span className="hy-real-count">
              {new Intl.NumberFormat("ar").format(unread.data.unreadCount)} إشعارًا غير مقروء
            </span>
          ) : null}
        </div>
        <div className="hy-me-page">
          <span className="hy-avatar hy-avatar-lg" data-tone="primary" aria-hidden="true">
            {initials}
          </span>
          <div className="hy-me-page-id">
            <p className="hy-me-page-name">{session.name ?? session.email}</p>
            {session.name ? <p className="hy-me-page-sub" dir="ltr">{session.email}</p> : null}
            <p className="hy-me-page-sub">
              {me.ok ? (
                <>
                  معرّفك الخلفي: <code dir="ltr">{myBackendId?.slice(0, 8)}…</code>
                </>
              ) : (
                "تعذّر قراءة هويتك الخلفية — لا تُنشر منشوراتك في هذه الجولة."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ---- Membership: the measured projection ---- */}
      <section className="hy-card" aria-labelledby="membership-heading">
        <h2 id="membership-heading" className="hy-section-title">
          <span className="material-symbols-outlined" aria-hidden="true">location_on</span>
          عضوية الحي
        </h2>
        {membershipOk ? (
          <div className="hy-me-grid">
            <p className="hy-me-fact">
              <strong>حارتك:</strong> {hood?.nameAr ?? membershipOk.locationId}
            </p>
            <p className="hy-me-fact">
              <strong>عضو منذ:</strong> {formatDate(membershipOk.memberSince)}
            </p>
            <VerificationCard
              state={parseVerificationState(membershipOk.verificationState)}
            />
          </div>
        ) : membership && !membership.ok && membership.unauthenticated ? (
          <p className="hy-state" role="status">
            جلستك مع الباك اند منتهية — سجّل الدخول من جديد.
          </p>
        ) : (
          <p className="hy-state" role="status">
            لست عضوًا في أي حي بعد — انضم من خلاصة الحي لتُنشر منشوراتك وترى جيرانك.
          </p>
        )}
      </section>

      {/* ---- My posts: this feed page's honest projection ---- */}
      {membershipOk ? (
        <section className="hy-card" aria-labelledby="myposts-heading">
          <div className="hy-real-head">
            <h2 id="myposts-heading" className="hy-section-title">
              <span className="material-symbols-outlined" aria-hidden="true">forum</span>
              منشوراتي
            </h2>
            {feed?.ok ? (
              <span className="hy-real-count">
                {new Intl.NumberFormat("ar").format(myPosts.length)} في هذه الصفحة
              </span>
            ) : null}
          </div>
          {feed?.ok ? (
            myPosts.length === 0 ? (
              <p className="hy-empty" role="status">
                لا منشورات لك في هذه الصفحة من تغذية الحي — انشر من صندوق المشاركة في
                الخلاصة وسيظهر هنا.
              </p>
            ) : (
              <>
                <p className="hy-state">
                  هذه صفحة التغذية الحالية مُصفّاة على مؤلّفها أنت — الخادم لا يوفر قراءة
                  «منشوراتي» مفهرسة بعد (فجوة عقد موثقة).
                </p>
                <ul className="hy-real-list">
                  {myPosts.map((post) => (
                    <li key={post.id} className="hy-real-item">
                      <header className="hy-post-head">
                        <div className="hy-post-id">
                          <span
                            className="hy-post-chip"
                            data-tone={CATEGORY_TONES[post.category as PostCategory] ?? "general"}
                          >
                            {CATEGORY_LABELS[post.category as PostCategory] ?? post.category}
                          </span>
                        </div>
                        <time className="hy-post-meta" dateTime={post.createdAt}>
                          {formatDate(post.createdAt)}
                        </time>
                      </header>
                      <h3 className="hy-real-title">{post.title}</h3>
                      <p className="hy-real-body">{post.body}</p>
                    </li>
                  ))}
                </ul>
                <nav className="hy-pager" aria-label="تصفّح منشوراتي">
                  {feed.data.pageNumber > 0 ? (
                    <Link className="hy-btn hy-btn-soft" href={pageHref(feed.data.pageNumber)}>
                      الصفحة السابقة
                    </Link>
                  ) : null}
                  {!feed.data.last ? (
                    <Link className="hy-btn hy-btn-soft" href={pageHref(feed.data.pageNumber + 2)}>
                      الصفحة التالية
                    </Link>
                  ) : null}
                </nav>
              </>
            )
          ) : feed && !feed.ok ? (
            <p className="hy-state" role="status">
              {feed.unauthenticated
                ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
                : problemMessage(feed.problem, `تعذّر قراءة التغذية (رمز ${feed.status}).`)}
            </p>
          ) : (
            <p className="hy-state" role="status">
              تعذّر قراءة التغذية.
            </p>
          )}
        </section>
      ) : null}

      {/* ---- Quick surfaces: the real ones, honestly entered ---- */}
      <section className="hy-card" aria-labelledby="links-heading">
        <h2 id="links-heading" className="hy-section-title">
          <span className="material-symbols-outlined" aria-hidden="true">account_tree</span>
          مداخلك
        </h2>
        <div className="hy-real-actions hy-me-links">
          <Link href="/neighborhood/notifications" className="hy-btn hy-btn-soft">
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
            الإشعارات وتفضيلاتها
          </Link>
          <Link href="/inbox" className="hy-btn hy-btn-soft">
            <span className="material-symbols-outlined" aria-hidden="true">chat</span>
            الرسائل وطلبات التواصل
          </Link>
          <Link href="/profile" className="hy-btn hy-btn-soft">
            <span className="material-symbols-outlined" aria-hidden="true">badge</span>
            ملف السوق (مزوّد/بحث)
          </Link>
        </div>
        <p className="hy-state">
          تُفتح محادثات الجيران من منشورات الخلاصة («راسل الجار») — لا توجد اليوم قائمة قراءة
          «محادثاتي» على الخادم (فجوة عقد موثقة).
        </p>
      </section>

      <p className="hy-state">
        <Link href="/neighborhood" className="hy-btn hy-btn-soft">
          العودة إلى خلاصة الحي
        </Link>
      </p>
    </main>
  );
}
