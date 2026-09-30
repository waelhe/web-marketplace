import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { problemMessage } from "@/lib/problem";
import {
  getMyNotifications,
  getMyPreferences,
  getMyUnreadNotificationCount,
} from "@/lib/api/inbox";
import {
  NOTIFICATION_TYPE_LABELS,
  type NotificationType,
} from "@/lib/api/inbox-contract";
import { MarkReadForm, PreferencesMatrix } from "./forms";

/**
 * إشعاراتك — the wing's own notifications surface (slice N1, the
 * Nextdoor-2026 completeness wave): the REAL in-app feed + the L22
 * preference matrix, rendered in the owner's حيّنا design.
 *
 * The channel is the same measured one /inbox rides (the lib layer's
 * memoized reads; the inbox's own server actions — markReadAction /
 * updatePreferencesAction — are reused verbatim: same POST-only
 * Server-Action boundary, same session re-check, same backend
 * resource-server authority). This page is a second SURFACE over one
 * channel, never a second channel.
 *
 * The honest signed-out state is the sign-in gate (every read behind
 * this page answers 401 AUTHN-001 to anonymous callers — never probe);
 * `noindex` is the honest robots contract for session-scoped content.
 */

export const metadata: Metadata = {
  title: "إشعاراتك — حيّنا",
  robots: { index: false },
};

type NotificationsPageProps = PageProps<"/neighborhood/notifications">;

/** Parse ?page= (1-based for humans) into the backend's 0-based page. */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return parsed - 1;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const sp = await searchParams;
  const page = parsePage(sp?.page);

  const session = await getSession();
  if (!session) {
    return (
      <main>
        <section className="hy-card" aria-labelledby="notifications-heading">
          <h1 id="notifications-heading" className="hy-section-title">
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
            إشعاراتك
          </h1>
          <p className="hy-state" role="status">
            الإشعارات للأعضاء المسجّلين — سجّل الدخول لرؤية ما وصلك من حيّك ومنصة السوق.
          </p>
          <SignInButton callbackURL="/neighborhood/notifications" />
        </section>
      </main>
    );
  }

  const [notifications, unread, preferences] = await Promise.all([
    getMyNotifications(page),
    getMyUnreadNotificationCount(),
    getMyPreferences(),
  ]);

  /* The badge rides the backend's own count — honest when the feed
   * spans pages (a client-side filter over one page would undercount). */
  const unreadCount = unread.ok ? unread.data.unreadCount : 0;

  /** The pager's href — the inbox's own convention: human pages are
   * 1-based and page 1 is the CLEAN canonical URL (no ?page= noise). */
  const pageHref = (humanPage: number): string =>
    humanPage > 1 ? `/neighborhood/notifications?page=${humanPage}` : "/neighborhood/notifications";

  return (
    <main>
      {/* ---- The in-app feed (measured: paged, newest first — plan 2.6) ---- */}
      <section className="hy-card" aria-labelledby="notifications-heading">
        <div className="hy-real-head">
          <h1 id="notifications-heading" className="hy-section-title">
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
            إشعاراتك
          </h1>
          {unread.ok && unreadCount > 0 ? (
            <span className="hy-real-count">
              {new Intl.NumberFormat("ar").format(unreadCount)} غير مقروء
            </span>
          ) : null}
        </div>
        {notifications.ok ? (
          notifications.data.content.length === 0 ? (
            <p className="hy-empty" role="status">
              لا إشعارات بعد — ستظهر هنا لحظة وصولها (حجز، طلب تواصل، تعليق على منشورك،
              إعلان جديد في حارتك…).
            </p>
          ) : (
            <>
              <p className="hy-state">
                {new Intl.NumberFormat("ar").format(notifications.data.totalElements)} إشعاراً —
                الصفحة {new Intl.NumberFormat("ar").format(notifications.data.pageNumber + 1)} من{" "}
                {new Intl.NumberFormat("ar").format(Math.max(notifications.data.totalPages, 1))}
              </p>
              <ul className="hy-real-list">
                {notifications.data.content.map((notification) => (
                  <li
                    key={notification.id}
                    className={notification.read ? "hy-real-item" : "hy-real-item hy-unread"}
                  >
                    <header className="hy-post-head">
                      <div className="hy-post-id">
                        <span className="hy-post-chip" data-tone="general">
                          {NOTIFICATION_TYPE_LABELS[notification.type as NotificationType] ??
                            notification.type}
                        </span>
                      </div>
                      <time className="hy-post-meta" dateTime={notification.createdAt}>
                        {formatDate(notification.createdAt)}
                      </time>
                    </header>
                    <p className="hy-real-body">{notification.message}</p>
                    {!notification.read ? (
                      <div className="hy-real-actions">
                        <MarkReadForm notificationId={notification.id} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              <nav className="hy-pager" aria-label="تصفّح الإشعارات">
                {notifications.data.pageNumber > 0 ? (
                  <Link className="hy-btn hy-btn-soft" href={pageHref(notifications.data.pageNumber)}>
                    الصفحة السابقة
                  </Link>
                ) : null}
                {!notifications.data.last ? (
                  <Link
                    className="hy-btn hy-btn-soft"
                    href={pageHref(notifications.data.pageNumber + 2)}
                  >
                    الصفحة التالية
                  </Link>
                ) : null}
              </nav>
            </>
          )
        ) : (
          <p className="hy-state" role="status">
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
      <section className="hy-card" aria-labelledby="preferences-heading">
        <h2 id="preferences-heading" className="hy-section-title">
          <span className="material-symbols-outlined" aria-hidden="true">tune</span>
          تفضيلات الإشعارات
        </h2>
        <p className="hy-state">
          مصفوفة الأنواع × القنوات كما يحسبها الخادم. قناة «داخل التطبيق» مفعّلة دائماً بحكم
          النظام؛ ما تسجّله هنا هو تعطيل البريد أو الإشعارات الفورية لكل نوع على حدة.
        </p>
        {preferences.ok ? (
          <PreferencesMatrix initial={preferences.data} />
        ) : (
          <p className="hy-state" role="status">
            {preferences.unauthenticated
              ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
              : problemMessage(
                  preferences.problem,
                  `تعذّر قراءة التفضيلات (رمز ${preferences.status}).`,
                )}
          </p>
        )}
      </section>

      <p className="hy-state">
        <Link href="/neighborhood" className="hy-btn hy-btn-soft">
          العودة إلى خلاصة الحي
        </Link>
      </p>
    </main>
  );
}
