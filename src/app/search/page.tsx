import type { Metadata } from "next";
import Link from "next/link";
import {
  getListingCategories,
  searchListings,
  searchListingsByCategory,
  LISTINGS_PAGE_SIZE,
} from "@/lib/api/public";
import { problemMessage } from "@/lib/problem";
import { PageHeader } from "@/components/ui/page-header";
import { ListingCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { categoryLabel } from "@/components/ui/category-select";
import { Pagination } from "@/components/ui/pagination";

// The flat public search surface — charter J2 / slice S4 (DoD: "مسطّح بحث
// نصي على /search؛ كل فلاتر HTML عامة تعمل بلا JS"). One text field +
// the live category rail: native GET, no client JS, URL is the state,
// rendered server-side — the same public-RSC discipline as /listings
// (anonymous direct read, crawlers see the page visitors see).

type SearchPageProps = PageProps<"/search">;

/** First value of a query param, trimmed (arrays collapse to [0]) — the
 *  /listings parse-boundary twin. */
function first(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

/** R25: absent→0, clamp≥0, 0-based wire (display adds +1). */
function parsePage(raw: string | string[] | undefined): number {
  const value = first(raw);
  if (value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

/**
 * The wire routing, mirroring the backend's MEASURED flat-search dispatch
 * (SearchService.searchUnwindowed, read 2026-09-29): a non-blank `q`
 * routes to full-text and every other flat criterion (category, price,
 * …) is silently ignored by the backend. This page therefore sends `q`
 * ALONE on the wire when text is present — exactly the criteria the
 * backend actually honors (the S3 mirror-the-measured-semantics
 * pattern). The category dimension keeps its own affordance (the rail
 * below) and its own dedicated op when it is the ONLY criterion.
 */
type SearchMode =
  | { kind: "text"; q: string; category: string }
  | { kind: "category"; category: string }
  | { kind: "idle" };

function resolveMode(q: string, category: string): SearchMode {
  if (q !== "") return { kind: "text", q, category };
  if (category !== "") return { kind: "category", category };
  return { kind: "idle" };
}

function modeLabel(mode: SearchMode): string {
  switch (mode.kind) {
    case "text":
      return `نتائج البحث النصي عن «${mode.q}»`;
    case "category":
      return `تصفّح الفئة «${mode.category}»`;
    case "idle":
      return "ابدأ البحث";
  }
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = first(sp?.q);
  const category = first(sp?.category);
  const page = parsePage(sp?.page);
  const canonicalParams: Record<string, string> = {};
  if (q !== "") canonicalParams.q = q;
  if (category !== "") canonicalParams.category = category;
  if (page > 0) canonicalParams.page = String(page);
  const query = new URLSearchParams(canonicalParams).toString();
  return {
    title: "البحث",
    description: "ابحث في إعلانات السوق بالكلمات أو تصفّح فئة — واجهة عامة تصلها محركات البحث",
    alternates: { canonical: query ? `/search?${query}` : "/search" },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const q = first(sp?.q);
  const category = first(sp?.category);
  const page = parsePage(sp?.page);
  const mode = resolveMode(q, category);

  // The live category vocabulary (S2) — this rail is a first-class
  // affordance here, so a failed registry read gets the honest note
  // (not the hero's silent degrade: on the flat search page the rail IS
  // the category surface). Zero invented entries either way.
  const categories = await getListingCategories();
  const railCategories = categories.ok ? categories.data : [];
  const activeLabel =
    mode.kind === "category"
      ? railCategories.find((entry) => entry.code === mode.category) ?? null
      : null;

  // The read itself — one backend GET per state, through the dedicated
  // measured channel (see resolveMode): text → the criteria op's
  // full-text branch; category-only → the search surface's own category
  // op (the S4 gap read); idle → no read at all (nothing to search).
  const result =
    mode.kind === "text"
      ? await searchListings({ q: mode.q }, page, LISTINGS_PAGE_SIZE)
      : mode.kind === "category"
        ? await searchListingsByCategory(mode.category, page, LISTINGS_PAGE_SIZE)
        : null;

  // Pagination round-trips the ARRIVED state losslessly (q and category
  // both survive — in text mode the category rides the URL unfiltered,
  // mirroring the backend's measured dispatch; the wire stays q-only).
  const pagerParams: Record<string, string> = {};
  if (q !== "") pagerParams.q = q;
  if (category !== "") pagerParams.category = category;

  // The rail's clear affordance: drop the category, keep the text if any.
  const clearCategoryHref = q !== "" ? `/search?q=${encodeURIComponent(q)}` : "/search";

  return (
    <main>
      <PageHeader
        title="البحث"
        description="ابحث بالكلمات، أو تصفّح فئة من سجل الفئات الحي — نتائج عامة للزوار ومحركات البحث"
      />

      {/* The flat text form — ONE field, native GET, zero selects (the
          DoD's "مسطّح بحث نصي"; the 16-field wall lives on /listings).
          An empty submit lands on the idle prompt — never a doomed
          backend roundtrip. */}
      <form method="get" action="/search" role="search" aria-label="البحث النصي في الإعلانات">
        <Field label="كلمات البحث">
          <input
            type="search"
            name="q"
            defaultValue={q}
            autoComplete="off"
            placeholder="ابحث بالكلمات…"
          />
        </Field>
        <Button variant="primary" size="lg" type="submit">
          ابحث
        </Button>
      </form>

      {/* The live category rail — the category dimension's own affordance
          (S2's registry read is the ONLY source; codes are the only wire
          values). Each entry is a plain link to the category-only state,
          which rides the backend's dedicated /search/category/{c} op. */}
      <nav aria-label="تصفّح الفئات" className="page-note">
        {categories.ok ? (
          railCategories.length > 0 ? (
            <>
              <span>تصفّح فئة:</span>{" "}
              {railCategories.map((entry) => (
                <span key={entry.code}>
                  <Link
                    href={`/search?category=${encodeURIComponent(entry.code)}`}
                    title={entry.nameEn ?? undefined}
                    aria-current={
                      mode.kind === "category" && mode.category === entry.code
                        ? "page"
                        : undefined
                    }
                  >
                    {categoryLabel(entry)}
                  </Link>{" "}
                </span>
              ))}
              {mode.kind === "category" ? (
                <>
                  —{" "}
                  <Link href={clearCategoryHref} aria-label="إلغاء تصفية الفئة">
                    إلغاء الفئة
                  </Link>
                </>
              ) : null}
            </>
          ) : (
            <span role="status">لا فئات مسجّلة حالياً.</span>
          )
        ) : (
          <span role="status">
            تعذّرت قراءة سجل الفئات — تصفّح الفئات غير متاح الآن، والبحث النصي يعمل.
          </span>
        )}
      </nav>

      <section id="results" aria-label="نتائج البحث">
        {/* The idle state: an honest prompt, no backend read. */}
        {mode.kind === "idle" ? (
          <EmptyState
            title="ابدأ البحث"
            hint="اكتب كلمات في حقل البحث أعلاه، أو تصفّح فئة من سجل الفئات الحي"
            action={<Link href="/listings">أو تصفّح كل الإعلانات بالفلاتر الكاملة</Link>}
          />
        ) : (
          <>
            <p className="page-note" role="status">
              {modeLabel(mode)}
            </p>
            {result && result.ok ? (
              result.data.content.length === 0 ? (
                page > 0 && result.data.totalElements > 0 ? (
                  <p className="page-note" role="status">
                    لا توجد نتائج في هذه الصفحة.{" "}
                    <Link href={`/search?${new URLSearchParams(pagerParams).toString()}`}>
                      العودة إلى الصفحة الأولى
                    </Link>
                  </p>
                ) : (
                  <EmptyState
                    title="لا توجد نتائج مطابقة"
                    hint={
                      mode.kind === "text"
                        ? "جرّب كلمات أخرى، أو تصفّح الفئات، أو استعمل الفلاتر الكاملة"
                        : "لا إعلانات نشطة في هذه الفئة حالياً"
                    }
                    action={<Link href="/listings">تصفّح كل الإعلانات</Link>}
                  />
                )
              ) : (
                <>
                  <p className="page-note">
                    {new Intl.NumberFormat("ar").format(result.data.totalElements)} نتيجة —
                    الصفحة {new Intl.NumberFormat("ar").format(result.data.pageNumber + 1)} من{" "}
                    {new Intl.NumberFormat("ar").format(Math.max(result.data.totalPages, 1))}
                  </p>
                  <ul className="listing-grid">
                    {result.data.content.map((listing) => (
                      <li key={listing.id}>
                        <ListingCard listing={listing} />
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    page={page}
                    totalPages={result.data.totalPages}
                    basePath="/search"
                    params={pagerParams}
                  />
                </>
              )
            ) : result && result.status === 0 ? (
              <p className="page-note" role="status">
                الخادم الخلفي غير متاح حالياً — لا يمكن قراءة نتائج البحث الآن.
              </p>
            ) : result ? (
              <p className="page-note" role="status">
                {problemMessage(result.problem, `تعذّرت قراءة نتائج البحث (رمز ${result.status}).`)}
              </p>
            ) : null}
            {mode.kind === "category" && activeLabel === null && result?.ok ? (
              <p className="page-note" role="status">
                الفئة «{mode.category}» ليست في سجل الفئات الحي — قد لا تعرف نتائج.
              </p>
            ) : null}
          </>
        )}
      </section>

      <p>
        <Link href="/">الرئيسية</Link> —{" "}
        <Link href="/listings">التصفّح الكامل بالفلاتر</Link>
      </p>
    </main>
  );
}
