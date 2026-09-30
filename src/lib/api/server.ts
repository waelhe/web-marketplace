/**
 * Server-side backend access for React Server Components.
 *
 * The packaged BFF guide is explicit: "Fetch data in Server Components
 * directly from its source, not via Route Handlers" — a self-fetch through
 * /api/backend adds an HTTP round trip (and breaks prerendered builds).
 * This module resolves the Bearer token from the Better Auth session
 * (auto-refresh included) and calls BACKEND_URL directly, so RSC pages get
 * the same relay guarantees the browser gets through /api/backend without
 * the extra hop. The token resolution mirrors the measured, live-verified
 * logic in src/app/api/backend/[...path]/route.ts (P2, 2026-09-15).
 *
 * Expected failures are returned, not thrown (official error-handling
 * guide: expected errors are handled in code; only bugs crash boundaries):
 * backend down, expired auth, or problem+json all come back as data.
 */

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { decodeProblem, type ProblemDetail } from "@/lib/problem";
import { backendTimeoutSignal } from "./timeout";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export type BackendResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; problem: ProblemDetail | null; unauthenticated: boolean };

/**
 * Resolve the server-side Bearer access token for the current session.
 *
 * Official DB-less selection, measured in the installed better-auth 1.7.5:
 * `getAccessToken`'s accountSelectionSchema documents `useAccountCookie:
 * true` as "Select the current OAuth account from its signed cookie" —
 * the stateless path (api/routes/account.mjs, resolveUserAccount). The
 * `accountId` selection instead resolves through the internal adapter,
 * which in a DB-less deployment is the in-process memory adapter
 * (@better-auth/memory-adapter, "built for development and tests") —
 * bundle-instance-local, so it only worked where the OAuth callback's
 * bundle happened to be reused (route handlers) and never in RSC renders
 * (measured 2026-09-21: same session token, accounts [] in RSC vs the
 * account in the route-handler context, across two distinct auth module
 * instances). The account cookie is the authoritative store Better Auth
 * itself defaults to for DB-less deployments (context/create-context.mjs:
 * storeAccountCookie: true; the callback writes it with the provider
 * tokens), and getAccessToken auto-refreshes + re-signs it when the
 * access token is within 5s of expiry.
 */
async function resolveBearer(): Promise<string | null> {
  const h = await headers();
  // Expected failure mode (official error-handling guide: expected errors
  // are handled in code): the account cookie's access token is inside its
  // expiry window and the provider refresh fails. (Historical note: with
  // refresh-token ROTATION this fired every ~15 minutes — an RSC render
  // consumed the rotation but dropped the re-signed cookie's Set-Cookie
  // write, stranding the browser with the dead predecessor token. Fixed
  // 2026-09-30 on the backend: SAS reuseRefreshTokens=true keeps the token
  // value stable, so a dropped write only ever loses the new access token,
  // which the next refresh re-mints. The 401 path stays as the honest
  // re-auth signal for genuinely dead sessions, e.g. refresh-token expiry.)
  let token: Awaited<ReturnType<typeof auth.api.getAccessToken>> | null = null;
  try {
    token = await auth.api.getAccessToken({
      body: { useAccountCookie: true },
      headers: h,
    });
  } catch {
    return null;
  }
  if (typeof token === "object" && token !== null && "accessToken" in token) {
    const accessToken = (token as { accessToken: unknown }).accessToken;
    if (typeof accessToken === "string" && accessToken.length > 0) return accessToken;
  }
  return null;
}

/**
 * Direct backend GET for server components. `path` is the backend-relative
 * API path (e.g. "/api/v1/users/me"); search params belong in `path`.
 */
export async function backendGet<T>(path: string): Promise<BackendResult<T>> {
  const bearer = await resolveBearer();
  if (!bearer) {
    return { ok: false, status: 401, problem: null, unauthenticated: true };
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: "application/problem+json, application/json",
      },
      cache: "no-store",
      signal: backendTimeoutSignal(),
    });
  } catch {
    // Network-level failure: backend unreachable (connection refused —
    // e.g. local backend not started — or the timeout ceiling tripped
    // on a wedged-but-accepting instance). Honest, expected state —
    // surfaced as data, never a crash of the render.
    return { ok: false, status: 0, problem: null, unauthenticated: false };
  }

  if (!upstream.ok) {
    const problem = await decodeBody(upstream);
    return {
      ok: false,
      status: upstream.status,
      problem,
      unauthenticated: upstream.status === 401,
    };
  }

  // Text-then-parse: an empty ok body resolves to null (204, or the
  // measured 200-with-no-body mark-read shape) instead of throwing
  // inside json().
  return { ok: true, data: await parseOkBody<T>(upstream), status: upstream.status };
}

/**
 * Direct backend WRITE for Server Actions — the mutating-data counterpart
 * of backendGet, on the identical channel discipline: resolve the session
 * Bearer (auto-refresh included), call BACKEND_URL directly (never a
 * self-fetch through the /api/backend route handler), return expected
 * failures as data. `body` is JSON-serialized; `method` is
 * PUT/POST/PATCH/DELETE (PATCH measured on the leads inbox move). An
 * empty ok body — 204 No Content, or the measured 200-with-no-body
 * mark-read shape (Task 65) — resolves to `data: null`.
 *
 * The official security contract rides two layers: the framework's
 * Server-Action boundary (POST-only, Origin/Host CSRF check) and the
 * backend's resource-server chain (401/403/404 gates) — the backend is
 * the authorization authority; this channel only carries the session's
 * own token.
 */
export async function backendSend<T>(
  method: "PUT" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<BackendResult<T>> {
  const bearer = await resolveBearer();
  if (!bearer) {
    return { ok: false, status: 401, problem: null, unauthenticated: true };
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: "application/problem+json, application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal: backendTimeoutSignal(),
    });
  } catch {
    // Unreachable OR hung-past-the-ceiling — the same honest status-0.
    return { ok: false, status: 0, problem: null, unauthenticated: false };
  }

  if (!upstream.ok) {
    const problem = await decodeBody(upstream);
    return {
      ok: false,
      status: upstream.status,
      problem,
      unauthenticated: upstream.status === 401,
    };
  }

  // 204 fast path kept for the documented contract; parseOkBody covers
  // every empty ok body — including the measured 200-with-no-body
  // mark-read seam (Task 65): text-then-parse, never a bare json().
  if (upstream.status === 204) {
    return { ok: true, data: null as T, status: 204 };
  }

  return { ok: true, data: await parseOkBody<T>(upstream), status: upstream.status };
}

/**
 * Direct backend write on the measured PUBLIC write surfaces — the
 * session-optional twin of backendSend. The bearer attaches when a
 * session exists ("a valid one attributes the lead" — the backend's own
 * contract) and is omitted entirely when it does not; the backend's
 * security chain remains the authority (a presented-but-invalid token
 * still 401s there; no token takes the anonymous path the surface
 * permits). Today this is exactly the L34 lead submission (no mandatory
 * authentication) — every other write surface stays on backendSend.
 */
export async function backendSendPublic<T>(
  method: "POST",
  path: string,
  body?: unknown,
): Promise<BackendResult<T>> {
  const bearer = await resolveBearer();

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: {
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        Accept: "application/problem+json, application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal: backendTimeoutSignal(),
    });
  } catch {
    // Unreachable OR hung-past-the-ceiling — the same honest status-0.
    return { ok: false, status: 0, problem: null, unauthenticated: false };
  }

  if (!upstream.ok) {
    const problem = await decodeBody(upstream);
    return {
      ok: false,
      status: upstream.status,
      problem,
      unauthenticated: upstream.status === 401,
    };
  }

  if (upstream.status === 204) {
    return { ok: true, data: null as T, status: 204 };
  }

  return { ok: true, data: await parseOkBody<T>(upstream), status: upstream.status };
}

async function decodeBody(res: Response): Promise<ProblemDetail | null> {
  try {
    return decodeProblem(await res.json());
  } catch {
    return null;
  }
}

/**
 * Parse an ok (2xx) response body — text-first, then JSON. An empty body
 * (204 No Content, whitespace-only, or the measured 200-with-no-body
 * mark-read shape: MessagingController.markAsRead →
 * ResponseEntity.ok().build()) resolves to null instead of throwing
 * "Unexpected end of JSON input" inside json() — the Task-65 seam that
 * surfaced as a 500 from the Server Action and an unhandled rejection
 * in the browser.
 */
async function parseOkBody<T>(res: Response): Promise<T> {
  const text = (await res.text()).trim();
  return (text.length === 0 ? null : JSON.parse(text)) as T;
}
