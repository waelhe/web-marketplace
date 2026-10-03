import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/dal";
import { Badge } from "@/components/ui/badge";
import {
  DISPLAY_SECTIONS,
  DISPLAY_UNIVERSITIES,
  INSTITUTION_KIND_LABELS,
  visionCount,
  visionDisplayEnabled,
} from "@/lib/vision-institutions";

/**
 * بوابة الرسم البياني — the full-vision spec §5.7's graph door: the
 * admin management surface for the place & institution tree (cities /
 * أحياء / universities / colleges / private sections). The G4 backend
 * wave (admin tree operations + the national seed dataset) is pending;
 * this door renders the display graph with honest gates: what exists
 * today is the READ view of the display world + the real geo tree's own
 * note; write operations state their pending contract plainly.
 *
 * The admin shell's own session gate covers the whole /admin wing.
 */

type GraphPageProps = PageProps<"/admin/graph">;

export const metadata: Metadata = {
  title: "الرسم البياني للمكان",
  robots: { index: false },
};

export default async function AdminGraphPage(_: GraphPageProps) {
  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>الرسم البياني للمكان</h1>
        <p className="page-note">
          لوحة الإدارة تتطلب تسجيل الدخول. <Link href="/">تسجيل الدخول</Link>
        </p>
      </main>
    );
  }

  const on = visionDisplayEnabled();

  return (
    <main>
      <h1>الرسم البياني للمكان والمؤسسات</h1>
      <p className="page-note">
        إدارة شجرة المكان الوطنية — المدن والأحياء، والجامعات بكلياتها،
        والأقسام الخاصة داخل كل حارة. عمليات الإنشاء والتحرير تُفتح بعقد G4
        لدى الباك اند (أدوات شجرة المكان + بذرة التغطية الوطنية — نطاق
        التغطية الأولى قرار مالك مسجّل).
      </p>

      <section className="card" aria-labelledby="graph-geo-heading">
        <h2 id="graph-geo-heading">شجرة المكان الجغرافية</h2>
        <p className="page-note">
          إدارة العقد الجغرافية (إنشاء/تحرير/حذف مدينة أو حي) مخدومة اليوم
          بعقدها الحي في باب «الفهرس والقواعد» — عمليات الإداري الثلاث على
          شجرة geo بشروطها الأصلية (404 للأصل المجهول، 409 لتصادم المعرّف).
        </p>
        <p>
          <Link className="button" href="/admin/catalog">
            إدارة الشجرة الجغرافية (الفهرس والقواعد)
          </Link>
        </p>
        <p className="page-note" role="status">
          التغطية الوطنية (بذرة المدن والأحياء) توسعة بيانات على العقد القائم —
          نطاق أول تغطية قرار مالك مسجّل، ويزرعها فريق الباك اند بأمره.
        </p>
      </section>

      {on ? (
        <>
          <section className="card" aria-labelledby="graph-uni-heading">
            <h2 id="graph-uni-heading">
              الجامعات والكليات <Badge tone="new">بيانات عرض</Badge>
            </h2>
            <ul className="hy-uni-list">
              {DISPLAY_UNIVERSITIES.map((u) => (
                <li key={u.id}>
                  <span>
                    {INSTITUTION_KIND_LABELS[u.kind]} {u.nameAr} — {u.parentPlaceAr}
                  </span>
                  <span className="hy-section-count">{visionCount(u.communitySize)}</span>
                </li>
              ))}
            </ul>
            <p className="page-note">
              كل جامعة تُفرّع إلى كليات، وكل كلية مجتمع كامل بنمط الحارة
              (عضوية، تغذية، مجموعات، فعاليات، استطلاعات) — إنشاء الكليات
              وتوثيق العضويات الطلابية باب موجة G2.
            </p>
          </section>

          <section className="card" aria-labelledby="graph-sections-heading">
            <h2 id="graph-sections-heading">
              الأقسام الخاصة داخل الأحياء <Badge tone="new">بيانات عرض</Badge>
            </h2>
            <ul className="hy-uni-list">
              {DISPLAY_SECTIONS.map((s) => (
                <li key={s.id}>
                  <span>
                    {INSTITUTION_KIND_LABELS[s.kind]} {s.nameAr} — {s.hoodAr}
                  </span>
                  <span className="hy-section-count">{visionCount(s.members)} عضوًا</span>
                </li>
              ))}
            </ul>
            <p className="page-note">
              قواعد الأقسام الخاصة (من ينشئ قسمًا ومعيار إقرار مشرفه) قرار مالك
              مسجّل في الميثاق §7/10 — يُبنى عليها عقد G3.
            </p>
          </section>
        </>
      ) : null}

      <p>
        <Link href="/admin">لوحة التحكم</Link>
      </p>
    </main>
  );
}
