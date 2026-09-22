import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { problemMessage } from "@/lib/problem";
import { getMyLeads, getMyNotifications, getMyPreferences } from "@/lib/api/inbox";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  NOTIFICATION_TYPE_LABELS,
  type LeadStatus,
  type NotificationType,
} from "@/lib/api/inbox-contract";
import { LeadMoveForm, MarkReadForm, PreferencesMatrix } from "./forms";

/**
 * الصندوق — the authenticated inbox (roadmap stage 4): the in-app
 * notification feed (L22 matrix included) + the provider lead inbox
 * (L34). The privacy model is the backend's own measured contract: every
 * surface behind this page answers 401 AUTHN-001 to anonymous callers,
 * so the honest anonymous render is the sign-in gate (never a probe that
 * would 401) — and `noindex` is the honest robots contract for
 * session-scoped content.
 *
 * Conversations (L44) live at /inbox/conversations/[id] — reached from
 * the neighborhood feed («راسل الجار») or a booking flow; the backend
 * exposes no "list my conversations" read (measured gap, ARCHITECTURE
 * §10), so no invented list renders here.
 */

export const metadata: Metadata = {
  title: "الصندوق",
  description: "إشعاراتك وصندوق طلبات التواصل",
  robots: { index: false },
};

type InboxPageProps = PageProps<"/inbox">;

/** Parse ?status= against the lead vocabulary — invalid values drop to null. */
function parseStatus(raw: string | string[] | undefined): LeadStatus | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return LEAD_STATUSES.includes(value as LeadStatus) ? (value as LeadStatus) : null;
}

/** Parse ?page= (1-based for humans) into the backend's 0-based page. */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return parsed - 1;
}

/** The one-way move set the inbox offers per current lead status. */
function leadMoveTargets(status: LeadStatus): LeadStatus[] {
  if (status === "NEW") return ["READ", "ARCHIVED"];
  if (status === "READ") return ["ARCHIVED"];
  return [];
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const sp = await searchParams;
  const status = parseStatus(sp?.status);
  const page = parsePage(sp?.page);

  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>الصندوق</h1>
        <p className="page-note" role="status">
          هذا القسم للمستخدمين المسجّلين — سجّل الدخول لرؤية إشعاراتك ورسائلك.
        </p>
        <SignInButton callbackURL="/inbox" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const [notifications, preferences, leads] = await Promise.all([
    getMyNotifications(),
    getMyPreferences(),
    getMyLeads(page, status),
  ]);

  const unreadCount = notifications.ok
    ? notifications.data.filter((n) => !n.read).length
    : 0;

  return (
    <main>
      <h1>الصندوق</h1>

      {/* ---- Notifications: the in-app feed (measured: full list, newest first) ---- */}
      <section className="card inbox-section" aria-labelledby="notifications-heading">
        <h2 id="notifications-heading">
          الإشعارات
          {notifications.ok ? (
            unreadCount > 0 ? ` — ${new Intl.NumberFormat("ar").format(unreadCount)} غير مقروء` : ""
          ) : null}
        </h2>
        {notifications.ok ? (
          notifications.data.length === 0 ? (
            <p className="page-note" role="status">
              لا إشعارات بعد — ستظهر هنا لحظة وصولها (حجز، طلب تواصل، تعليق…).
            </p>
          ) : (
            <ul className="notification-list">
              {notifications.data.map((notification) => (
                <li
                  key={notification.id}
                  className={notification.read ? "notification-row" : "notification-row unread"}
                >
                  <p className="listing-meta">
                    <span className="listing-category">
                      {NOTIFICATION_TYPE_LABELS[notification.type as NotificationType] ??
                        notification.type}
                    </span>
                    <span>·</span>
                    <span>{formatDate(notification.createdAt)}</span>
                    {!notification.read ? <span>· غير مقروء</span> : null}
                  </p>
                  <p className="notification-message">{notification.message}</p>
                  {!notification.read ? (
                    <MarkReadForm notificationId={notification.id} />
                  ) : null}
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="page-note" role="status">
            {notifications.unauthenticated
              ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
              : problemMessage(
                  notifications.problem,
                  `تعذّر قراءة الإشعارات (رمز ${notifications.status}).`,
                )}
          </p>
        )}
      </section>

      {/* ---- Preferences: the L22 effective matrix ---- */}
      <section className="card inbox-section" aria-labelledby="preferences-heading">
        <h2 id="preferences-heading">تفضيلات الإشعارات</h2>
        <p className="page-note">
          مصفوفة الأنواع × القنوات كما يحسبها الخادم. قناة «داخل التطبيق» مفعّلة دائماً بحكم
          النظام؛ ما تسجّله هنا هو تعطيل البريد أو الإشعارات الفورية لكل نوع على حدة.
        </p>
        {preferences.ok ? (
          <PreferencesMatrix initial={preferences.data} />
        ) : (
          <p className="page-note" role="status">
            {preferences.unauthenticated
              ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
              : problemMessage(
                  preferences.problem,
                  `تعذّر قراءة التفضيلات (رمز ${preferences.status}).`,
                )}
          </p>
        )}
      </section>

      {/* ---- Leads: the provider inbox (L34 mediated contact) ---- */}
      <section className="card inbox-section" aria-labelledby="leads-heading">
        <h2 id="leads-heading">طلبات التواصل</h2>
        <p className="page-note">
          رسائل الزوّار على إعلاناتك — نموذج التواصل الوسيط: الاسم والهاتف والرسالة، دون حساب
          للزائر.
        </p>
        <nav className="category-filter" aria-label="تصفية حالة طلبات التواصل">
          <Link
            href="/inbox"
            className="button"
            data-variant={status === null ? "primary" : undefined}
          >
            الكل
          </Link>
          {LEAD_STATUSES.map((value) => (
            <Link
              key={value}
              href={`/inbox?status=${value}`}
              className="button"
              data-variant={status === value ? "primary" : undefined}
            >
              {LEAD_STATUS_LABELS[value]}
            </Link>
          ))}
        </nav>
        {leads.ok ? (
          leads.data.content.length === 0 ? (
            <p className="page-note" role="status">
              {status === null
                ? "لا طلبات تواصل بعد."
                : `لا طلبات بحالة «${LEAD_STATUS_LABELS[status]}».`}
            </p>
          ) : (
            <>
              <p className="page-note">
                {new Intl.NumberFormat("ar").format(leads.data.totalElements)} طلباً — الصفحة{" "}
                {new Intl.NumberFormat("ar").format(leads.data.pageNumber + 1)} من{" "}
                {new Intl.NumberFormat("ar").format(Math.max(leads.data.totalPages, 1))}
              </p>
              <ul className="lead-list">
                {leads.data.content.map((lead) => (
                  <li key={lead.id} className="lead-row">
                    <p className="listing-meta">
                      <span className="listing-category">{LEAD_STATUS_LABELS[lead.status]}</span>
                      <span>·</span>
                      <span>{formatDate(lead.createdAt)}</span>
                    </p>
                    <p className="notification-message">
                      <strong>{lead.contactName}</strong> —{" "}
                      <span dir="ltr">{lead.contactPhone}</span>
                    </p>
                    <p className="post-body">{lead.message}</p>
                    <p className="listing-meta">
                      عن الإعلان:{" "}
                      <Link href={`/listings/${lead.listingId}`}>
                        <span dir="ltr">{lead.listingId.slice(0, 8)}…</span>
                      </Link>
                    </p>
                    <LeadMoveForm
                      leadId={lead.id}
                      currentStatus={lead.status}
                      targets={leadMoveTargets(lead.status)}
                    />
                  </li>
                ))}
              </ul>
              <nav className="listing-pager" aria-label="تصفّح الصفحات">
                {leads.data.pageNumber > 0 ? (
                  <Link
                    className="button"
                    href={`/inbox?${status ? `status=${status}&` : ""}page=${leads.data.pageNumber}`}
                  >
                    الصفحة السابقة
                  </Link>
                ) : null}
                {!leads.data.last ? (
                  <Link
                    className="button"
                    href={`/inbox?${status ? `status=${status}&` : ""}page=${leads.data.pageNumber + 2}`}
                  >
                    الصفحة التالية
                  </Link>
                ) : null}
              </nav>
            </>
          )
        ) : (
          <p className="page-note" role="status">
            {leads.unauthenticated
              ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
              : problemMessage(leads.problem, `تعذّر قراءة طلبات التواصل (رمز ${leads.status}).`)}
          </p>
        )}
      </section>

      {/* ---- Conversations: the honest entry note (measured gap) ---- */}
      <section className="card inbox-section" aria-labelledby="conversations-heading">
        <h2 id="conversations-heading">المحادثات</h2>
        <p className="page-note">
          تُفتح محادثة الجيران من منشورات حارتك — زر «راسل الجار» بجوار كل منشور في{" "}
          <Link href="/neighborhood">حارتي</Link>؛ ومحادثات الحجز تبدأ من مسار الحجز عند
          توافره. روابط المحادثات مباشرة وقابلة للحفظ
          (<code dir="ltr">/inbox/conversations/…</code>). لا توجد اليوم قائمة قراءة
          «محادثاتي» على الخادم — البند مرفوع لمالك الباك اند.
        </p>
      </section>

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
