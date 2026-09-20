/**
 * RFC 7807/9457 `application/problem+json` decoder — mirrors the backend
 * error contract (app-java-v3 docs/api/error-contract.md): base ProblemDetail
 * fields plus the Marketplace extensions (errorCode, category, userMessage,
 * fieldErrors). Decoding is defensive: the backend is the source of truth,
 * but proxies/CDNs can mangle or replace bodies, so every field is optional
 * and a non-object payload decodes to null rather than throwing.
 */

export interface ProblemFieldError {
  field: string;
  message: string;
}

export interface ProblemDetail {
  /** Stable error category URI (e.g. https://marketplace.com/errors/not-found). */
  type?: string;
  /** Short, human-readable title. */
  title?: string;
  /** HTTP status code as carried in the body. */
  status?: number;
  /** Human-readable explanation for this occurrence. */
  detail?: string;
  /** Request path or request-specific identifier. */
  instance?: string;
  /** Stable machine-readable taxonomy code (Marketplace extension). */
  errorCode?: string;
  /** Canonical taxonomy category (Marketplace extension). */
  category?: string;
  /** User-facing safe message (Marketplace extension, optional). */
  userMessage?: string;
  /** Field-level validation violations (validation problems only). */
  fieldErrors?: ProblemFieldError[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function decodeFieldErrors(value: unknown): ProblemFieldError[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const decoded = value
    .filter(isRecord)
    .map((entry) => ({
      field: optionalString(entry.field) ?? "",
      message: optionalString(entry.message) ?? "",
    }))
    .filter((entry) => entry.field !== "" || entry.message !== "");
  return decoded.length > 0 ? decoded : undefined;
}

/** Decode a parsed JSON body as a ProblemDetail, or null if it is not one. */
export function decodeProblem(payload: unknown): ProblemDetail | null {
  if (!isRecord(payload)) return null;
  const problem: ProblemDetail = {
    type: optionalString(payload.type),
    title: optionalString(payload.title),
    status: optionalNumber(payload.status),
    detail: optionalString(payload.detail),
    instance: optionalString(payload.instance),
    errorCode: optionalString(payload.errorCode),
    category: optionalString(payload.category),
    userMessage: optionalString(payload.userMessage),
    fieldErrors: decodeFieldErrors(payload.fieldErrors),
  };
  const hasAnyField = Object.values(problem).some((v) => v !== undefined);
  return hasAnyField ? problem : null;
}

/**
 * Best user-facing message from a problem: userMessage (safe by contract)
 * falls back to detail, then title, then the generic Arabic default.
 */
export function problemMessage(problem: ProblemDetail | null, fallback: string): string {
  return problem?.userMessage ?? problem?.detail ?? problem?.title ?? fallback;
}
