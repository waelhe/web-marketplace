/**
 * The hard ceiling on any single server-side backend read/write — the
 * measured lesson of the 2026-09-29 CI incident: a backend whose edge
 * TCP-ACCEPTS but never answers (a wedged/cold Railway instance; the
 * incident's staging service measured hanging even on
 * /actuator/health) hangs a bare fetch INDEFINITELY by default, which
 * hangs every SSR page riding it — e2e 90s goto timeouts, and far
 * worse in production: real user pages that never finish loading.
 *
 * AbortSignal.timeout turns the hang into the honest status-0 branch
 * every surface already renders ("backend unreachable") within the
 * ceiling. Env-overridable (BACKEND_FETCH_TIMEOUT_MS) for a
 * slow-but-alive backend (long cold starts).
 *
 * Applied on the three RSC data channels: server.ts (authenticated),
 * public.ts (catalog), geo.ts (geo) — the paths SSR pages ride. The
 * browser relay (/api/backend) and the S3 presigned PUT are client
 * fetches that never block a page's load event.
 */

const BACKEND_FETCH_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(process.env.BACKEND_FETCH_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10_000;
})();

/** The abort signal every server-side backend call rides — the hang-breaker. */
export function backendTimeoutSignal(): AbortSignal {
  return AbortSignal.timeout(BACKEND_FETCH_TIMEOUT_MS);
}
