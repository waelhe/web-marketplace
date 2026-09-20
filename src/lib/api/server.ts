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
const PROVIDER_ID = "marketplace-web";

export type BackendResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; problem: ProblemDetail | null; unauthenticated: boolean };

/**
 * Resolve the server-side Bearer access token for the current session.
 * Better Auth's getAccessToken auto-refreshes the provider token when
 * expired (stateless account cookie carries the refresh material).
 */
async function resolveBearer(): Promise<string | null> {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) return null;

  const accounts = await auth.api.listUserAccounts({ headers: h });
  const account = accounts.find((a) => a.providerId === PROVIDER_ID);
  if (!account) return null;

  const token = await auth.api.getAccessToken({
    body: { accountId: account.id },
    headers: h,
  });
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

async function decodeBody(res: Response): Promise<ProblemDetail | null> {
  try {
    return decodeProblem(await res.json());
  } catch {
    return null;
  }
}
