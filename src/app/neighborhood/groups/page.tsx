import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { getMyMembership } from "@/lib/api/community";
import { neighborhoodDemoEnabled } from "@/lib/neighborhood-product";
import { DEMO_OWNER_GROUPS, ownerCount } from "@/lib/neighborhood-design";

/**
 * مجموعات الجيران — the specialist groups screen (slice S10, the
 * sidebar's sixth section given its own surface). The design's own
 * rows: the specialist clubs with their member counts, their meeting
 * cadence, and the join affordance — honestly gated (no
 * group-membership write exists yet), never a fake button.
 *
 * All rows are display rows («بيانات عرض», demo ids, never links —
 * discipline rules 1–5, src/lib/neighborhood-design.ts). `noindex` —
 * session-scoped content.
 */
export const metadata: Metadata = {
  title: "مجموعات الجيران — حيّنا",
  description: "نوادي ومجموعات حيّك التخصصية — انضم لجيرانك",
  robots: { index: false },
};

type GroupsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GroupsPage({}: GroupsPageProps) {
  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>مجموعات الجيران</h1>
        <p className="page-note" role="status">
          هذا القسم لأعضاء الحارات — محتواه خاص بالجيران المسجّلين.
        </p>
        <SignInButton callbackURL="/neighborhood/groups" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const membership = await getMyMembership();
  if (!membership.ok) {
    if (membership.status === 404) {
      return (
        <main>
          <h1>مجموعات الجيران</h1>
          <p className="page-note" role="status">
            لم تنتمِ إلى حارة بعد — العضوية هي مفتاح مجموعات الحي.
          </p>
          <p>
            <Link className="button" data-variant="primary" href="/neighborhoods">
              اختر حارتك
            </Link>
          </p>
          <p>
            <Link href="/">الرئيسية</Link>
          </p>
        </main>
      );
    }
    return (
      <main>
        <h1>مجموعات الجيران</h1>
        <p className="page-note" role="status">
          {membership.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(
                membership.problem,
                `تعذّر قراءة عضويتك (رمز ${membership.status}).`,
              )}
        </p>
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const demoOn = neighborhoodDemoEnabled();
  const groups = demoOn ? DEMO_OWNER_GROUPS : [];

  return (
    <main>
      {/* THE PAGE HERO — the groups screen's own banner. */}
      <section className="hy-page-hero" aria-labelledby="groups-title">
        <div className="hy-page-hero-id">
          <span className="hy-service-hero-icon" aria-hidden="true">
            <span className="material-symbols-outlined">groups_3</span>
          </span>
          <div>
            <h1 id="groups-title" className="hy-page-title">
              مجموعات الحي التخصصية
            </h1>
            <p className="hy-page-sub">
              نوادٍ نشطة يجتمع فيها جيرانك حول اهتمام واحد — انضم وشارك
            </p>
          </div>
        </div>
        {groups.length > 0 ? (
          <span className="hy-market-gift">
            <span className="material-symbols-outlined" aria-hidden="true">diversity_3</span>
            {ownerCount(groups.length)} نوادٍ نشطة
          </span>
        ) : null}
      </section>

      <div className="hy-cols">
        <div className="hy-col">
          {groups.length > 0 ? (
            <section className="hy-section" aria-labelledby="board-heading">
              <div className="hy-section-head">
                <h2 id="board-heading" className="hy-section-title">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    diversity_3
                  </span>
                  النوادي النشطة
                </h2>
                <span className="hy-badge-demo">بيانات عرض</span>
              </div>
              <ul className="hy-group-list">
                {groups.map((group) => (
                  /* Display rows, never links (rule 4): no group
                      surfaces exist — a demo id link would 404. */
                  <li key={group.id} className="hy-card hy-group-row">
                    <div className="hy-group-id">
                      <span className="hy-group-icon" data-tone={group.tone}>
                        <span className="material-symbols-outlined">{group.icon}</span>
                      </span>
                      <div>
                        <span className="hy-group-name">{group.name}</span>
                        <span className="hy-group-meta">{group.meta}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="hy-btn hy-btn-soft"
                      disabled
                      title={group.joinGate}
                    >
                      <span className="material-symbols-outlined">person_add</span>
                      انضمام
                    </button>
                  </li>
                ))}
              </ul>
              <p className="hy-directory-note">
                <strong>القناة القادمة:</strong> عندما يُفعَّل عقد عضويات المجموعات لدى الباك اند
                يصبح زر الانضمام كتابة حقيقية — عضوية واحدة لكل جار، بعددها الحقيقي.
              </p>
            </section>
          ) : null}
        </div>

        <div className="hy-col">
          {/* The honest gate's explanation — the join discipline. */}
          <section className="hy-card" aria-labelledby="join-heading">
            <h2 id="join-heading" className="hy-widget-title">
              <span className="material-symbols-outlined" aria-hidden="true">
                lock_open
              </span>
              لماذا زر الانضمام مُعطّل؟
            </h2>
            <p className="hy-screen-sub">
              عقد عضويات المجموعات لم يُبنِ بعد لدى الباك اند. نُظهر لك النوادي الحقيقية
              التي يعمل بها الحي، وننتظر العقد لنفعّل الانضمام — لا نعدك بزر يبدو
              حيًا وهو صامت.
            </p>
            <Link className="hy-btn hy-btn-primary" href="/neighborhood">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              خلاصة الحي
            </Link>
          </section>
        </div>
      </div>

      <p>
        <Link href="/neighborhood">خلاصة الحي</Link>
      </p>
    </main>
  );
}
