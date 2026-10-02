import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import {
  getMyMembership,
  getMyNeighborhoodMarket,
} from "@/lib/api/community";
import {
  MARKET_CATEGORIES,
  MARKET_CATEGORY_LABELS,
  MARKET_PAGE_SIZE,
  type MarketCategory,
} from "@/lib/api/community-contract";
import { searchListings } from "@/lib/api/public";
import { ListingCard } from "@/components/ui/card";
import { MARKET_SAFETY_RULES, ownerCount, parseMarketCategory } from "@/lib/neighborhood-design";
import {
  formatMarketPrice,
  formatMarketWhen,
  isFreeGift,
  marketCategoryIcon,
  sellerBadgeLabel,
} from "@/lib/neighborhood-market";
import { MarketCreateLauncher } from "./market-create";
import { MarketDeleteButton } from "./market-delete";

/**
 * سوق الحي والحراج — the market screen (slice S10, screen ② of the
 * owner-supplied design spec 2026-09-29). The design's own anatomy:
 * the page hero with the free-gifts rail (ركن الإهداء), the search
 * box + the category chips, the item grid with the green gift band on
 * free items, and the safe-transaction rules strip.
 *
 * N8 (gap #5 served, 2026-10-02): the grid went REAL — the backend's
 * own GET /api/v1/neighborhood/market (L50), membership-scoped,
 * newest first, every row carrying sellerVerified + mine. The search
 * box, the chips and the mine view ride the READ's own server-side
 * axes (?q= / ?cat= / ?mine=); the display dataset retired with its
 * «بيانات عرض» badge. The publisher («انشر معروضًا») and the
 * author's withdraw are the wave's two real writes.
 *
 * The REAL marketplace bridge stays first-class: the location-scoped
 * public listings read (the same criteria op every public browse
 * rides, scoped by the membership's own locationId) renders above
 * the board — real rows with real detail links. `noindex` —
 * session-scoped content.
 */
export const metadata: Metadata = {
  title: "سوق الحي — حيّنا",
  description: "بيع ومقايضة وإهداء بين الجيران — تعاملات وجهًا لوجه آمنة",
  robots: { index: false },
};

type MarketPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** The real local-listings strip size (the marketplace bridge row). */
const LOCAL_LISTINGS_SIZE = 8;

/** Read ?q= as a single trimmed string. */
function parseQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

/** Read ?mine= as the member's own-items view flag. */
function parseMine(raw: string | string[] | undefined): boolean {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "1" || value === "true";
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const sp = await searchParams;
  const cat = parseMarketCategory(sp?.cat);
  const q = parseQuery(sp?.q);
  const mine = parseMine(sp?.mine);

  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>سوق الحي</h1>
        <p className="page-note" role="status">
          هذا القسم لأعضاء الحارات — محتواه خاص بالجيران المسجّلين.
        </p>
        <SignInButton callbackURL="/neighborhood/market" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const membership = await getMyMembership();
  if (!membership.ok) {
    if (membership.status === 404) {
      return (
        <main>
          <h1>سوق الحي</h1>
          <p className="page-note" role="status">
            لم تنتمِ إلى حارة بعد — العضوية هي مفتاح سوق الحي.
          </p>
          <p>
            <Link className="button" data-variant="primary" href="/neighborhoods">
              اختر حارتك
            </Link>
          </p>
          <p>
            <Link href="/">الرئيسية</Link>
          </p>
        </main>
      );
    }
    return (
      <main>
        <h1>سوق الحي</h1>
        <p className="page-note" role="status">
          {membership.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(
                membership.problem,
                `تعذّر قراءة عضويتك (رمز ${membership.status}).`,
              )}
        </p>
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  // THE MARKETPLACE BRIDGE (real, live): the location-scoped public
  // search read — unchanged channel from S7.
  const localListings = await searchListings(
    { locationId: membership.data.locationId },
    0,
    LOCAL_LISTINGS_SIZE,
  );

  // THE SERVED BOARD (N8): the backend's own read — the search box,
  // the chips and the mine view ride the read's own server-side axes.
  const board = await getMyNeighborhoodMarket(0, MARKET_PAGE_SIZE, cat ?? undefined, q, mine);
  const items = board.ok ? board.data.content : [];
  const boardError = board.ok
    ? null
    : board.unauthenticated
      ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
      : problemMessage(board.problem, `تعذّرت قراءة معروضات سوق حارتك (رمز ${board.status}).`);

  // The free-gifts rail's own count — the visible board's gifts (the
  // whole unfiltered board when no axis is active, exactly the
  // display layer's own rule over its dataset).
  const freeCount = items.filter((item) => isFreeGift(item.priceCents)).length;

  /** Rebuild a filter href preserving the other parameters. */
  const href = (nextCat: string | null, nextMine: boolean = mine) => {
    const params = new URLSearchParams();
    if (nextCat) params.set("cat", nextCat);
    if (q) params.set("q", q);
    if (nextMine) params.set("mine", "1");
    const query = params.toString();
    return query ? `/neighborhood/market?${query}` : "/neighborhood/market";
  };

  return (
    <main>
      {/* THE PAGE HERO — the market's own banner + the free-gifts rail. */}
      <section className="hy-page-hero" aria-labelledby="market-title">
        <div className="hy-page-hero-id">
          <span className="hy-market-icon" aria-hidden="true">
            <span className="material-symbols-outlined">storefront</span>
          </span>
          <div>
            <h1 id="market-title" className="hy-page-title">
              سوق الحي والحراج
            </h1>
            <p className="hy-page-sub">
              بيع ومقايضة وإهداء بين الجيران — تعاملات وجهًا لوجه عند بوابات الحي
            </p>
          </div>
        </div>
        {freeCount > 0 ? (
          <span className="hy-market-gift">
            <span className="material-symbols-outlined" aria-hidden="true">redeem</span>
            ركن الإهداء: {ownerCount(freeCount)} مقتنيات مجانية
          </span>
        ) : null}
      </section>

      {/* The search box + the category chips — server-side ?q= and ?cat=/?mine=. */}
      <form className="hy-filter" action="/neighborhood/market" method="get" role="search">
        <div className="hy-searchbox">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="ابحث في سوق الحي…"
            aria-label="ابحث في سوق الحي"
          />
        </div>
        {cat ? <input type="hidden" name="cat" value={cat} /> : null}
        {mine ? <input type="hidden" name="mine" value="1" /> : null}
        <button type="submit" className="hy-btn hy-btn-primary">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          ابحث
        </button>
      </form>
      <nav className="hy-filter" aria-label="تصنيفات السوق">
        <Link href={href(null)} className="hy-pill" data-active={cat === null && !mine ? true : undefined}>
          الكل
        </Link>
        {MARKET_CATEGORIES.map((value: MarketCategory) => (
          <Link
            key={value}
            href={href(value)}
            className="hy-pill"
            data-active={cat === value || undefined}
          >
            {MARKET_CATEGORY_LABELS[value]}
          </Link>
        ))}
        <Link href={href(null, !mine)} className="hy-pill" data-active={mine || undefined}>
          معروضاتي
        </Link>
      </nav>

      <div className="hy-cols">
        <div className="hy-col">
          {/* THE REAL BRIDGE — the location-scoped listings read. */}
          <section className="hy-card" aria-labelledby="real-market-heading">
            <div className="hy-real-head">
              <h2 id="real-market-heading" className="hy-section-title">
                <span className="material-symbols-outlined" aria-hidden="true">
                  verified
                </span>
                إعلانات جيرانك الحقيقية
              </h2>
              {localListings.ok ? (
                <span className="hy-real-count">
                  {new Intl.NumberFormat("ar").format(localListings.data.totalElements)} إعلانًا
                </span>
              ) : null}
            </div>
            {localListings.ok ? (
              localListings.data.content.length > 0 ? (
                <ul className="listing-grid">
                  {localListings.data.content.map((listing) => (
                    <li key={listing.id}>
                      <ListingCard listing={listing} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hy-empty" role="status">
                  لا إعلانات نشطة في حيّك على المنصة بعد.
                </p>
              )
            ) : (
              <p className="hy-state" role="status">
                {localListings.status === 0
                  ? "الخادم الخلفي غير متاح حاليًا — لا يمكن قراءة إعلانات الحي."
                  : problemMessage(
                      localListings.problem,
                      `تعذّرت قراءة إعلانات الحي (رمز ${localListings.status}).`,
                    )}
              </p>
            )}
          </section>

          {/* THE SERVED BOARD — the neighbors' real items (N8): the
              design's own card anatomy over the backend's own rows. */}
          <section className="hy-section" aria-labelledby="market-board-heading">
            <div className="hy-section-head">
              <h2 id="market-board-heading" className="hy-section-title">
                <span className="material-symbols-outlined" aria-hidden="true">
                  volunteer_activism
                </span>
                معروضات الجيران
              </h2>
            </div>
            {boardError ? (
              <p className="hy-state" role="status">
                {boardError}
              </p>
            ) : items.length > 0 ? (
              <ul className="hy-market-grid">
                {items.map((item) => {
                  const free = isFreeGift(item.priceCents);
                  return (
                    <li key={item.id} className="hy-card hy-market-item">
                      <div
                        className="hy-market-thumb"
                        data-free={free || undefined}
                        role="img"
                        aria-label={item.title}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "2.5rem" }}>
                          {marketCategoryIcon(item.category)}
                        </span>
                        {free ? (
                          <span className="hy-market-free-chip">
                            <span
                              className="material-symbols-outlined"
                              aria-hidden="true"
                              style={{ fontSize: "0.75rem" }}
                            >
                              redeem
                            </span>
                            مجاني — إهداء
                          </span>
                        ) : null}
                        {item.status === "SOLD" ? (
                          <span className="hy-market-free-chip" data-sold>
                            تم البيع
                          </span>
                        ) : null}
                      </div>
                      <h3 className="hy-market-title">{item.title}</h3>
                      <div className="hy-market-meta">
                        <span className="hy-market-price" data-free={free || undefined}>
                          {formatMarketPrice(item.priceCents, item.priceCurrency)}
                        </span>
                        <span className="hy-market-loc">
                          <span
                            className="material-symbols-outlined"
                            aria-hidden="true"
                            style={{ fontSize: "0.75rem" }}
                          >
                            location_on
                          </span>
                          {item.locationLabel}
                        </span>
                      </div>
                      <div className="hy-market-meta">
                        <span className="hy-post-chip" data-tone="neutral">
                          {item.condition === "LIKE_NEW" ? "كالجديد" : "جيد"}
                        </span>
                        <span
                          className="hy-post-chip"
                          data-tone={item.sellerVerified ? "verified" : "neutral"}
                        >
                          <span
                            className="material-symbols-outlined"
                            aria-hidden="true"
                            style={{ fontSize: "0.75rem" }}
                          >
                            verified
                          </span>
                          {sellerBadgeLabel(item.sellerVerified)}
                        </span>
                        <span className="hy-market-when">
                          {formatMarketWhen(item.createdAt)}
                        </span>
                      </div>
                      {/* The author's own seam: the withdraw button
                          renders from the served mine fact alone. */}
                      {item.mine ? <MarketDeleteButton itemId={item.id} /> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="hy-empty" role="status">
                {mine
                  ? "لا معروضات لك بعد — انشر أول معروض من زر «انشر معروضًا»."
                  : "لا معروضات تطابق تصنيفك أو بحثك — جرّب تصنيفًا آخر أو امسح البحث."}
              </p>
            )}
          </section>
        </div>

        <div className="hy-col">
          {/* نصائح بيع آمن — the design's honest-transaction rules. */}
          <section className="hy-card" aria-labelledby="safety-heading">
            <div className="hy-widget-head">
              <h2 id="safety-heading" className="hy-widget-title">
                <span className="material-symbols-outlined" aria-hidden="true">
                  verified_user
                </span>
                نصائح بيع آمن
              </h2>
            </div>
            <ul className="hy-market-rules">
              {MARKET_SAFETY_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>

          {/* The publisher bridge — the market's own write path (N8):
              the member publishes a real item into their board. */}
          <section className="hy-card" aria-labelledby="sell-heading">
            <h2 id="sell-heading" className="hy-widget-title">
              <span className="material-symbols-outlined" aria-hidden="true">
                sell
              </span>
              عندك شيء للبيع؟
            </h2>
            <p className="hy-screen-sub">
              انشره على لوحة سوق حارتك — يصل جيرانك مباشرة، والإهداء بلا مقابل أبدًا.
            </p>
            <MarketCreateLauncher locationId={membership.data.locationId} />
          </section>
        </div>
      </div>

      <p>
        <Link href="/neighborhood">خلاصة الحي</Link>
      </p>
    </main>
  );
}
