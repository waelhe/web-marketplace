import { NextResponse } from "next/server";

// Launch-readiness uptime probe (slice S5, charter §6 "مراقبة"): the
// frontend's OWN liveness — a pure, dependency-free 200 that external
// uptime monitors (and the deploy-window proofs) can poll. Deliberately
// WITHOUT a backend health fan-out: the backend's health is its own
// domain (its service monitors own it — docs/observability/slo.md), and a
// probe that fails because a DEPENDENCY is down cannot distinguish "web
// down" from "backend down" — two different pages for two different
// on-call owners. This route says exactly one thing: the Next.js server
// is up and routing.
//
// Contract: GET /api/health → 200 {"status":"ok"}, no session required,
// `no-store` so a monitor never reads a stale cache and a deploy swap is
// visible on the very next poll.

export async function GET() {
  return NextResponse.json(
    { status: "ok" },
    { headers: { "cache-control": "no-store" } },
  );
}
