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
  // expiry window and the provider refresh fails — including the measured
  // DB-less edge where an RSC render cannot land the rotated refresh token
  // (SAS reuseRefreshTokens=false), so the rotation is consumed and lost.
  // That state is a re-auth signal (401), never a crash of the render.
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
    });
  } catch {
    // Network-level failure: backend unreachable (e.g. local backend not
    // started). Honest, expected state — surfaced as data, not a crash.
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

  return { ok: true, data: (await upstream.json()) as T, status: upstream.status };
}

/**
 * Direct backend WRITE for Server Actions — the mutating-data counterpart
 * of backendGet, on the identical channel discipline: resolve the session
 * Bearer (auto-refresh included), call BACKEND_URL directly (never a
 * self-fetch through the /api/backend route handler), return expected
 * failures as data. `body` is JSON-serialized; `method` is PUT/POST/DELETE.
 *
 * The official security contract rides two layers: the framework's
 * Server-Action boundary (POST-only, Origin/Host CSRF check) and the
 * backend's resource-server chain (401/403/404 gates) — the backend is
 * the authorization authority; this channel only carries the session's
 * own token. 204 No Content resolves to `data: null`.
 */
export async function backendSend<T>(
  method: "PUT" | "POST" | "DELETE",
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
    });
  } catch {
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

  return { ok: true, data: (await upstream.json()) as T, status: upstream.status };
}

async function decodeBody(res: Response): Promise<ProblemDetail | null> {
  try {
    return decodeProblem(await res.json());
  } catch {
    return null;
  }
}
