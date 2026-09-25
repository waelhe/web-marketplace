import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

// The GDPR Art. 20 data-subject export download (batch-2 spec §3):
// session cookie in, backend export out — the SAME token resolution
// as the /api/backend relay (route-handler context is where the
// account cookie's Set-Cookie lands, per the measured DB-less note
// there), so the browser gets a native download with the backend's
// own JSON verbatim. No data is recomposed, filtered, or stored.
export async function GET(_req: NextRequest): Promise<Response> {
  const h = await headers();

  const session = await auth.api.getSession({ headers: h });
  if (!session) {
    return NextResponse.json({ error: "unauthenticated", reauth: true }, { status: 401 });
  }
  // Official DB-less token selection (measured in better-auth 1.7.5 —
  // the relay's own note): the signed account cookie the OAuth
  // callback wrote; auto-refresh included.
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
    return NextResponse.json({ error: "no_token", reauth: true }, { status: 401 });
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/users/me/export`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    // Expected failures pass through as the backend's own status —
    // never a 500 on an expected state (the official error guide).
    const body = await upstream.arrayBuffer();
    const res = new NextResponse(body, { status: upstream.status });
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.headers.set("content-type", contentType);
    return res;
  }

  // The user's own document, attachment-dispositioned for a native
  // browser download — generated fresh by the backend on every call.
  const body = await upstream.arrayBuffer();
  const res = new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="my-data-export.json"',
      "cache-control": "no-store",
    },
  });
  return res;
}
