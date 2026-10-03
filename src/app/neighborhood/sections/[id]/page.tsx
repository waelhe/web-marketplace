import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/dal";
import { getMyMembership } from "@/lib/api/community";
import { findGeoNodeById } from "@/lib/api/geo";
import {
  DISPLAY_SECTIONS,
  INSTITUTION_KIND_LABELS,
  SECTION_BOARD_ROWS,
  sectionRelativeTime,
  visionCount,
  visionDisplayEnabled,
} from "@/lib/vision-institutions";

/**
 * لوحة القسم الخاص — the full-vision spec §2.3: each حي institution
 * (mosque/school/institute) carries a member-only board with a roster
 * and a moderator. The G3 backend wave (rosters, join requests,
 * moderator approval, noindex-gated boards) is pending; this surface
 * renders the display world honestly:
 *
 * - The board's rows are display data (badged on the page).
 * - The membership gate is the REAL neighborhood membership the caller
 *   holds (the section belongs to their hood or it does not) — the
 *   honest scoping available TODAY, stated in the page's own words:
 *   the section's own roster joins with the G3 contract.
 * - `demo-` is the route's parse boundary: any other id answers the
 *   honest 404.
 */

type SectionPageProps = PageProps<"/neighborhood/sections/[id]">;

export async function generateMetadata({
  params,
}: SectionPageProps): Promise<Metadata> {
  const { id } = await params;
  const section = id.startsWith("demo-")
    ? DISPLAY_SECTIONS.find((s) => s.id === id) ?? null
    : null;
  if (!section) return { title: "قسم غير موجود", robots: { index: false } };
  return {
    title: `${section.nameAr} — قسم الحي الخاص`,
    // Private-section surface: the spec's own rule — noindex on the
    // member-only boards (the same rule the neighborhood wing carries).
    robots: { index: false },
  };
}

export default async function SectionBoardPage({ params }: SectionPageProps) {
  const { id } = await params;
  const section = id.startsWith("demo-")
    ? DISPLAY_SECTIONS.find((s) => s.id === id) ?? null
    : null;
  if (!section || !visionDisplayEnabled()) notFound();

  // The REAL scoping available today: the caller's own neighborhood
  // membership vs the section's hood. A member of another hood (or an
  // anonymous caller) meets the honest cross-neighborhood gate — the
  // same 403-shaped UX the wing's boards teach.
  const session = await getSession();
  const membership = session ? await getMyMembership() : null;
  const membershipOk = membership?.ok ? membership.data : null;
  const hoodName = membershipOk
    ? (await findGeoNodeById(membershipOk.locationId))?.nameAr ?? null
    : null;
  const inThisHood = hoodName !== null && hoodName === section.hoodAr;

  return (
    <main className="hy-main-section">
      <p className="listing-crumb">
        <Link href="/neighborhood">حيّنا</Link> / <span>الأقسام الخاصة</span> /{" "}
        <span>{section.nameAr}</span>
      </p>

      <header className="hy-section-head">
        <h1>{section.nameAr}</h1>
        <p className="page-note">
          {INSTITUTION_KIND_LABELS[section.kind]} في {section.hoodAr} —{" "}
          {visionCount(section.members)} عضوًا في القسم · مشرف القسم:{" "}
          {section.moderatorAr}
        </p>
        <p className="page-note">
          <span className="hy-badge-demo">بيانات عرض</span> — لوحة القسم الخاصة
          تُفتح بعضوية القسم نفسها عند هبوط عقد G3 لدى الباك اند.
        </p>
      </header>

      {inThisHood ? (
        <>
          <section className="card" aria-label={`إعلان ${section.nameAr} المثبت`}>
            <h2>مثبّت القسم</h2>
            <p className="listing-description">{section.pinnedAr}</p>
            <p className="page-note">— {section.moderatorAr}، مشرف القسم</p>
          </section>

          <section className="card" aria-labelledby="section-board-heading">
            <h2 id="section-board-heading">لوحة القسم</h2>
            <p className="page-note">
              إعلانات وحاجات وخدمات أعضاء القسم — مرئية لأعضاء القسم حصرًا.
            </p>
            <ul className="section-board">
              {SECTION_BOARD_ROWS.map((row) => (
                <li key={row.id} className="section-board-row">
                  <div className="section-row-head">
                    <span className="hy-pill">{row.kindAr}</span>
                    <span className="page-note">
                      {row.authorAr} · {sectionRelativeTime(row.hoursAgo)}
                    </span>
                  </div>
                  <p className="listing-description">{row.bodyAr}</p>
                </li>
              ))}
            </ul>
            <p className="page-note" role="status">
              النشر في لوحة القسم يُفتح مع عضوية القسم — طلب العضوية باب موجة
              G3 لدى الباك اند.
            </p>
          </section>
        </>
      ) : (
        <section className="card" aria-labelledby="section-gate-heading">
          <h2 id="section-gate-heading">لوحة القسم لأعضائه</h2>
          <p className="page-note" role="status">
            {session
              ? `هذا القسم خاص بأبناء ${section.hoodAr} — عضويتك المسجّلة في حيّ آخر، ولوحة القسم تُقرأ لأعضاء القسم حصرًا.`
              : "لوحة القسم تُقرأ بعضوية الحي ثم عضوية القسم — سجّل دخولك والتحق بحيّك أولًا."}
          </p>
          {!session ? (
            <p>
              <Link className="button" href="/neighborhoods">
                انضم إلى حيّك
              </Link>
            </p>
          ) : null}
        </section>
      )}

      <p>
        <Link href="/neighborhood">خلاصة الحي</Link>
      </p>
    </main>
  );
}
