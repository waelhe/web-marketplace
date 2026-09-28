import type { MetadataRoute } from "next";

// Launch-readiness crawl policy (slice S5, charter §6 "SEO"): the robots
// exclusion contract for the marketplace's own origin — public surfaces
// crawlable, private ones (the authenticated areas + the API relay) out of
// every crawler's crawl budget. The per-page `noindex` metas already keep
// the private surfaces out of indexes; this file keeps crawlers from
// SPENDING budget there at all (Google Search Central: robots.txt is the
// crawl gate, the meta robots is the index gate — belt and suspenders).
//
// THE /neighborhood PREFIX TRAP (measured against the Robots Exclusion
// Standard's prefix matching): `Disallow: /neighborhood` (the PRIVATE
// community home) would also block the PUBLIC geo picker `/neighborhoods`.
// The explicit `Allow: /neighborhoods` is one character longer, and the
// standard's most-specific-rule-wins resolution (the longest matching
// prefix governs) keeps the public picker crawlable while its private
// sibling stays blocked — the two surfaces are one character apart and
// opposite in policy.
//
// `/search` stays CRAWLABLE (never disallowed): it renders
// `noindex, follow` (the S5 duplicate-content decision — its category
// state duplicates `/listings?category=` byte-identically, measured in
// S4), and a robots-blocked page's noindex meta can never be SEEN by the
// crawler. Crawlable-but-noindexed is the only combination that lets the
// directive take effect while `follow` keeps passing link equity through
// the category rail to the listings.

const appOrigin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/neighborhoods"],
        disallow: [
          "/admin",
          "/api/",
          "/provider",
          "/profile",
          "/inbox",
          "/bookings",
          "/neighborhood",
        ],
      },
    ],
    sitemap: `${appOrigin}/sitemap.xml`,
  };
}
