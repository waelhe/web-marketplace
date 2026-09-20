// loading.js: default Server Component; Next wraps the segment's page in a
// Suspense boundary automatically (file-conventions/loading). This root
// fallback covers streamed server pages (e.g. session-aware home/profile)
// while data resolves.
export default function Loading() {
  return (
    <main aria-busy="true" aria-live="polite">
      <p className="page-note">جارٍ التحميل…</p>
    </main>
  );
}
