import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
const PROVIDER_ID = "marketplace-web";

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
  const accounts = await auth.api.listUserAccounts({ headers: h });
  const account = accounts.find((a) => a.providerId === PROVIDER_ID);
  if (!account) {
    return NextResponse.json({ error: "no_account", reauth: true }, { status: 401 });
  }
  // Auto-refreshes the provider access token when expired (stateless account
  // cookie carries the refresh material).
  const token = await auth.api.getAccessToken({
    body: { accountId: account.id },
    headers: h,
  });
  const accessToken =
    typeof token === "object" && token !== null && "accessToken" in token
      ? String((token as { accessToken: unknown }).accessToken)
      : null;
  if (!accessToken) {
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
