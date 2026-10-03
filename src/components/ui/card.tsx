import Link from "next/link";
import type { ListingSummary } from "@/lib/api/types";
import { Badge } from "./badge";
import { PriceTag } from "./price";

/**
 * The public listing card (home strips + browse grid + search results).
 * The 4:3 cover image is the approved browse-platform spec's card design
 * («صورة 4:3 + شارات»); `coverUrl` is OPTIONAL — the caller resolves it
 * through the public media read (resolveCoverUrls) and a listing without
 * photos renders the text-first shape unchanged (never a broken image,
 * never a stock photo).
 *
 * W3 (G20 — stars in results): the provider's verified stars ride the
 * card when the row carries the measured pair — the RatingChip display
 * discipline (one decimal, Arabic numerals, «من ٥» + the count). A null
 * rating is the honest not-yet-rated row and renders NOTHING (never a
 * fabricated zero); a row from a pre-W3 backend (the field undefined on
 * the wire) degrades to the same honest silence — the adaptation seam,
 * not a contract change.
 *
 * Presigned URLs: the storage host is runtime deployment data (not a
 * build-time known origin), so plain <img> — next/image remotePatterns
 * cannot encode it without inventing a host. TTL 15m; the pages are
 * dynamic. Same measured discipline as the provider gallery.
 */
export function ListingCard({
  listing,
  coverUrl,
}: {
  listing: ListingSummary;
  coverUrl?: string | null;
}) {
  return (
    <Link href={`/listings/${listing.id}`} className="listing-card">
      {typeof coverUrl === "string" && coverUrl.length > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="listing-card-cover"
          src={coverUrl}
          alt={listing.title}
          loading="lazy"
        />
      ) : null}
      <h2>{listing.title}</h2>
      <p className="listing-meta">
        <Badge tone="muted">{listing.category}</Badge>
        <span>{listing.providerName}</span>
      </p>
      <ProviderStarsCard
        rating={listing.providerRating}
        reviewCount={listing.providerReviewCount}
      />
      <PriceTag price={listing.price} currency={listing.currency} />
    </Link>
  );
}

/**
 * The card's stars line — the compact twin of the provider page's
 * RatingChip («٤٫٥ من ٥ · ١٢ مراجعة»). Rendered only for a RATED
 * provider (a finite rating); null and count-less rows stay silent.
 */
function ProviderStarsCard({
  rating,
  reviewCount,
}: {
  rating: number | null | undefined;
  reviewCount: number | null | undefined;
}) {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return null;
  const count =
    typeof reviewCount === "number" && Number.isFinite(reviewCount)
      ? reviewCount
      : 0;
  const formatted = new Intl.NumberFormat("ar", {
    maximumFractionDigits: 1,
  }).format(rating);
  return (
    <p className="listing-meta" aria-label={`تقييم المزوّد ${formatted} من ٥`}>
      <span className="stat-value">{formatted}</span>
      <span>من ٥</span>
      {count > 0 ? (
        <>
          <span>·</span>
          <span>{new Intl.NumberFormat("ar").format(count)} مراجعة</span>
        </>
      ) : null}
    </p>
  );
}
