import type { MetadataRoute } from "next";

// Launch-readiness sitemap (slice S5, charter §6 "SEO"): the STABLE public
// hub routes only — the same origin discipline as the layout's
// metadataBase (BETTER_AUTH_URL, one env fact, no second variable to
// drift). Deliberately honest omissions, each a measured decision:
//
// - `/search` is `noindex, follow` (the S5 duplicate-content decision) —
//   a sitemap is a list of canonical, indexable URLs; a noindexed surface
//   never enters it.
// - `/listings/[id]` detail URLs are NOT enumerated: no public "all ids"
//   read exists in the 128-op contract, and a data-driven sitemap would
//   couple a static build artifact to a request-time backend read. Detail
//   pages are discovered through the crawlable `/listings` pagination +
//   provider pages (the classic discovery path). When seed content lands
//   (the owner input), a data-driven sitemap extension is the natural
//   follow-up.
// - `/providers/[id]` same discipline: discovered via links, not listed.
// - Every private surface (`/admin`, `/provider`, `/profile`, `/inbox`,
//   `/bookings`, `/neighborhood`) is robots-excluded — listing any of
//   them here would contradict robots.txt.
//
// `sitemap.ts` is a special route handler cached at build (the packaged
// Next docs' file-conventions guide): `lastModified: new Date()` is the
// build stamp — the honest statement of "this is the shape as of this
// deploy", never a per-request freshness claim.

const appOrigin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${appOrigin}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${appOrigin}/listings`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${appOrigin}/neighborhoods`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${appOrigin}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
