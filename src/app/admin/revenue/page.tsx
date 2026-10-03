import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/dal";
import { Badge } from "@/components/ui/badge";
import { getPaymentSummaries } from "@/lib/api/admin";
import { problemMessage } from "@/lib/problem";
import { formatDateTime, formatPrice } from "@/lib/format";
import { visionDisplayEnabled } from "@/lib/vision-institutions";

/**
 * بوابة الربح — the full-vision spec §5.7/§7's revenue door: the four
 * revenue streams' dashboards over the immutable ledger.
 *
 * THE HONEST SPLIT (the spec's own money rule: «كل ريال يظهر للعضو أو
 * للإدارة قابل للتتبع إلى قيد دفتر غير قابل للتعديل — لا رقم بلا قيد»):
 * - الإعلانات (W5 served): the provider campaigns' billing rows ride the
 *   provider's own board (/provider/ads — the frozen windows); this door
 *   links the served surface and states the aggregate gate.
 * - المدفوعات والتسويات (served): the admin payment summaries — the
 *   REAL ledger view this door holds today.
 * - الضمان والوساطة + البيع المباشر (R1/R3 pending): honest gates —
 *   the percentage is an owner decision (charter §7/8), no invented
 *   numbers.
 */

type RevenuePageProps = PageProps<"/admin/revenue">;

export const metadata: Metadata = {
  title: "بوابة الربح",
  robots: { index: false },
};

export default async function AdminRevenuePage(_: RevenuePageProps) {
  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>بوابة الربح</h1>
        <p className="page-note">
          لوحة الإدارة تتطلب تسجيل الدخول. <Link href="/">تسجيل الدخول</Link>
        </p>
      </main>
    );
  }

  // The REAL ledger view the door holds today: the admin payment
  // summaries read (the same channel the finance door rides — one read,
  // expected failures as data).
  const payments = await getPaymentSummaries(0, 10);
  const visionOn = visionDisplayEnabled();

  return (
    <main>
      <h1>بوابة الربح — الأبواب الأربعة</h1>
      <p className="page-note">
        كل ريال يظهر هنا قابل للتتبع إلى قيد دفتر غير قابل للتعديل بتاريخه —
        لا رقم بلا قيد.
      </p>

      <section className="card" aria-labelledby="rev-ads-heading">
        <h2 id="rev-ads-heading">١ · الإعلانات (مُخدَم)</h2>
        <p className="page-note">
          حملات المزوّدن بنوافذ فوترة مجمدة (تجميد أولي عند 04:45 UTC) وقيد
          AD_DEBIT غير قابل للتعديل لكل شحنة — لوحاتها على صفحة المزوّد نفسها.
        </p>
        <p>
          <Link className="button" href="/admin/finance">
            قيود المالية والتسويات
          </Link>
        </p>
        <p className="page-note" role="status">
          مخزون المواضع والاستهداف بحارة/اهتمام (R2) يوسّع هذا الباب عند
          هبوط عقده.
        </p>
      </section>

      <section className="card" aria-labelledby="rev-payments-heading">
        <h2 id="rev-payments-heading">٢ · المدفوعات والتسويات (مُخدَم)</h2>
        {payments.ok ? (
          payments.data.content.length === 0 ? (
            <p className="page-note" role="status">
              لا نوايا دفع مسجّلة بعد — الجدول يمتلئ مع أول عملية.
            </p>
          ) : (
            <>
              <p className="page-note">
                {new Intl.NumberFormat("ar").format(payments.data.totalElements)} نية
                دفع — الأحدث أولًا
              </p>
              <ul className="feed-list">
                {payments.data.content.map((p) => (
                  <li key={p.id} className="card post-card">
                    <p className="listing-meta">
                      <span>{formatPrice(p.amountCents / 100, p.currency)}</span>
                      <span>·</span>
                      <span>{p.status}</span>
                      <span>·</span>
                      <span>{formatDateTime(p.createdAt)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : (
          <p className="page-note" role="status">
            {problemMessage(
              payments.problem,
              `تعذّرت قراءة المدفوعات (رمز ${payments.status}).`,
            )}
          </p>
        )}
      </section>

      {visionOn ? (
        <section className="card" aria-labelledby="rev-escrow-heading">
          <h2 id="rev-escrow-heading">
            ٣ · الضمان والوساطة — النسبة <Badge tone="new">بانتظار قرار المالك</Badge>
          </h2>
          <p className="page-note">
            أحد الطرفين يطلب منصة وسيطًا: الحجز في المحفظة → شروط الإفراج →
            النسبة تُقتطع وتُقيّد في دفتر غير قابل للتعديل. أعمدة البنية جاهزة
            (نوايا الدفع، تسويات الويب هوك، الحل المالي للنزاعات) —
            <strong> رقم النسبة وحده قرار مالك</strong> (الميثاق §7/8) وهو
            البوابة الوحيدة المتبقية لعقد R1.
          </p>
        </section>
      ) : null}

      {visionOn ? (
        <section className="card" aria-labelledby="rev-firstparty-heading">
          <h2 id="rev-firstparty-heading">
            ٤ · البيع المباشر وحلول الأعمال <Badge tone="new">بانتظار عقودها</Badge>
          </h2>
          <p className="page-note">
            منتجات وخدمات تبيعها المنصة نفسها (تقرير تثمين مدفوع، ترقية إعلان،
            توثيق معجّل — عقد R3) وأدوات مدفوعة لصاحب العمل (لوحة الأداء
            المتقدمة — عقد R4). منتجات «من المنصة» تظهر في المتجر بطبقة العرض
            حتى عقدها.
          </p>
        </section>
      ) : null}

      <p>
        <Link href="/admin">لوحة التحكم</Link>
      </p>
    </main>
  );
}
