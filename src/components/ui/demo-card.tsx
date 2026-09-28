import type { ReactNode } from "react";
import type { ListingCategory, ListingSummary } from "@/lib/api/types";
import { demoCategoryLabel } from "@/lib/demo-listings";
import { Badge } from "./badge";
import { PriceTag } from "./price";

/**
 * One display-data card (بيانات عرض) — the owner's seed-content decision
 * (2026-09-29). Mirrors the ListingCard structure but is a STATIC
 * article: no link (the demo id is not a backend UUID — the public detail
 * read would 404), no hover affordance (nothing to open), and the
 * «بيانات عرض» badge on every card so the showcase can never be mistaken
 * for real inventory. The category label rides the live registry's naming
 * chain (nameAr → nameEn → code) when the registry read succeeded.
 */
export function DemoListingCard({ listing, categories }: {
  listing: ListingSummary;
  categories: readonly ListingCategory[] | null;
}) {
  return (
    <article className="listing-card demo-listing-card">
      <h3>{listing.title}</h3>
      <p className="listing-meta">
        <Badge tone="new">بيانات عرض</Badge>
        <Badge tone="muted">{demoCategoryLabel(categories, listing.category)}</Badge>
        <span>{listing.providerName}</span>
      </p>
      <PriceTag price={listing.price} currency={listing.currency} />
    </article>
  );
}

/**
 * The demo showcase grid + its honest notice. The note always states the
 * REAL active-listing count the backend just served (never hidden), the
 * self-retiring rule (the showcase disappears at the storefront floor),
 * and — when `supplementNote` is provided — where the real rows render.
 */
export function DemoShowcase({ listings, categories, realCount, note }: {
  listings: readonly ListingSummary[];
  categories: readonly ListingCategory[] | null;
  realCount: number;
  note?: ReactNode;
}) {
  return (
    <div className="demo-showcase">
      <p className="demo-note" role="status">
        بيانات عرض توضيحية — المنصة في طور الإطلاق، ويحلّ المحتوى الحقيقي
        محلها تلقائيًا فور اكتماله (الإعلانات النشطة الحقيقية حاليًا:{" "}
        {new Intl.NumberFormat("ar").format(realCount)}).
        {note ? <> {note}</> : null}
      </p>
      <ul className="listing-grid">
        {listings.map((listing) => (
          <li key={listing.id}>
            <DemoListingCard listing={listing} categories={categories} />
          </li>
        ))}
      </ul>
    </div>
  );
}
