import Link from "next/link";
import type { ListingSummary } from "@/lib/api/types";
import { Badge } from "./badge";
import { PriceTag } from "./price";

export function ListingCard({ listing }: {
  listing: ListingSummary;
}) {
  return (
    <Link href={`/listings/${listing.id}`} className="listing-card">
      <h2>{listing.title}</h2>
      <p className="listing-meta">
        <Badge tone="muted">{listing.category}</Badge>
        <span>{listing.providerName}</span>
      </p>
      <PriceTag price={listing.price} currency={listing.currency} />
    </Link>
  );
}
