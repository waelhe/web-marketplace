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
export const metadata: Metadata = {
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
