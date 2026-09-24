import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListingDetail } from "@/lib/api/public";
import { formatDate } from "@/lib/format";
import { problemMessage } from "@/lib/problem";
import type { ListingDetail, PropertyType } from "@/lib/api/types";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { PriceTag } from "@/components/ui/price";
import { EmptyState } from "@/components/ui/empty-state";
import { ShareButton } from "./share-button";
import { LeadForm } from "../lead-form";

// The public listing detail — the page the backend's L39 SEO contract
// points at (CatalogProperties.listingPath defaults to "/listings/{id}":
// the backend composes its JSON-LD url and sitemap entries against THIS
// route). One backend GET per request (React cache() dedups the metadata
// read and the body read — the L40 view-counter contract).
//
// The backend-composed schema.org RealEstateListing block is embedded
// VERBATIM (the packaged JSON-LD guide's <script type="application/ld+json">
// with `<` escaped) — the backend supplies the measured facts; the
// frontend never recomposes them.
//
// Task 7 composition (compose only — no new fetches, no new tokens):
// PageHeader + Badge + PriceTag + client-only ShareButton (Web Share API
// with copy-link fallback) + an honest EmptyState gallery. CUT with
// evidence: reviews (provider-scoped read, no providerId on the detail
// payload), gallery images (media read is authenticated-only), similar,
// save (zero live contracts — Task 0). Lead-form logic untouched.

type ListingPageProps = PageProps<"/listings/[id]">;

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getListingDetail(id);

  if (!result.ok) {
    // Unknown/inactive listing: the page itself answers 404 — keep the
    // URL out of indexes meanwhile.
    return {
      title: "إعلان غير موجود",
      robots: { index: false },
    };
  }

  const listing = result.data;
  return {
    title: listing.title,
    description: listing.description ?? `${listing.title} — إعلان في السوق`,
    alternates: { canonical: `/listings/${listing.id}` },
    openGraph: {
      title: listing.title,
      description: listing.description ?? undefined,
      type: "website",
      url: `/listings/${listing.id}`,
    },
  };
}

/** UI labels of the MEASURED PropertyType enum (shared-api port). */
const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: "شقة",
  VILLA: "فيلا",
  LAND: "أرض",
  SHOP: "محل تجاري",
  OFFICE: "مكتب",
  GARAGE: "كراج",
};

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const result = await getListingDetail(id);

  if (!result.ok) {
    if (result.status === 404) {
      // The backend's own contract: INACTIVE/ARCHIVED/unknown ids answer
      // 404 on the public surface — the page mirrors it (not-found UI).
      notFound();
    }
    return (
      <main>
        <h1>تفاصيل الإعلان</h1>
        {result.status === 0 ? (
          <p className="page-note" role="status">
            الخادم الخلفي غير متاح حالياً — لا يمكن قراءة الإعلان الآن.
          </p>
        ) : (
          <p className="page-note" role="status">
            {problemMessage(result.problem, `تعذّر قراءة الإعلان (رمز ${result.status}).`)}
          </p>
        )}
        <p>
          <Link href="/listings">كل الإعلانات</Link>
        </p>
      </main>
    );
  }

  const listing = result.data;
  return (
    <main>
      {listing.jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            // The packaged JSON-LD guide: escape `<` (unicode equivalent)
            // so the payload cannot carry markup — XSS-safe embedding.
            __html: JSON.stringify(listing.jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}

      <p className="listing-crumb">
        <Link href="/listings">الإعلانات</Link> / <span>{listing.category}</span>
      </p>
      <PageHeader title={listing.title} actions={<ShareButton title={listing.title} />} />

      <section className="card" aria-label="بيانات الإعلان">
        <PriceTag price={listing.price} currency={listing.currency} />
        <p className="listing-meta">
          <Badge tone="muted">{listing.category}</Badge>
          {listing.maxGuests !== null ? (
            <>
              <span>·</span>
              <span>يتّسع لـ{new Intl.NumberFormat("ar").format(listing.maxGuests)} ضيوف</span>
            </>
          ) : null}
        </p>
        {listing.description ? <p className="listing-description">{listing.description}</p> : null}
        <p className="page-note">آخر تحديث: {formatDate(listing.updatedAt)}</p>
      </section>

      {listing.property ? <PropertySection listing={listing} /> : null}

      {/* Gallery images CUT (R23/R33): the only media read
          (GET /api/v1/media/listings/{id}) is authenticated-only
          (src/lib/api/media.ts — backendGet with session), so a public
          SEO page must not fetch it. Zero images render EmptyState —
          never stock photos. */}
      <section aria-labelledby="gallery-heading">
        <h2 id="gallery-heading">صور الإعلان</h2>
        <EmptyState
          title="لا توجد صور متاحة"
          hint="لم تُنشر صور لهذا الإعلان على السطح العام بعد."
        />
      </section>

      {/* Reviews DROPPED (R6/R33): the only reviews read is
          provider-scoped (GET /api/v1/reviews/provider/{providerId},
          Task 0) and the detail payload carries no providerId
          (src/lib/api/types.ts ListingDetail — measured live) — nothing
          to derive, so no block and no invented contract. Similar/save
          CUT per Task 0 (zero similar/bookmark paths) — share-only. */}

      {/* L34 — the mediated-contact model: a public form (no account
          required) that reaches the provider through their inbox. */}
      <section className="card" aria-labelledby="contact-heading">
        <h2 id="contact-heading">تواصل مع صاحب الإعلان</h2>
        <p className="page-note">
          اترك اسمك ورقمك ورسالتك — يصل الطلب إلى صاحب الإعلان في صندوقه، ويتواصل معك
          مباشرة. لا حاجة لحساب.
        </p>
        <LeadForm listingId={listing.id} />
      </section>

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}

function PropertySection({ listing }: { listing: ListingDetail }) {
  const property = listing.property!;
  const rows: Array<[string, string]> = [
    ["الغرض", property.purpose === "SALE" ? "للبيع" : "للإيجار"],
    ["النوع", PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType],
  ];
  if (property.areaM2 !== null)
    rows.push(["المساحة", `${new Intl.NumberFormat("ar").format(property.areaM2)} م²`]);
  if (property.rooms !== null)
    rows.push(["الغرف", new Intl.NumberFormat("ar").format(property.rooms)]);
  if (property.bathrooms !== null)
    rows.push(["دورات المياه", new Intl.NumberFormat("ar").format(property.bathrooms)]);
  if (property.floorNumber !== null)
    rows.push([
      "الطابق",
      property.totalFloors !== null
        ? `${new Intl.NumberFormat("ar").format(property.floorNumber)} من ${new Intl.NumberFormat("ar").format(property.totalFloors)}`
        : new Intl.NumberFormat("ar").format(property.floorNumber),
    ]);
  if (property.buildingYear !== null)
    rows.push(["سنة البناء", new Intl.NumberFormat("ar").format(property.buildingYear)]);
  if (property.furnished !== null) rows.push(["التجهيز", property.furnished ? "مُجهّز" : "غير مُجهّز"]);
  if (property.availableFrom !== null) rows.push(["متاح من", formatDate(property.availableFrom)]);

  return (
    <section className="card" aria-label="تفاصيل العقار">
      <h2>تفاصيل العقار</h2>
      <dl className="property-facts">
        {rows.map(([label, value]) => (
          <div key={label} className="property-fact">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {property.amenities && property.amenities.length > 0 ? (
        <>
          <h3>المزايا</h3>
          <ul className="amenity-list">
            {property.amenities.map((amenity) => (
              <li key={amenity}>{amenity}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
