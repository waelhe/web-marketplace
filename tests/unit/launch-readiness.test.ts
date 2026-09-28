import { describe, expect, test } from "vitest";
import type { MetadataRoute } from "next";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { GET as healthGET } from "@/app/api/health/route";

// The S5 launch-readiness layer under test: the crawl policy (robots.txt),
// the public-hub sitemap, and the uptime probe. All three are pure
// artifacts — the canonical launch contracts, asserted without any server
// (the e2e smoke net additionally asserts them over real HTTP).

type RobotsRule = { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] };

function rulesOf(policy: MetadataRoute.Robots): RobotsRule[] {
  return Array.isArray(policy.rules) ? policy.rules : [policy.rules];
}

function asArray(value?: string | string[]): string[] {
  return typeof value === "string" ? [value] : (value ?? []);
}

const ORIGIN = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

describe("robots(): the crawl policy (S5)", () => {
  const policy = robots();
  const rules = rulesOf(policy);

  test("one rule set governs every crawler", () => {
    expect(rules).toHaveLength(1);
    expect(rules[0].userAgent).toBe("*");
  });

  test("the private surfaces and the API relay are out of every crawl budget", () => {
    const disallow = asArray(rules[0].disallow);
    for (const path of [
      "/admin",
      "/api/",
      "/provider",
      "/profile",
      "/inbox",
      "/bookings",
      "/neighborhood",
    ]) {
      expect(disallow).toContain(path);
    }
  });

  test("THE /neighborhood PREFIX TRAP: the public geo picker stays allowed", () => {
    // Disallow /neighborhood (private) prefix-matches /neighborhoods
    // (public) under the Robots Exclusion Standard; the LONGER allow rule
    // must exist or the picker is silently blocked (the standard's
    // longest-prefix-wins resolution — one character apart, opposite
    // policies).
    const allow = asArray(rules[0].allow);
    expect(allow).toContain("/");
    expect(allow).toContain("/neighborhoods");
    expect("/neighborhoods".length).toBeGreaterThan("/neighborhood".length);
  });

  test("/search is NEVER disallowed — its noindex meta must stay crawler-visible", () => {
    const disallow = asArray(rules[0].disallow);
    expect(disallow.some((p) => p === "/search" || p.startsWith("/search"))).toBe(false);
  });

  test("the sitemap pointer rides the app origin", () => {
    expect(typeof policy.sitemap).toBe("string");
    expect(policy.sitemap).toBe(`${ORIGIN}/sitemap.xml`);
  });
});

describe("sitemap(): the public hubs (S5)", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);

  test("the four stable public hub routes are listed", () => {
    expect(urls).toContain(`${ORIGIN}/`);
    expect(urls).toContain(`${ORIGIN}/listings`);
    expect(urls).toContain(`${ORIGIN}/neighborhoods`);
    expect(urls).toContain(`${ORIGIN}/register`);
    expect(urls).toHaveLength(4);
  });

  test("a sitemap is a list of indexable URLs — the noindexed /search never enters it", () => {
    expect(urls.some((u) => u.includes("/search"))).toBe(false);
  });

  test("no private surface is ever listed (robots.txt contradiction guard)", () => {
    // Path-segment semantics, NOT substring: /neighborhoods is PUBLIC and
    // merely string-starts-with the PRIVATE /neighborhood — the same
    // one-character prefix trap the robots.txt rule navigates. A URL is
    // "under" a private prefix only on an exact match or a real child
    // path (/prefix/…), never on a longer sibling word.
    const PRIVATE_PREFIXES = [
      "/admin",
      "/provider",
      "/profile",
      "/inbox",
      "/bookings",
      "/neighborhood",
      "/api",
    ];
    const isUnder = (path: string, prefix: string) =>
      path === prefix || path.startsWith(`${prefix}/`);
    for (const entry of entries) {
      const path = new URL(entry.url).pathname;
      expect(PRIVATE_PREFIXES.some((p) => isUnder(path, p))).toBe(false);
    }
  });

  test("every entry carries the full contract shape", () => {
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https?:\/\//);
      expect(entry.lastModified).toBeInstanceOf(Date);
      expect(entry.changeFrequency).toBeDefined();
      expect(typeof entry.priority).toBe("number");
    }
  });
});

describe("GET /api/health: the uptime probe contract (S5)", () => {
  test("answers 200 with the exact body, no session required", async () => {
    const res = await healthGET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  test("no-store — a monitor never reads a stale cache", async () => {
    const res = await healthGET();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
