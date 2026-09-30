import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import { getSession } from "@/lib/dal";
import { SignInButton, SignOutButton } from "@/app/auth-buttons";
import { PanelNavSide, PanelNavStrip } from "./panel-nav";

/**
 * لوحات التحكم — the control-panel shell (slice N2: the Nextdoor-2026
 * control-panel wave on OUR backend, by the owner's directive
 * «وبكل قدراتها وميزاتها، ولوحات التحكم الخاص بها»). The wing's own
 * S10 shell anatomy carries the console: the fixed 5rem header (brand +
 * the console chip + the admin identity), the 18rem sidebar (the eight
 * panels + the honest authority card), and the mobile pill strip below
 * 48rem (eight destinations do not fit a bottom tab bar — the wing's
 * own scrollable-pill convention carries them).
 *
 * The shell is a SERVER component: the session is the same measured
 * read every surface rides. An anonymous caller gets the honest
 * signed-out shell + the sign-in gate INSTEAD of the panel content —
 * the pages never execute, so no panel read ever fires for a visitor.
 * The signed-in-but-not-admin case stays the backend's own words: every
 * panel read answers the backend's 403 verbatim (the console claims no
 * authority the session cannot verify — the S6 discipline, unchanged).
 *
 * `noindex` covers the whole console (session-scoped surface).
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
  title: {
    default: "لوحات التحكم",
    template: "%s — لوحات التحكم",
  },
  robots: { index: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  // The identity initials — the session's own display name, no
  // invented identity (the honest signed-in projection; the backend's
  // role grant stays the backend's own business — the panels' reads
  // carry it).
  const initials =
    session?.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join(" ") ?? null;

  return (
    <div className={`hy hy-shell hy-adm ${manrope.variable} ${jakarta.variable}`}>
      {/* Material Symbols Outlined — the design system's own icon font,
          loaded the way the owner's HTML loads it. */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" />

      <header className="hy-header">
        <div className="hy-header-inner">
          <div className="hy-brand">
            <span className="hy-brand-mark">
              <span className="material-symbols-outlined" aria-hidden="true">
                tune
              </span>
            </span>
            <span className="hy-brand-id">
              <span className="hy-brand-name">لوحات التحكم</span>
              <span className="hy-brand-sub">Marketplace — وحدة الإدارة</span>
            </span>
          </div>
          <div className="hy-header-actions">
            {session ? (
              <>
                {/* The operator chip — the session's own name; the
                    authority grant stays the backend's (the panels'
                    403 words are the truth channel). */}
                <span className="hy-me" title="جلسة الوكيل الإداري">
                  <span className="hy-me-avatar" aria-hidden="true">
                    {initials ?? "؟"}
                  </span>
                  <span className="hy-me-id">
                    <span className="hy-me-name">{session.name ?? session.email}</span>
                    <span className="hy-me-role">
                      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.6875rem" }}>
                        admin_panel_settings
                      </span>
                      الوحدة الإدارية
                    </span>
                  </span>
                </span>
                <SignOutButton />
              </>
            ) : (
              <SignInButton callbackURL="/admin" />
            )}
          </div>
        </div>
      </header>

      <PanelNavStrip />

      <aside className="hy-aside">
        <div className="hy-aside-status">
          <span className="hy-aside-status-icon">
            <span className="material-symbols-outlined" aria-hidden="true">gavel</span>
          </span>
          <div>
            <strong>السلطة على الخلفي</strong>
            <span>كل قراءة وأمر يمرّ بالخلفي نفسه</span>
          </div>
        </div>
        <PanelNavSide />
        <div className="hy-aside-foot">
          <p className="hy-adm-foot-note">
            اللوحات للحسابات الإدارية — الحساب غير الإداري يرى رفض الخلفي
            بكلماته الحرفية، ولا تُدّعى مسارات لا يستطيع التحقق منها.
          </p>
          <Link href="/" className="hy-adm-foot-link">
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "1rem" }}>
              home
            </span>
            الرئيسية
          </Link>
        </div>
      </aside>

      <div className="hy-main-col">
        {session ? (
          <div className="hy-main">{children}</div>
        ) : (
          <main className="hy-main hy-adm-gate">
            <h1>لوحات التحكم</h1>
            <p className="page-note" role="status">
              اللوحات للحسابات الإدارية — سجّل الدخول أولًا.
            </p>
            <p className="page-note" role="note">
              كل قراءة وأمر في الوحدة الإدارية محرّس بدور الأدمن على الخلفي
              نفسه: الجلسة غير الإدارية ترى رفض الخلفي بكلماته الحرفية.
            </p>
            <SignInButton callbackURL="/admin" />
          </main>
        )}
      </div>
    </div>
  );
}
