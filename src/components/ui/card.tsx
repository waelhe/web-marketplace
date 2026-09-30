import Link from "next/link";
import type { ListingSummary } from "@/lib/api/types";
import { Badge } from "./badge";
import { PriceTag } from "./price";

/**
 * The public listing card (home strips + browse grid). The 4:3 cover
 * image is the approved browse-platform spec's card design («صورة 4:3 +
 * شارات»); `coverUrl` is OPTIONAL — the caller resolves it through the
 * public media read (resolveCoverUrls) and a listing without photos
 * renders the text-first shape unchanged (never a broken image, never
 * a stock photo).
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
      <PriceTag price={listing.price} currency={listing.currency} />
    </Link>
  );
}
