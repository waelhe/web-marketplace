"use client";

import { useEffect } from "react";

// global-error.tsx: replaces the ROOT LAYOUT when it crashes, so it must
// define its own <html>/<body> and carry its own styles (file-conventions/
// error#global-error). Metadata exports are unsupported here — React's
// <title> is the sanctioned alternative. Arabic + RTL are restated because
// the root layout's attributes do not apply to this document.
//
// Self-containment is preserved by construction: inline styles only (no
// globals.css classes, no component imports — both ride the replaced
// layout). Colors resolve through the Task-1 tokens with the previously
// hardcoded values kept as measured fallbacks (R35:
// `var(--x, <measured-fallback>)`), so the boundary renders identically
// even when no stylesheet survived the crash.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "var(--color-bg, #0a0a0a)",
          color: "var(--color-fg, #ededed)",
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <title>خطأ في التطبيق</title>
        <h1>حدث خطأ في التطبيق</h1>
        <p>{error.digest ? `معرّف الخطأ: ${error.digest}` : "يرجى المحاولة لاحقاً."}</p>
        <p style={{ margin: 0 }}>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              border: "1px solid var(--color-accent, #2dd4bf)",
              color: "var(--color-accent, #2dd4bf)",
              background: "transparent",
              borderRadius: "var(--radius-md, 0.5rem)",
              padding: "0.5rem 1rem",
              minHeight: "44px",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            إعادة المحاولة
          </button>{" "}
          {/* Plain anchor, not next/link: this boundary replaces the root
              layout when it crashes, so router-context navigation is
              unreliable here — a full document load always works. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              color: "var(--color-fg, #ededed)",
              textUnderlineOffset: "3px",
            }}
          >
            العودة إلى الصفحة الرئيسية
          </a>
        </p>
      </body>
    </html>
  );
}
