import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

// Arabic-first typography: Cairo is a VARIABLE font (wght 200-1000, measured
// in the packaged font-data.json) with arabic+latin subsets — the official
// fonts guide recommends variable fonts, and next/font/google self-hosts it
// (no requests to Google from the browser). Replaces the P2 Geist latin-only
// proof setup as the app becomes an Arabic RTL product.
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

// Single-locale Arabic app: no [lang] routing segment needed (i18n guide);
// direction and language are static facts of the root document.
//
// metadataBase resolves relative canonical/openGraph URLs to absolute ones
// (metadata-functions guide) and reuses the app's own origin — the same
// env var that already carries it in dev (localhost:3000) and production
// (the Railway public URL): BETTER_AUTH_URL. The backend's L39 SEO
// contract composes its JSON-LD `url`/sitemap entries against this same
// origin once its `marketplace.catalog.seo.public-site-base-url` is
// bound — one origin fact, one env source, no second variable to drift.
const appOrigin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appOrigin),
  title: {
    default: "Marketplace — السوق",
    template: "%s — Marketplace",
  },
  description: "عميل الويب للسوق — واجهة عربية RTL عبر وسيط BFF آمن",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body>{children}</body>
    </html>
  );
}
