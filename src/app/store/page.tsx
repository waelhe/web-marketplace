import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  STORE_CATEGORIES,
  browseStoreProducts,
  storeDisplayEnabled,
  storePriceLine,
  vendorLine,
} from "@/lib/vision-store";
import { DISPLAY_BADGE_LABEL } from "@/lib/vision-institutions";
import { AddToCartForm } from "./add-to-cart-form";

/**
 * المتجر — the full-vision spec §5.2: the commerce column's storefront
 * (Amazon-grade, the M-series waves' surface). The product world is
 * DISPLAY data (badged, `demo-` ids — the M1/M2 backend waves pending);
 * the cart itself is REAL cookie state (the framework's official
 * contract — see store/actions.ts).
 *
 * Browse semantics mirror the listings page's own discipline: category
 * chips + a text filter, honest empty state, no invented rows.
 */

type StorePageProps = PageProps<"/store">;

export const metadata: Metadata = {
  title: "المتجر",
  description:
    "متجر المنصة متعدد البائعين — منتجات الأحياء والبائعين الموثوقين في مكان واحد.",
};

export default async function StorePage({
  searchParams,
}: StorePageProps) {
  const params = await searchParams;
  const category =
    typeof params.category === "string" && params.category.trim() !== ""
      ? params.category.trim()
      : undefined;
  const q =
    typeof params.q === "string" && params.q.trim() !== ""
      ? params.q.trim()
      : undefined;

  const enabled = storeDisplayEnabled();
  const rows = enabled ? browseStoreProducts({ category, q }) : [];

  return (
    <main>
      <PageHeader
        title="المتجر"
        actions={
          <Link className="button" href="/cart">
            سلّة المشتريات
          </Link>
        }
      />
      <p className="page-note">
        منتجات من بائعي الأحياء ومن المنصة نفسها — سلة واحدة متعددة البائعين،
        وكل بائع يُسوّى على حدة. {enabled ? <Badge tone="new">{DISPLAY_BADGE_LABEL}</Badge> : null}
      </p>

      {/* The category rail — the store's own vocabulary (an owner gate,
          spec §9.1; this display set self-retires when M1 lands). */}
      <nav className="category-filter" aria-label="فئات المتجر">
        <Link
          href={q ? `/store?q=${encodeURIComponent(q)}` : "/store"}
          aria-current={category === undefined ? "page" : undefined}
        >
          كل الفئات
        </Link>
        {STORE_CATEGORIES.map((c) => (
          <Link
            key={c.code}
            href={
              q
                ? `/store?category=${c.code}&q=${encodeURIComponent(q)}`
                : `/store?category=${c.code}`
            }
            aria-current={category === c.code ? "page" : undefined}
          >
            {c.labelAr}
          </Link>
        ))}
      </nav>

      {/* The text filter — a plain GET form (the listings search's own
          discipline: server-rendered, bookmarkable, no client state). */}
      <form className="geo-search" action="/store" method="get" role="search">
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="ابحث في المتجر — خلاط، سماعات، عربة أطفال…"
          aria-label="البحث في المتجر"
        />
        <button type="submit" className="button">
          ابحث
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={enabled ? "لا منتجات تطابق اختيارك" : "المتجر مطفأ"}
          hint={
            enabled
              ? "جرّب فئة أخرى أو أزل البحث — عالم المنتجات يتوسع مع البائعين."
              : "طبقة عرض المتجر معطلة بضبط البيئة (DEMO_VISION)."
          }
        />
      ) : (
        <ul className="listing-grid store-grid">
          {rows.map((p) => (
            <li key={p.id} className="listing-card store-card">
              {/* The honest no-image plate: a styled category symbol —
                  never a faked photo. */}
              <div className="store-plate" aria-hidden="true">
                <span className="material-symbols-outlined">{p.symbol}</span>
              </div>
              <h2>
                <Link href={`/store/${p.id}`}>{p.titleAr}</Link>
              </h2>
              <p className="store-price">{storePriceLine(p.priceMajor)}</p>
              <p className="listing-meta">
                <Badge tone={p.firstParty ? "featured" : "muted"}>
                  {p.firstParty ? "من المنصة" : p.vendorAr}
                </Badge>
                {!p.firstParty ? <span>· {vendorLine(p).split(" — ")[1] ?? vendorLine(p)}</span> : null}
              </p>
              <p className="page-note">
                {p.inStock
                  ? `يصل خلال ${p.shipDays === 1 ? "يوم واحد" : `${p.shipDays} أيام`}`
                  : "غير متوفر حاليًا"}
              </p>
              <AddToCartForm productId={p.id} inStock={p.inStock} compact />
            </li>
          ))}
        </ul>
      )}

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
