"use client";

// global-error.tsx: replaces the ROOT LAYOUT when it crashes, so it must
// define its own <html>/<body> and carry its own styles (file-conventions/
// error#global-error). Metadata exports are unsupported here — React's
// <title> is the sanctioned alternative. Arabic + RTL are restated because
// the root layout's attributes do not apply to this document.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a0a",
          color: "#ededed",
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
        <button
          type="button"
          onClick={() => retry()}
          style={{
            border: "1px solid #2dd4bf",
            color: "#2dd4bf",
            background: "transparent",
            borderRadius: "0.5rem",
            padding: "0.5rem 1rem",
            minHeight: "44px",
            font: "inherit",
            cursor: "pointer",
          }}
        >
          إعادة المحاولة
        </button>
      </body>
    </html>
  );
}
