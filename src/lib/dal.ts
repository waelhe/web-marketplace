/**
 * Data Access Layer (DAL) — the officially recommended centralization point
 * for session reads and authorization logic (packaged Next.js 16.3.5
 * authentication guide: "Creating a Data Access Layer").
 *
 * React's cache() memoizes the session per render pass so any number of
 * server components can call getSession() without repeating the auth round
 * trip. `next/headers` itself enforces the server boundary at build time
 * (importing it from a client component is a build error), which is why the
 * optional `server-only` package is deliberately NOT added — zero new
 * dependencies for the same guard (repo rule: no dependency unless
 * measured-needed; recorded in README decisions).
 */

import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export interface DalSession {
  userId: string;
  name: string | null;
  email: string;
}

/** Memoized session read — one auth resolution per render pass. */
export const getSession = cache(async (): Promise<DalSession | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return {
    userId: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email,
  };
});
