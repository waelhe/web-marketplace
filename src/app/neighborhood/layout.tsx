import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import { getSession } from "@/lib/dal";
import { getMyMembership } from "@/lib/api/community";
import { getMyUnreadNotificationCount } from "@/lib/api/inbox";
import { findGeoNodeById } from "@/lib/api/geo";
import { SignInButton } from "@/app/auth-buttons";
import { WingTabBar } from "./wing-tab-bar";

/**
 * حيّنا — the app shell of the neighborhood wing (slice S10: the
 * owner-supplied design made executable — repo files code.md +
 * screen.png, commit 23a03ee / PR #23). The shell carries the
 * design's own fixed furniture on EVERY neighborhood surface:
 * the 5rem translucent header (brand «حيّنا» + neighborhood chip +
 * search affordance + notifications + the member identity), and the
 * fixed 18rem sidebar (the design's six sections + the neighborhood
 * status card + the gated visitor-pass affordance). Pages render
 * into the main column with the design's 12-col grid available.
 *
 * The shell is a SERVER component: the session and the membership
 * are the same measured reads the feed rides (memoized per render
 * pass) — an anonymous caller gets the honest signed-out shell, and
 * `noindex` covers the whole wing (session-scoped content).
 *
 * Fonts: the design's own families (Manrope for headlines, Plus
 * Jakarta Sans for body) self-hosted via next/font — the Arabic
 * subset rides the app-wide Cairo fallback already in the root
 * layout; Material Symbols Outlined loads exactly as the owner's
 * HTML loads it (the Google stylesheet link) — it is an icon font,
 * not text, and next/font does not package it (measured against
 * the packaged font-data.json).
 */

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "حيّنا",
  robots: { index: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/** The design's own six sections — the wing's navigation vocabulary. */
const NAV_ITEMS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/neighborhood", label: "خلاصة الحي" },
  { href: "/neighborhood/events", label: "فعاليات وتجمعات الحي" },
  { href: "/neighborhood/market", label: "سوق الحي والحراج" },
  { href: "/neighborhood/services", label: "دليل الخدمات والتوصيات" },
  { href: "/neighborhood/safety", label: "تنبيهات الأمان والمفقودات" },
  { href: "/neighborhood/groups", label: "مجموعات الجيران" },
];

export default async function NeighborhoodLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const [membership, unread] = session
    ? await Promise.all([getMyMembership(), getMyUnreadNotificationCount()])
    : [null, null];
  const membershipOk = membership?.ok ? membership.data : null;
  const neighborhoodName = membershipOk
    ? (await findGeoNodeById(membershipOk.locationId))?.nameAr ?? null
    : null;
  /* The bell's badge rides the backend's own unread count (N1: the
   * notifications channel is LIVE — the earlier disabled bell awaited
   * a service that already existed; measured 2026-09-30, gap doc §2/3). */
  const unreadCount = unread?.ok ? unread.data.unreadCount : 0;

  // The member's avatar initials — the session's own display name,
  // no invented identity (the honest signed-in projection).
  const initials =
    session?.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join(" ") ?? null;

  return (
    <div
      className={`hy hy-shell ${manrope.variable} ${jakarta.variable}`}
    >
      {/* Material Symbols Outlined — the design's own icon font,
          loaded the way the owner's HTML loads it. */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" />

      <header className="hy-header">
        <div className="hy-header-inner">
          <div className="hy-brand">
            <span className="hy-brand-mark">
              <span className="material-symbols-outlined" aria-hidden="true">
                holiday_village
              </span>
            </span>
            <span className="hy-brand-id">
              <span className="hy-brand-name">حيّنا</span>
              <span className="hy-brand-sub">مجتمع الجيران الآمن</span>
            </span>
          </div>
          {/* The neighborhood chip — the membership's own resolved name
              (the honest anonymous/absent state is the sign-in itself).
              hy-hood-chip carries the design's own responsive point
              (hidden md:flex): the chip collapses below 48rem so the
              5rem header row fits a phone. */}
          {neighborhoodName ? (
            <span className="hy-pill hy-hood-chip" title="حارتك المسجّلة">
              <span className="material-symbols-outlined" aria-hidden="true">
                location_on
              </span>
              {neighborhoodName}
            </span>
          ) : null}
          {/* The header's search affordance — the design's live search,
              riding the market screen's REAL ?q= server-side read. */}
          <form className="hy-search" action="/neighborhood/market" method="get" role="search">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              type="search"
              name="q"
              placeholder="ابحث في سوق الحي…"
              aria-label="ابحث في سوق الحي"
            />
          </form>
          <div className="hy-header-actions">
            {session ? (
              <>
                {/* N1: the REAL notifications bell — the backend's own
                    unread-count drives the badge; the page behind the
                    link carries the feed + the L22 matrix. */}
                <Link
                  href="/neighborhood/notifications"
                  className="hy-notif"
                  aria-label={
                    unreadCount > 0
                      ? `الإشعارات — ${new Intl.NumberFormat("ar").format(unreadCount)} غير مقروء`
                      : "الإشعارات"
                  }
                >
                  <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
                  {unreadCount > 0 ? (
                    <span className="hy-notif-badge" aria-hidden="true">
                      {new Intl.NumberFormat("ar").format(
                        unreadCount > 99 ? 99 : unreadCount,
                      )}
                      {unreadCount > 99 ? "+" : ""}
                    </span>
                  ) : (
                    <span className="hy-notif-dot" aria-hidden="true" />
                  )}
                </Link>
                {/* N1: the messages entry — Nextdoor's header chat
                    affordance, linking to the REAL inbox (no badge: the
                    backend exposes no conversation-list read — gap #11). */}
                <Link
                  href="/inbox"
                  className="hy-notif"
                  aria-label="الرسائل وطلبات التواصل — الصندوق"
                  >
                  <span className="material-symbols-outlined" aria-hidden="true">chat</span>
                </Link>
                {/* N1: the member chip becomes the member's own page
                    entry — Nextdoor's profile affordance in the header. */}
                <Link href="/neighborhood/me" className="hy-me">
                  <span className="hy-me-avatar" aria-hidden="true">
                    {initials ?? "؟"}
                  </span>
                  <span className="hy-me-id">
                    <span className="hy-me-name">{session.name ?? session.email}</span>
                    <span className="hy-me-role">
                      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.6875rem" }}>
                        verified
                      </span>
                      جارك في حيّنا
                    </span>
                  </span>
                </Link>
              </>
            ) : (
              <SignInButton callbackURL="/neighborhood" />
            )}
          </div>
        </div>
        {/* N1: the mobile navigation is the Nextdoor-2026 bottom tab
            bar (wing-tab-bar.tsx — fixed bottom, icons + short labels,
            path-segment active matching). It replaces S10's scrollable
            pill strip below 48rem; the sidebar takes over ≥ 48rem. */}
      </header>

      <WingTabBar />

      <aside className="hy-aside">
        <div className="hy-aside-status">
          <span className="hy-aside-status-icon">
            <span className="material-symbols-outlined" aria-hidden="true">shield</span>
          </span>
          <div>
            <strong>حالة الحي: آمن ومستقر</strong>
            <span>دورية الحراسة نشطة الآن</span>
          </div>
        </div>
        <nav className="hy-nav" aria-label="أقسام حيّنا">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hy-aside-foot">
          <button
            type="button"
            className="hy-visitor-pass"
            title="قريبًا — بانتظار عقد تصاريح الزوار لدى الباك اند"
            disabled
          >
            <span className="hy-visitor-pass-label">
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "1rem" }}>
                qr_code_2
              </span>
              تصريح زائر سريع
            </span>
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.75rem" }}>
              arrow_back_ios
            </span>
          </button>
        </div>
      </aside>

      <div className="hy-main-col">
        {/* The design system lives in the app-wide globals.css (the
            .hy layer) — the root layout already imports it. Pages keep
            their own <main> element (the sole main per page). */}
        <div className="hy-main">{children}</div>
      </div>
    </div>
  );
}
