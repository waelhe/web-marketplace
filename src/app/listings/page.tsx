import type { Metadata } from "next";
import Link from "next/link";
import { getActiveListings, LISTINGS_PAGE_SIZE } from "@/lib/api/public";
import { formatPrice } from "@/lib/format";
import { problemMessage } from "@/lib/problem";

// The public browse surface — the first SEO-indexable page of the app
// (anonymous GET, no session read: crawlers see the same page visitors
// do). Data arrives through the public data layer directly from
// BACKEND_URL (packaged BFF guide: server components never self-fetch
// through /api/backend).
export const metadata: Metadata = {
  title: "الإعلانات",
  description: "تصفّح الإعلانات النشطة في السوق — واجهة عامة تصلها محركات البحث",
};

type ListingsPageProps = PageProps<"/listings">;

/** Parse ?page= (1-based for humans) into the backend's 0-based page. */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return parsed - 1;
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const sp = await searchParams;
  const page = parsePage(sp?.page);
  const result = await getActiveListings(page, LISTINGS_PAGE_SIZE);

  return (
    <main>
      <h1>الإعلانات</h1>

      {result.ok ? (
        result.data.content.length === 0 ? (
          page > 0 && result.data.totalElements > 0 ? (
            <p className="page-note" role="status">
              لا توجد إعلانات في هذه الصفحة.{" "}
              <Link href="/listings">العودة إلى الصفحة الأولى</Link>
            </p>
          ) : (
            <p className="page-note" role="status">
              لا توجد إعلانات نشطة حالياً.
            </p>
          )
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
                    <h2>{listing.title}</h2>
                    <p className="listing-meta">
                      <span className="listing-category">{listing.category}</span>
                      <span>·</span>
                      <span>{listing.providerName}</span>
                    </p>
                    <p className="listing-price">
                      {formatPrice(listing.price, listing.currency)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <nav className="listing-pager" aria-label="تصفّح الصفحات">
              {result.data.pageNumber > 0 ? (
                <Link
                  className="button"
                  href={`/listings?page=${result.data.pageNumber}`}
                >
                  الصفحة السابقة
                </Link>
              ) : null}
              {!result.data.last ? (
                <Link
                  className="button"
                  href={`/listings?page=${result.data.pageNumber + 2}`}
                >
                  الصفحة التالية
                </Link>
              ) : null}
            </nav>
          </>
        )
      ) : result.status === 0 ? (
        <p className="page-note" role="status">
          الخادم الخلفي غير متاح حالياً — لا يمكن قراءة الإعلانات الآن.
        </p>
      ) : (
        <p className="page-note" role="status">
          {problemMessage(result.problem, `تعذّر قراءة الإعلانات (رمز ${result.status}).`)}
        </p>
      )}

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
