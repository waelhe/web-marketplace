import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListingDetail } from "@/lib/api/public";
import { formatDate, formatPrice } from "@/lib/format";
import { problemMessage } from "@/lib/problem";
import type { ListingDetail, PropertyType } from "@/lib/api/types";

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
      <h1>{listing.title}</h1>

      <section className="card" aria-label="بيانات الإعلان">
        <p className="listing-price">{formatPrice(listing.price, listing.currency)}</p>
        <p className="listing-meta">
          <span className="listing-category">{listing.category}</span>
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
