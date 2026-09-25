import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProviderPublicPage } from "@/lib/api/reputation";
import { PROVIDER_PAGE_LISTINGS_SIZE } from "@/lib/api/reputation-contract";
import {
  ACTOR_TYPE_LABELS,
  PROVIDER_STATUS_LABELS,
} from "@/lib/api/provider-contract";
import { formatDate, formatPrice } from "@/lib/format";
import { problemMessage } from "@/lib/problem";

// The L36 public provider page — the app's SECOND SEO surface (roadmap
// stage 5, السمعة). The backend composes the whole page in one read
// (`GET /providers/{id}/public`: profile + fresh aggregate rating +
// the ACTIVE-listings block), addressed by the provider PROFILE id.
// Anonymous visitors and crawlers see the same page — measured: the
// endpoint has no auth gate (unknown ids answer 404 NF-001, not 401),
// so this page renders with NO session read at all.
//
// The VERIFIED gate is the backend's own contract: the listings block
// is served only for VERIFIED profiles (a suspended broker's inventory
// is hidden on his page — an honest empty block); the profile itself
// stays visible with its status. The rating block rides the same
// response; the full reviews LIST cannot be rendered here (reviews are
// keyed by the provider USER id, which no public read exposes — the
// declared §10 gap), so the aggregate is the honest public summary.

type ProviderPageProps = PageProps<"/providers/[id]">;

/** Parse ?page= (1-based for humans) into the backend's 0-based page. */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return parsed - 1;
}

export async function generateMetadata({
  params,
  searchParams,
}: ProviderPageProps): Promise<Metadata> {
  const { id } = await params;
  const sp = await searchParams;
  const page = parsePage(sp?.page);
  const result = await getProviderPublicPage(id, page, PROVIDER_PAGE_LISTINGS_SIZE);

  if (!result.ok) {
    // Unknown provider: the page itself answers 404 — keep the URL out
    // of indexes meanwhile.
    return {
      title: "مزوّد غير موجود",
      robots: { index: false },
    };
  }

  const provider = result.data;
  const name = provider.displayName;
  return {
    title: name,
    description:
      provider.bio ??
      `${name} — صفحة المزوّد العامّة في السوق: الإعلانات النشطة والتقييم`,
    alternates: { canonical: `/providers/${provider.id}` },
    openGraph: {
      title: name,
      description: provider.bio ?? undefined,
      type: "profile",
      url: `/providers/${provider.id}`,
    },
  };
}

/** The rating block — the honest aggregate (null = no reviews yet). */
function RatingBlock({
  average,
  count,
}: {
  average: number | null;
  count: number;
}) {
  if (average === null || count === 0) {
    return <p className="page-note">لا مراجعات بعد.</p>;
  }
  return (
    <p className="listing-meta">
      <span className="stat-value">
        {new Intl.NumberFormat("ar", { maximumFractionDigits: 1 }).format(average)}
      </span>
      <span>من ٥</span>
      <span>·</span>
      <span>{new Intl.NumberFormat("ar").format(count)} مراجعة</span>
    </p>
  );
}

export default async function ProviderPublicPage({
  params,
  searchParams,
}: ProviderPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const page = parsePage(sp?.page);
  const result = await getProviderPublicPage(id, page, PROVIDER_PAGE_LISTINGS_SIZE);

  if (!result.ok) {
    if (result.status === 404) {
      // The backend's own contract: unknown provider ids answer 404
      // NF-001 on the public page read — the page mirrors it.
      notFound();
    }
    return (
      <main>
        <h1>صفحة المزوّد</h1>
        {result.status === 0 ? (
          <p className="page-note" role="status">
            الخادم الخلفي غير متاح حالياً — لا يمكن قراءة صفحة المزوّد الآن.
          </p>
        ) : (
          <p className="page-note" role="status">
            {problemMessage(result.problem, `تعذّر قراءة صفحة المزوّد (رمز ${result.status}).`)}
          </p>
        )}
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const provider = result.data;
  const listings = provider.listings;

  return (
    <main>
      <p className="listing-crumb">
        <Link href="/">الرئيسية</Link> / <span>{provider.displayName}</span>
      </p>
      <h1>{provider.displayName}</h1>

      <section className="card" aria-label="ملف المزوّد">
        <p className="listing-meta">
          <span className="listing-category">
            {ACTOR_TYPE_LABELS[provider.actorType] ?? provider.actorType}
          </span>
          <span>·</span>
          <span className="listing-category">
            {PROVIDER_STATUS_LABELS[provider.status] ?? provider.status}
          </span>
        </p>
        {provider.agencyName ? (
          <p className="listing-meta">
            <span>المكتب: {provider.agencyName}</span>
          </p>
        ) : null}
        {provider.licenseNumber ? (
          <p className="listing-meta">
            <span>رقم الترخيص: {provider.licenseNumber}</span>
          </p>
        ) : null}
        {provider.bio ? <p className="listing-description">{provider.bio}</p> : null}
        <p className="page-note">عضو منذ {formatDate(provider.createdAt)}</p>

        <h2>التقييم</h2>
        <RatingBlock
          average={provider.ratingAverage}
          count={provider.reviewCount}
        />
      </section>

      <section className="card" aria-labelledby="provider-listings-heading">
        <h2 id="provider-listings-heading">الإعلانات النشطة</h2>
        {provider.status !== "VERIFIED" ? (
          <p className="page-note" role="status">
            يعرض الباك اند إعلانات المزوّد الموثّق فقط — لا إعلانات معروضة
            على هذه الصفحة بحالته الحالية.
          </p>
        ) : listings.content.length === 0 ? (
          <p className="page-note" role="status">
            لا إعلانات نشطة لهذا المزوّد حالياً.
          </p>
        ) : (
          <>
            <p className="page-note">
              {new Intl.NumberFormat("ar").format(listings.totalElements)} إعلان نشط —
              الصفحة {new Intl.NumberFormat("ar").format(listings.pageNumber + 1)} من{" "}
              {new Intl.NumberFormat("ar").format(Math.max(listings.totalPages, 1))}
            </p>
            <ul className="listing-grid">
              {listings.content.map((listing) => (
                <li key={listing.id}>
                  <Link href={`/listings/${listing.id}`} className="listing-card">
                    <h3>{listing.title}</h3>
                    <p className="listing-meta">
                      <span className="listing-category">{listing.category}</span>
                    </p>
                    <p className="listing-price">
                      {formatPrice(listing.price, listing.currency)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <nav className="listing-pager" aria-label="تصفّح إعلانات المزوّد">
              {listings.pageNumber > 0 ? (
                <Link
                  className="button"
                  href={`/providers/${provider.id}?page=${listings.pageNumber}`}
                >
                  الصفحة السابقة
                </Link>
              ) : null}
              {!listings.last ? (
                <Link
                  className="button"
                  href={`/providers/${provider.id}?page=${listings.pageNumber + 2}`}
                >
                  الصفحة التالية
                </Link>
              ) : null}
            </nav>
          </>
        )}
      </section>

      <p>
        <Link href="/listings">كل الإعلانات</Link>
      </p>
    </main>
  );
}
