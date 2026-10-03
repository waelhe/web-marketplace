import type { Metadata } from "next";
import Link from "next/link";
import { getListingCategories, browseListingsByCategory, LISTINGS_PAGE_SIZE } from "@/lib/api/public";
import { formatPrice } from "@/lib/format";
import { problemMessage } from "@/lib/problem";

// W2 (yelp-level plan §5 — G23, #494→#489): the PUBLIC CATEGORY PAGE —
// the «فئة/سباكة-الرياض» landing page the backend's sitemap now
// advertises (`/categories/{code}` — CatalogProperties.seo's own
// default path template; the sitemap's category URLs point HERE at the
// public-site origin). One registry read resolves the code → the
// category's display names (the registry is the vocabulary — an
// unknown code is the honest 404, never an invented category); the
// dedicated category browse serves its ACTIVE listings (the S4
// measured op: byte-identical content to the /listings?category=
// branch, an unknown category answers 200 with an empty envelope).
//
// SEO discipline (the S4/S5 decisions): this page is the category's
// CANONICAL home — indexable with its own canonical URL, linked from
// the /listings category state (the additive link, no existing
// contract touched). The interactive browse state (/listings?category=)
// stays the working surface it always was; this page is the stable
// landing the crawler and the shared link need.

type CategoryPageProps = PageProps<"/categories/[code]">;

/** Parse ?page= (1-based for humans) into the backend's 0-based page. */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return parsed - 1;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { code } = await params;
  const registry = await getListingCategories();
  const category = registry.ok
    ? registry.data.find((row) => row.code === code)
    : undefined;

  if (!category) {
    // Unknown category code: the honest 404 — keep the URL out of
    // indexes meanwhile (the registry IS the vocabulary).
    return {
      title: "فئة غير موجودة",
      robots: { index: false },
    };
  }

  const name = category.nameAr ?? category.nameEn ?? category.code;
  return {
    title: `إعلانات ${name}`,
    description: `تصفّح إعلانات ${name} النشطة في سوق قدسيا — الشقق والإقامات المعروضة الآن.`,
    alternates: { canonical: `/categories/${category.code}` },
    openGraph: {
      title: `إعلانات ${name}`,
      url: `/categories/${category.code}`,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { code } = await params;
  const sp = await searchParams;
  const page = parsePage(sp?.page);

  // The registry read IS the code's validator (the vocabulary's single
  // source — never an invented category row).
  const registry = await getListingCategories();
  const category = registry.ok
    ? registry.data.find((row) => row.code === code)
    : null;

  if (registry.ok && !category) {
    // Unknown code: the registry's own honest answer — the 404 boundary.
    return (
      <main>
        <h1>الفئة غير موجودة</h1>
        <p className="page-note" role="status">
          لا فئة بهذا الرمز في سجل الفئات — تصفّح{" "}
          <Link href="/listings">كل الإعلانات</Link> أو اختر فئة من الشريط.
        </p>
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const name = category
    ? category.nameAr ?? category.nameEn ?? category.code
    : code;

  // The dedicated category browse (the S4 measured op — one paged read).
  const result = await browseListingsByCategory(code, page, LISTINGS_PAGE_SIZE);

  return (
    <main>
      <p className="listing-crumb">
        <Link href="/">الرئيسية</Link> / <Link href="/listings">الإعلانات</Link> /{" "}
        <span>{name}</span>
      </p>
      <h1>إعلانات {name}</h1>

      {!result.ok ? (
        <>
          <p className="page-note" role="status">
            {result.status === 0
              ? "الخادم الخلفي غير متاح حالياً — لا يمكن قراءة إعلانات الفئة الآن."
              : problemMessage(
                  result.problem,
                  `تعذّرت قراءة إعلانات الفئة (رمز ${result.status}).`,
                )}
          </p>
          <p>
            <Link href="/listings">كل الإعلانات</Link>
          </p>
        </>
      ) : result.data.content.length === 0 ? (
        <p className="page-note" role="status">
          لا إعلانات نشطة في هذه الفئة حالياً — عد لاحقاً أو تصفّح كل الإعلانات.
        </p>
      ) : (
        <>
          <p className="page-note">
            {new Intl.NumberFormat("ar").format(result.data.totalElements)} إعلان نشط —
            الصفحة {new Intl.NumberFormat("ar").format(result.data.pageNumber + 1)} من{" "}
            {new Intl.NumberFormat("ar").format(Math.max(result.data.totalPages, 1))}
          </p>
          <ul className="listing-grid">
            {result.data.content.map((listing) => (
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
          <nav className="listing-pager" aria-label="تصفّح إعلانات الفئة">
            {result.data.pageNumber > 0 ? (
              <Link
                className="button"
                href={`/categories/${encodeURIComponent(code)}?page=${result.data.pageNumber}`}
              >
                الصفحة السابقة
              </Link>
            ) : null}
            {!result.data.last ? (
              <Link
                className="button"
                href={`/categories/${encodeURIComponent(code)}?page=${result.data.pageNumber + 2}`}
              >
                الصفحة التالية
              </Link>
            ) : null}
          </nav>
        </>
      )}

      <p>
        <Link href="/listings">كل الإعلانات</Link>
      </p>
    </main>
  );
}
