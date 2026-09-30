"use client";

/**
 * The wing's mobile bottom tab bar (slice N1 — the Nextdoor-2026
 * signature navigation: fixed bottom tabs on phones, replacing S10's
 * scrollable pill strip). The six destinations keep the owner's own
 * vocabulary; Material Symbols carry the icons; the active state
 * rides usePathname with PATH-SEGMENT matching (the measured robots
 * lesson: "/neighborhood/events".startsWith("/neighborhood") is true —
 * raw includes/startsWith on a bare prefix is the trap; each item is
 * active iff pathname === href OR pathname startsWith(href + "/")).
 *
 * Hidden ≥ 48rem where the design's own sidebar takes over (the same
 * breakpoint the pill strip rode). The shell reserves the bar's height
 * via padding-block-end on the main column below 48rem — no fixed-
 * offset arithmetic, no content occlusion, safe-area aware.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The wing's six sections with the bar's own icons + short labels. */
const TAB_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  full: string;
  icon: string;
}> = [
  { href: "/neighborhood", label: "الخلاصة", full: "خلاصة الحي", icon: "forum" },
  { href: "/neighborhood/events", label: "الفعاليات", full: "فعاليات وتجمعات الحي", icon: "event" },
  { href: "/neighborhood/market", label: "السوق", full: "سوق الحي والحراج", icon: "storefront" },
  { href: "/neighborhood/services", label: "الخدمات", full: "دليل الخدمات والتوصيات", icon: "handyman" },
  { href: "/neighborhood/safety", label: "الأمان", full: "تنبيهات الأمان والمفقودات", icon: "shield" },
  { href: "/neighborhood/groups", label: "المجموعات", full: "مجموعات الجيران", icon: "groups" },
];

/** Path-segment matching — never raw includes (the measured trap). */
function isItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WingTabBar() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="hy-tabbar" aria-label="أقسام حيّنا">
      {TAB_ITEMS.map((item) => {
        const active = isItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="hy-tab"
            aria-current={active ? "page" : undefined}
            aria-label={item.full}
            data-active={active || undefined}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            <span className="hy-tab-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
