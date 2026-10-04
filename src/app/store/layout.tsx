import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Tajawal } from "next/font/google";
import { CartBar } from "./cart-bar";
import { StorefrontNav } from "./storefront-nav";

/**
 * عائلة المتجر — the store family's chrome (the attached design's app
 * shell, PR #502): the Tajawal type scope, the `.suq` token layer, the
 * centered app frame, the REAL-state unified cart bar (server read of
 * the official cookie), and the floating pill nav with the publish
 * bottom sheet (the design's five intents, each an honest link to the
 * platform's real publish surfaces).
 *
 * The chrome is scoped to /store and /store/[id] only — the wing keeps
 * its own shell (S10, the owner's other binding design) and /cart and
 * /orders keep the warm skin until their follow-up wave.
 */

// The attached design's own typeface (Tajawal 400/500/700) — scoped to
// the storefront family exactly the way the wing scopes Manrope/Jakarta;
// the platform's Cairo stays the root default. next/font self-hosts it.
const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  // No title.template here: the pages (and the product page's dynamic
  // titles) carry their own complete titles — a layout template would
  // double-suffix them (measured Next metadata-merging behavior).
  title: "سوق الحي — المتجر",
  description:
    "سوق الحي — متجر الأحياء متعدد البائعين: مخابز وخضار ولحوم وأسر منتجة، بسلة واحدة موحدة.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`suq ${tajawal.variable}`}>
      <div className="suq-frame">
        {children}
        {/* The design's app chrome: the REAL-state cart bar (server
            render — fresh on every navigation and after every action
            through the revalidation the action itself triggers) and the
            floating pill nav + publish sheet (client interaction). */}
        <CartBar />
        <StorefrontNav />
      </div>
    </div>
  );
}
