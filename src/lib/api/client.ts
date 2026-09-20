/**
 * Browser-side API access — the BFF proxy consumer.
 *
 * Use ONLY for data that must live on the client (polling, client-only Web
 * APIs, optimistic updates). Server Components use src/lib/api/server.ts
 * directly (official BFF guide); Server Actions mutate through their own
 * handlers. The relay route (/api/backend/[...path]) keeps tokens
 * server-side: the browser only ever sends same-origin cookies.
 *
 * Error model: our relay answers 401 with { error, reauth: true } when the
 * session/token is gone (re-authenticate); upstream failures pass through
 * with their application/problem+json body (RFC 7807 contract), decoded
 * into ApiError.problem.
 */

import { decodeProblem, type ProblemDetail } from "@/lib/problem";

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail | null;
  /** True when the fix is re-authentication (our relay's 401 shape). */
  readonly reauth: boolean;

  constructor(status: number, problem: ProblemDetail | null, reauth: boolean) {
    super(problem?.userMessage ?? problem?.detail ?? `API error ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
    this.reauth = reauth;
  }
}

/** GET through the BFF relay. `path` is backend-relative, e.g. "/api/v1/...". */
export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>("GET", path);
}

/** Mutations through the BFF relay. JSON bodies only (typed by the caller). */
export async function apiSend<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  return apiFetch<T>(method, path, body);
}

async function apiFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, headers: { Accept: "application/problem+json, application/json" } };
  if (body !== undefined) {
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, init);
  const payload = await safeJson(res);

  if (!res.ok) {
    const reauth =
      res.status === 401 && payload !== null && (payload as { reauth?: unknown }).reauth === true;
    throw new ApiError(res.status, decodeProblem(payload), reauth);
  }
  return payload as T;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
