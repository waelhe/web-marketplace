import type { Metadata } from "next";
import Link from "next/link";
import {
  STORE_CATEGORIES,
  browseStoreProducts,
  storeDisplayEnabled,
  storePriceLine,
  suqOffers,
  suqStorefrontSections,
  type StoreProduct,
} from "@/lib/vision-store";
import { DISPLAY_BADGE_LABEL } from "@/lib/vision-institutions";
import { SuqAddToCart } from "./suq-add-to-cart";

/**
 * سوق الحي — the storefront surface rebuilt on the owner's attached
 * binding design (PR #502 «استفد والتزم بالتصميم المرفق», 2026-10-04):
 * the market mode tabs, the M3 search bar, the category chips rail, the
 * merchant CTA, the offers rail, and the seven market sections with
 * their horizontal product rails.
 *
 * Honesty rules that ride the design (the adherence spec §2):
 * - The product world is DISPLAY data (badged; `DEMO_VISION` gate);
 *   the cart write is REAL (the official cookie lane).
 * - The mode tabs are navigation to REAL surfaces: المستعمل is the L50
 *   حراج (/neighborhood/market), الخدمات is the services directory.
 * - The category state (?category=) is the real GET filter — one honest
 *   section grid; the text state (?q=) is the real flat search read.
 * - No faked photos: the plates are styled category symbols.
 */

type StorePageProps = PageProps<"/store">;

export const metadata: Metadata = {
  title: "سوق الحي",
  description:
    "سوق الحي — متجر الأحياء متعدد البائعين: مخابز وخضار ولحوم وأسر منتجة، بسلة واحدة موحدة وكل بائع يُسوّى على حدة.",
};

/** The mode tabs — the design's 3-way market selector, each a REAL
 * destination (the storefront itself active; the used-market and the
 * services directory link out to the platform's served surfaces). */
const MARKET_MODES: ReadonlyArray<{
  href: string;
  label: string;
  icon: string;
  active?: boolean;
}> = [
  { href: "/store", label: "منتجات ومتاجر", icon: "storefront", active: true },
  { href: "/neighborhood/market", label: "المستعمل", icon: "inventory_2" },
  { href: "/neighborhood/services", label: "الخدمات", icon: "handyman" },
];

export default async function StorePage({ searchParams }: StorePageProps) {
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
  const sections = enabled ? suqStorefrontSections() : [];
  const offers = enabled && !category && !q ? suqOffers() : [];

  // The honest focused reads: category and text compose (the same GET
  // discipline the old storefront kept — the hidden category field
  // rides the search form).
  const focused =
    enabled && (q || category) ? browseStoreProducts({ category, q }) : null;
  const focusedRows = focused ?? [];
  const activeCategory = STORE_CATEGORIES.find((c) => c.code === category);
  const focusedSection =
    category === undefined ? undefined : sections.find((s) => s.category === category);

  return (
    <main className="suq-page">
      <h1 className="suq-headline">
        <span className="suq-dot suq-dot-green" aria-hidden="true" />
        سوق الحي
        {enabled ? <span className="suq-display-badge">{DISPLAY_BADGE_LABEL}</span> : null}
      </h1>
      <p className="suq-section-sub" style={{ margin: 0 }}>
        متجر الأحياء متعدد البائعين — سلة واحدة موحدة، وكل بائع يُسوّى على حدة.
      </p>

      {/* The market mode tabs (the design's 3-way selector). */}
      <nav className="suq-tabs" aria-label="أوضاع السوق">
        {MARKET_MODES.map((mode) => (
          <Link
            key={mode.href}
            className="suq-tab"
            href={mode.href}
            aria-current={mode.active ? "page" : undefined}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {mode.icon}
            </span>
            {mode.label}
          </Link>
        ))}
      </nav>

      {/* The M3 search bar — the plain GET discipline (server-rendered,
          bookmarkable, no client state), the tune affordance linking to
          the platform's real advanced search surface. */}
      <form className="suq-search" action="/store" method="get" role="search">
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <span className="material-symbols-outlined suq-search-icon" aria-hidden="true">
          search
        </span>
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="ابحث عن متجر، منتج، أو سلعة في الحي..."
          aria-label="البحث في سوق الحي"
        />
        <Link className="suq-tune" href="/search" aria-label="البحث المتقدم">
          <span className="material-symbols-outlined" aria-hidden="true">
            tune
          </span>
        </Link>
      </form>

      {/* The category chips rail — the design's nine tiles (السوق = the
          unfiltered browse; the eight categories = the real GET filter). */}
      <section aria-labelledby="suq-cats-heading">
        <div className="suq-headline-row">
          <h2 className="suq-headline" id="suq-cats-heading">
            <span className="suq-dot suq-dot-green" aria-hidden="true" />
            أقسام وتصنيفات السوق
          </h2>
        </div>
        <nav className="suq-cats" aria-label="فئات سوق الحي">
          <Link
            className="suq-cat"
            href={q ? `/store?q=${encodeURIComponent(q)}` : "/store"}
            aria-current={category === undefined ? "page" : undefined}
          >
            <span className="suq-cat-tile">
              <span className="material-symbols-outlined" aria-hidden="true">
                storefront
              </span>
            </span>
            <span className="suq-cat-label">الكل</span>
          </Link>
          {STORE_CATEGORIES.map((c) => (
            <Link
              key={c.code}
              className="suq-cat"
              href={
                q
                  ? `/store?category=${c.code}&q=${encodeURIComponent(q)}`
                  : `/store?category=${c.code}`
              }
              aria-current={category === c.code ? "page" : undefined}
            >
              <span className="suq-cat-tile">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {c.symbol}
                </span>
              </span>
              <span className="suq-cat-label">{c.labelAr}</span>
            </Link>
          ))}
        </nav>
      </section>

      {/* The merchant CTA banner (the design's green-accent card) — the
          real doors: registration for new merchants, the session entry
          for the existing ones. */}
      <section className="suq-banner" aria-labelledby="suq-merchant-heading">
        <div className="suq-banner-head">
          <span className="suq-banner-icon" aria-hidden="true">
            <span className="material-symbols-outlined">storefront</span>
          </span>
          <h2 className="suq-banner-title" id="suq-merchant-heading">
            كن تاجراً، وافتح متجرك بالحي
          </h2>
        </div>
        <p className="suq-banner-body">
          اعرض منتجاتك أو خدماتك لجيرانك وأهالي الحي بكل بساطة، بدون تعقيد وبدون أي عمولات.
        </p>
        <Link className="suq-banner-cta" href="/register">
          <span className="material-symbols-outlined" aria-hidden="true">
            storefront
          </span>
          سجّل كتاجر وافتح متجرك مجاناً
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
        </Link>
        <p className="suq-banner-login">
          لديك متجر مسجل مسبقاً؟{" "}
          <Link href="/">
            تسجيل دخول التجار
            <span className="material-symbols-outlined" aria-hidden="true">
              login
            </span>
          </Link>
        </p>
      </section>

      {/* The offers rail — the design's quick offers, each linking to its
          REAL product row (display world, honestly badged). */}
      {offers.length > 0 ? (
        <section aria-labelledby="suq-offers-heading">
          <div className="suq-headline-row">
            <h2 className="suq-headline" id="suq-offers-heading">
              <span className="suq-dot suq-dot-red" aria-hidden="true" />
              عروض سريعة
            </h2>
          </div>
          <div className="suq-rail">
            {offers.map((offer) => (
              <article key={offer.productId} className="suq-offer">
                <div className="suq-offer-top">
                  <span className="suq-offer-plate" aria-hidden="true">
                    <span className="material-symbols-outlined">{offer.product.symbol}</span>
                    <span className="suq-offer-badge">{offer.badgeAr}</span>
                  </span>
                  <div className="suq-offer-body">
                    <span className="suq-offer-vendor">{offer.noteAr}</span>
                    <h3 className="suq-offer-title">
                      <Link href={`/store/${offer.product.id}`}>{offer.product.titleAr}</Link>
                    </h3>
                    <p className="suq-offer-note">{offer.product.summaryAr}</p>
                  </div>
                </div>
                <div className="suq-offer-foot">
                  <span className="suq-offer-price">{storePriceLine(offer.product.priceMajor)}</span>
                  <SuqAddToCart productId={offer.product.id} inStock={offer.product.inStock} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* The focused reads: a category narrows to its one section's grid;
          a text search is the honest flat result with its count. */}
      {focused !== null ? (
        <section aria-labelledby="suq-results-heading">
          <div className="suq-headline-row">
            <h2 className="suq-headline" id="suq-results-heading">
              <span className="suq-dot suq-dot-green" aria-hidden="true" />
              {q
                ? `نتائج البحث عن «${q}»`
                : (focusedSection?.titleAr ?? activeCategory?.labelAr ?? "النتائج")}
            </h2>
            <Link className="suq-seeall" href="/store">
              كل الأقسام
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_back
              </span>
            </Link>
          </div>
          {focusedSection ? (
            <p className="suq-section-sub">
              {focusedSection.vendorsLineAr}
              <span className="suq-section-chip">
                <span className="material-symbols-outlined" aria-hidden="true">
                  local_fire_department
                </span>
                {focusedSection.chipAr}
              </span>
            </p>
          ) : null}
          {focusedRows.length === 0 ? (
            <p className="suq-empty" role="status">
              <span className="material-symbols-outlined" aria-hidden="true">
                search_off
              </span>
              {enabled
                ? q
                  ? "لا منتجات تطابق بحثك — جرّب كلمة أخرى أو تصفّح الأقسام."
                  : "لا صفوف عرض بعد في هذه الفئة — الفئة تنتظر متاجره."
                : "عالم المنتجات مطفأ بضبط البيئة (DEMO_VISION)."}
            </p>
          ) : (
            <div className="suq-grid">
              {focusedRows.map((p) => (
                <SuqCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      ) : sections.length === 0 ? (
        <p className="suq-empty" role="status">
          <span className="material-symbols-outlined" aria-hidden="true">
            storefront
          </span>
          عالم المنتجات مطفأ بضبط البيئة (DEMO_VISION).
        </p>
      ) : (
        /* The browse itself: the design's seven market sections, each
            with its header (icon badge, title, stores line, live chip)
            and its horizontal product rail. */
        sections.map((section) => (
          <section key={section.category} aria-labelledby={`suq-${section.category}-heading`}>
            <div className="suq-section-head">
              <span className="suq-section-title-wrap">
                <span className="suq-section-badge" aria-hidden="true">
                  <span className="material-symbols-outlined">{section.symbol}</span>
                </span>
                <span>
                  <h2 className="suq-section-title" id={`suq-${section.category}-heading`}>
                    {section.titleAr}
                  </h2>
                  <p className="suq-section-sub">{section.vendorsLineAr}</p>
                </span>
              </span>
              <Link className="suq-seeall" href={`/store?category=${section.category}`}>
                عرض الكل
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_back
                </span>
              </Link>
            </div>
            <div className="suq-rail">
              {section.rows.map((p) => (
                <SuqCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}

/* ── The storefront card (the design's market card anatomy) ─────────── */

function SuqCard({ product }: { product: StoreProduct }) {
  return (
    <article className="suq-card">
      <div>
        <span className="suq-card-plate" aria-hidden="true">
          <span className="material-symbols-outlined">{product.symbol}</span>
          {product.badgeAr ? (
            <span className="suq-card-badge">
              <span className="material-symbols-outlined" aria-hidden="true">
                local_fire_department
              </span>
              {product.badgeAr}
            </span>
          ) : null}
        </span>
        <span className="suq-card-vendor">
          {product.firstParty ? "من المنصة" : product.vendorAr}
        </span>
        <h3 className="suq-card-title">
          <Link href={`/store/${product.id}`}>{product.titleAr}</Link>
        </h3>
        <p className="suq-card-desc">{product.summaryAr}</p>
      </div>
      <div className="suq-card-foot">
        <span className="suq-card-price">{storePriceLine(product.priceMajor)}</span>
        <SuqAddToCart productId={product.id} inStock={product.inStock} />
      </div>
    </article>
  );
}
