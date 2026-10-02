import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import {
  getMyMembership,
  getMyNeighborhoodGroups,
} from "@/lib/api/community";
import { GROUPS_PAGE_SIZE } from "@/lib/api/community-contract";
import { ownerCount } from "@/lib/neighborhood-design";
import { groupIcon, groupMeta, groupTone } from "@/lib/neighborhood-groups";
import { GroupMembershipButton } from "./group-membership-button";

/**
 * مجموعات الجيران — the specialist groups screen (slice S10, the
 * sidebar's sixth section given its own surface). The design's own
 * rows: the specialist clubs with their member counts, their meeting
 * cadence, and the join affordance.
 *
 * N9 (gap #6 served, 2026-10-02): the board went REAL — the backend's
 * own GET /api/v1/neighborhood/groups (L51), membership-scoped, in the
 * hood's historical order, every row carrying the LIVE members count
 * («بعددها الحقيقي» — the display dataset's 85/120/45 retired with
 * its «بيانات عرض» badge) and joinedByMe. The ONE adaptation seam:
 * the page derives the design's display facts (the icon from the
 * club's own name, the tone from the row's position, the meta line's
 * composition) — zero visual change from the design's own rows. The
 * join/leave toggle is the wave's one real write (the RSVP button's
 * own shape). The sidebar's groups WIDGET stays display-layer (the
 * events widget's own discipline — the screen is the product's
 * surface). `noindex` — session-scoped content.
 */
export const metadata: Metadata = {
  title: "مجموعات الجيران — حيّنا",
  description: "نوادي ومجموعات حيّك التخصصية — انضم لجيرانك",
  robots: { index: false },
};

export default async function GroupsPage() {
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

  // THE SERVED BOARD (N9): the backend's own read — every row carries
  // the LIVE member count and the caller's own membership fact.
  const board = await getMyNeighborhoodGroups(0, GROUPS_PAGE_SIZE);
  const groups = board.ok ? board.data.content : [];
  const boardError = board.ok
    ? null
    : board.unauthenticated
      ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
      : problemMessage(
          board.problem,
          `تعذّرت قراءة مجموعات حارتك (رمز ${board.status}).`,
        );

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
          {boardError ? (
            <p className="hy-state" role="status">
              {boardError}
            </p>
          ) : groups.length > 0 ? (
            <section className="hy-section" aria-labelledby="board-heading">
              <div className="hy-section-head">
                <h2 id="board-heading" className="hy-section-title">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    diversity_3
                  </span>
                  النوادي النشطة
                </h2>
              </div>
              <ul className="hy-group-list">
                {groups.map((group, index) => (
                  /* Served rows — real ids, the club's own card; the
                      design's display facts derive here (the ONE
                      adaptation seam): the icon from the name, the tone
                      from the position, the meta line's composition. */
                  <li key={group.id} className="hy-card hy-group-row">
                    <div className="hy-group-id">
                      <span className="hy-group-icon" data-tone={groupTone(index)}>
                        <span className="material-symbols-outlined">
                          {groupIcon(group.name)}
                        </span>
                      </span>
                      <div>
                        <span className="hy-group-name">{group.name}</span>
                        <span className="hy-group-meta">
                          {groupMeta(group.members, group.description)}
                        </span>
                      </div>
                    </div>
                    {/* The real membership toggle — the served fact gates
                        the button's own state, refresh() re-renders the
                        count and the state from the read. */}
                    <GroupMembershipButton
                      groupId={group.id}
                      joinedByMe={group.joinedByMe}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="hy-section" aria-labelledby="board-heading">
              <div className="hy-section-head">
                <h2 id="board-heading" className="hy-section-title">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    diversity_3
                  </span>
                  النوادي النشطة
                </h2>
              </div>
              <p className="hy-empty" role="status">
                لا نوادٍ في حارتك بعد — النوادي تُؤسَّس بقرار المنتج القادم داخل
                نافذة المجموعات المفتوحة.
              </p>
            </section>
          )}
        </div>

        <div className="hy-col">
          {/* The honest membership discipline — the join's own rules. */}
          <section className="hy-card" aria-labelledby="join-heading">
            <h2 id="join-heading" className="hy-widget-title">
              <span className="material-symbols-outlined" aria-hidden="true">
                group_add
              </span>
              كيف تعمل العضوية؟
            </h2>
            <p className="hy-screen-sub">
              عضوية واحدة لكل جار في كل مجموعة — انضم متى شئت وغادر متى شئت،
              والعدد الذي تراه هو عدد الجيران الأحياء فعلًا.
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
