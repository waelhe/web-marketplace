"use client";

/**
 * لوحات التحكم — the panel navigation (slice N2: the Nextdoor-2026
 * control-panel wave on OUR backend). Two renderings of ONE vocabulary:
 * the desktop sidebar links (inside the shell's `.hy-aside`) and the
 * mobile pill strip (sticky under the 5rem header below 48rem — eight
 * destinations do not fit a fixed bottom tab bar, so the wing's own
 * scrollable-pill convention carries them instead).
 *
 * The active state rides usePathname with PATH-SEGMENT matching (the
 * measured robots lesson — never raw includes/startsWith on a bare
 * prefix): an item is active iff pathname === href OR pathname
 * startsWith(href + "/").
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PANEL_ITEMS } from "./panel-items";

/** Path-segment matching — never raw includes (the measured trap). */
function isItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The desktop sidebar navigation (rendered inside `.hy-aside`). */
export function PanelNavSide() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="hy-nav" aria-label="لوحات التحكم">
      {PANEL_ITEMS.map((item) => {
        const active = isItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "hy-nav-active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** The mobile pill strip (sticky under the header below 48rem). */
export function PanelNavStrip() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="hy-adm-strip" aria-label="لوحات التحكم">
      {PANEL_ITEMS.map((item) => {
        const active = isItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="hy-pill"
            data-active={active || undefined}
            aria-current={active ? "page" : undefined}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
