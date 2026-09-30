import type { Metadata } from "next";
import Link from "next/link";
import {
  getModerationQueue,
  getAllBookings,
  getAllListings,
  getPaymentSummaries,
  getUsers,
} from "@/lib/api/admin";
import {
  MODERATION_QUEUE_PAGE_SIZE,
  REPORT_STATUS_LABELS,
  type ReportStatusFilter,
} from "@/lib/api/admin-contract";
import {
  REPORT_REASON_LABELS,
  type ReportReason,
} from "@/lib/api/community-contract";
import { formatDateTime } from "@/lib/format";
import { PANEL_ITEMS } from "./panel-items";
import { EmptyState, PanelHead, ReadFailure } from "./panel-parts";

/**
 * لوحات التحكم — النظرة العامة (slice N2): the console's landing —
 * the KPI row (each number is a REAL first-page read's own
 * totalElements, never an invented count) + the moderation queue's
 * open head (Nextdoor's moderation-first console) + the panels map.
 *
 * The overview fires the five light reads the old single-page console
 * always fired (queue + users + listings + bookings + payments, first
 * page each) — strictly less work than the S6 page, which read the
 * rules + audited entities + categories too. Every KPI card links to
 * its own panel; the failure branch stays the backend's own words
 * (the 403s are data — the console claims no authority).
 */

export const metadata: Metadata = {
  title: "نظرة عامة — لوحات التحكم",
  robots: { index: false },
};

/** The status axis chip — OPEN/RESOLVED/DISMISSED on the backend's own vocabulary. */
function statusLabel(status: string): string {
  return REPORT_STATUS_LABELS[status as ReportStatusFilter] ?? status;
}

type AdminPageProps = PageProps<"/admin">;

/** One KPI card — the panel's own live number + its deep link. */
function KpiCard({
  href,
  icon,
  label,
  value,
  hint,
}: {
  href: string;
  icon: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Link href={href} className="hy-kpi" data-clickable>
      <span className="hy-kpi-icon">
        <span className="material-symbols-outlined" aria-hidden="true">
          {icon}
        </span>
      </span>
      <span className="hy-kpi-value">{value}</span>
      <span className="hy-kpi-label">{label}</span>
      <span className="hy-kpi-hint">{hint}</span>
    </Link>
  );
}

/** The fallback KPI card — the failure branch, the backend's own words. */
function KpiFailure({
  what,
  status,
}: {
  what: string;
  status: number;
}) {
  return (
    <div className="hy-kpi" role="status">
      <span className="hy-kpi-icon">
        <span className="material-symbols-outlined" aria-hidden="true">
          block
        </span>
      </span>
      <span className="hy-kpi-value">—</span>
      <span className="hy-kpi-label">{what}</span>
      <span className="hy-kpi-hint">
        {status === 0
          ? "الخادم الخلفي غير متاح حالياً"
          : `تعذّرت القراءة (رمز ${status})`}
      </span>
    </div>
  );
}

export default async function AdminOverviewPage({}: AdminPageProps) {
  // The five light reads — the same expected-failure channels the old
  // console fired; the overview renders each read's own count.
  const [queue, users, listings, bookings, payments] = await Promise.all([
    getModerationQueue("OPEN", 0, MODERATION_QUEUE_PAGE_SIZE),
    getUsers(0, 1),
    getAllListings(0, 1),
    getAllBookings(null, 0, 1),
    getPaymentSummaries(0, 1),
  ]);

  const ar = new Intl.NumberFormat("ar");

  return (
    <main className="hy-adm-panel">
      <PanelHead
        title="نظرة عامة"
        note={
          <>
            نبض الوحدة الإدارية — كل رقم أدناه قراءته الحية من الخلفي نفسه
            (totalElements للصفحة الأولى من كل عقد)، والأرقام العربية
            للمشاهدة فقط. كل بطاقة تفتح لوحتها؛ الحساب غير الإداري يرى رفض
            الخلفي بكلماته الحرفية.
          </>
        }
      />

      {/* -- the KPI row: five live numbers, each its own panel door -- */}
      <section className="hy-kpi-grid" aria-label="مؤشرات الوحدة">
        {queue.ok ? (
          <KpiCard
            href="/admin/moderation"
            icon="flag"
            label="بلاغات مفتوحة"
            value={ar.format(queue.data.totalElements)}
            hint="طابور FIFO — الأقدم أولاً"
          />
        ) : (
          <KpiFailure what="بلاغات مفتوحة" status={queue.status} />
        )}
        {users.ok ? (
          <KpiCard
            href="/admin/users"
            icon="group"
            label="المستخدمون"
            value={ar.format(users.data.totalElements)}
            hint="الأدوار والحالة والأوامر"
          />
        ) : (
          <KpiFailure what="المستخدمون" status={users.status} />
        )}
        {listings.ok ? (
          <KpiCard
            href="/admin/listings"
            icon="home_work"
            label="الإعلانات"
            value={ar.format(listings.data.totalElements)}
            hint="كل الحالات + الأرشفة والترويج"
          />
        ) : (
          <KpiFailure what="الإعلانات" status={listings.status} />
        )}
        {bookings.ok ? (
          <KpiCard
            href="/admin/bookings"
            icon="event_note"
            label="الحجوزات"
            value={ar.format(bookings.data.totalElements)}
            hint="كل حجوزات المنصة بجانبيها"
          />
        ) : (
          <KpiFailure what="الحجوزات" status={bookings.status} />
        )}
        {payments.ok ? (
          <KpiCard
            href="/admin/finance"
            icon="payments"
            label="أقساط الدفع"
            value={ar.format(payments.data.totalElements)}
            hint="التأكيد والاسترداد والأستاذ"
          />
        ) : (
          <KpiFailure what="أقساط الدفع" status={payments.status} />
        )}
      </section>

      {/* -- the moderation head — Nextdoor's moderation-first console -- */}
      <section className="card hy-adm-section" aria-labelledby="overview-queue-heading">
        <h2 id="overview-queue-heading">رأس طابور البلاغات</h2>
        <p className="page-note">
          أحدث البلاغات المفتوحة — التسوية الكاملة في لوحة البلاغات.
        </p>
        {queue.ok ? (
          queue.data.content.length === 0 ? (
            <EmptyState title="لا بلاغات مفتوحة في الطابور" />
          ) : (
            <ul className="feed-list">
              {queue.data.content.slice(0, 3).map((report) => (
                <li key={report.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="حالة البلاغ">
                      {statusLabel(report.status)}
                    </span>
                    <span>·</span>
                    <span aria-label="نوع الهدف">{report.targetType}</span>
                    <span>·</span>
                    <span aria-label="سبب الإبلاغ">
                      {REPORT_REASON_LABELS[report.reason as ReportReason] ??
                        report.reason}
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(report.createdAt)}</span>
                  </p>
                  <p className="listing-meta" dir="ltr">
                    <span>target: {report.targetId}</span>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={queue.problem} status={queue.status} what="الطابور" />
        )}
        <p>
          <Link href="/admin/moderation">لوحة البلاغات الكاملة ←</Link>
        </p>
      </section>

      {/* -- the panels map: every console door on one card -- */}
      <section className="card hy-adm-section" aria-labelledby="overview-map-heading">
        <h2 id="overview-map-heading">اللوحات</h2>
        <p className="page-note">
          وحدة الإدارة كاملة — كل لوحة بمسارها العميق وقراءاتها وأوامرها.
        </p>
        <ul className="hy-adm-map">
          {PANEL_ITEMS.filter((item) => item.href !== "/admin").map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
