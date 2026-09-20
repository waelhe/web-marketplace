import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

// BFF bearer relay: session cookie in, backend Bearer out. Tokens stay
// server-side; the browser only ever holds the encrypted session cookie.
// Upstream 401 passes through as 401 (client treats it as re-auth signal,
// decoding RFC 9457 problem+json — labs/platform/03-web.md §3).
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const h = await headers();

  const session = await auth.api.getSession({ headers: h });
  if (!session) {
    return NextResponse.json({ error: "unauthenticated", reauth: true }, { status: 401 });
  }
  // Official DB-less token selection (measured in better-auth 1.7.5,
  // api/routes/account.mjs): `useAccountCookie: true` resolves the OAuth
  // account from the signed account cookie the callback wrote — the store
  // DB-less deployments are designed around (context/create-context.mjs
  // defaults storeAccountCookie: true). The previous `accountId` selection
  // resolved through the in-process memory adapter, which is
  // bundle-instance-local: it only worked in this route by accidentally
  // sharing the callback's bundle, and never in server components.
  // getAccessToken auto-refreshes the provider token when within 5s of
  // expiry and re-signs the account cookie (Set-Cookie lands here — route
  // handler — keeping browser-driven calls converging; RSC contexts drop
  // the write, see src/lib/api/server.ts).
  const token = await auth.api
    .getAccessToken({
      body: { useAccountCookie: true },
      headers: h,
    })
    .catch(() => null);
  const accessToken =
    typeof token === "object" && token !== null && "accessToken" in token
      ? String((token as { accessToken: unknown }).accessToken)
      : null;
  if (!accessToken) {
    // Expected state (not a 500): refresh failed / no account cookie — the
    // client wrapper treats 401 as the re-auth signal.
    return NextResponse.json({ error: "no_token", reauth: true }, { status: 401 });
  }

  const upstream = await fetch(`${BACKEND_URL}/${path.join("/")}${req.nextUrl.search}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/problem+json, application/json",
    },
  });
  const body = await upstream.arrayBuffer();
  const res = new NextResponse(body, { status: upstream.status });
  const contentType = upstream.headers.get("content-type");
  if (contentType) res.headers.set("content-type", contentType);
  return res;
}
