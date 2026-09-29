import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { getMyMembership } from "@/lib/api/community";
import { searchListings } from "@/lib/api/public";
import { ListingCard } from "@/components/ui/card";
import { neighborhoodDemoEnabled } from "@/lib/neighborhood-product";
import {
  DEMO_MARKET_ITEMS,
  MARKET_CATEGORIES,
  MARKET_CATEGORY_LABELS,
  MARKET_SAFETY_RULES,
  freeGiftCount,
  marketItemMatches,
  ownerCount,
  parseMarketCategory,
} from "@/lib/neighborhood-design";

/**
 * سوق الحي والحراج — the market screen (slice S10, screen ② of the
 * owner-supplied design spec 2026-09-29). The design's own anatomy:
 * the page hero with the free-gifts rail (ركن الإهداء), the search
 * box + the five category chips, the item grid with the green gift
 * band on free items, and the safe-transaction rules strip.
 *
 * The REAL channel stays first-class: the location-scoped public
 * listings read (the same criteria op every public browse rides,
 * scoped by the membership's own locationId) renders above the
 * display grid — real rows with real detail links. The display grid
 * carries the owner's own items, «بيانات عرض» labeled, demo ids,
 * never links (discipline rules 1–5, src/lib/neighborhood-design.ts).
 * `noindex` — session-scoped content.
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

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const sp = await searchParams;
  const cat = parseMarketCategory(sp?.cat);
  const q = parseQuery(sp?.q);

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

  // The owner's display grid — filtered by the chips (?cat=) and the
  // search box (?q=), both server-side reads.
  const demoOn = neighborhoodDemoEnabled();
  const items = demoOn
    ? DEMO_MARKET_ITEMS.filter(
        (item) =>
          (cat === null || item.category === cat) && marketItemMatches(item, q),
      )
    : [];
  const freeCount = demoOn ? freeGiftCount(DEMO_MARKET_ITEMS) : 0;

  /** Rebuild a filter href preserving the other parameter. */
  const href = (nextCat: string | null) => {
    const params = new URLSearchParams();
    if (nextCat) params.set("cat", nextCat);
    if (q) params.set("q", q);
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

      {/* The search box + the category chips — server-side ?q= and ?cat=. */}
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
        <button type="submit" className="hy-btn hy-btn-primary">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          ابحث
        </button>
      </form>
      <nav className="hy-filter" aria-label="تصنيفات السوق">
        <Link href={href(null)} className="hy-pill" data-active={cat === null || undefined}>
          الكل
        </Link>
        {MARKET_CATEGORIES.map((value) => (
          <Link
            key={value}
            href={href(value)}
            className="hy-pill"
            data-active={cat === value || undefined}
          >
            {MARKET_CATEGORY_LABELS[value]}
          </Link>
        ))}
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

          {/* The owner's display grid — the design's item cards. */}
          {demoOn ? (
            <section className="hy-section" aria-labelledby="demo-market-heading">
              <div className="hy-section-head">
                <h2 id="demo-market-heading" className="hy-section-title">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    volunteer_activism
                  </span>
                  معروضات الجيران
                </h2>
                <span className="hy-badge-demo">بيانات عرض</span>
              </div>
              {items.length > 0 ? (
                <ul className="hy-market-grid">
                  {items.map((item) => (
                    /* Display cards, never links (rule 4): the demo id is
                        not a backend UUID — the public listing read would
                        404, and a fake page would poison trust. */
                    <li key={item.id} className="hy-card hy-market-item">
                      <div className="hy-market-thumb" data-free={item.free || undefined} role="img" aria-label={item.title}>
                        <span className="material-symbols-outlined" style={{ fontSize: "2.5rem" }}>
                          {item.icon}
                        </span>
                        {item.free ? (
                          <span className="hy-market-free-chip">
                            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.75rem" }}>
                              redeem
                            </span>
                            مجاني — إهداء
                          </span>
                        ) : null}
                      </div>
                      <h3 className="hy-market-title">{item.title}</h3>
                      <div className="hy-market-meta">
                        <span className="hy-market-price" data-free={item.free || undefined}>
                          {item.priceLabel}
                        </span>
                        <span className="hy-market-loc">
                          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.75rem" }}>
                            location_on
                          </span>
                          {item.location}
                        </span>
                      </div>
                      <div className="hy-market-meta">
                        <span className="hy-post-chip" data-tone="neutral">{item.condition}</span>
                        <span className="hy-post-chip" data-tone="verified">
                          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.75rem" }}>
                            verified
                          </span>
                          {item.sellerBadge}
                        </span>
                        <span className="hy-market-when">{item.when}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hy-empty" role="status">
                  لا معروضات تطابق تصنيفك أو بحثك — جرّب تصنيفًا آخر أو امسح البحث.
                </p>
              )}
              <p className="hy-directory-note">
                عندما تُفعَّل عقود الباك اند ستظهر معروضات الجيران الحقيقية هنا بنفس البطاقات —
                والإعلانات المجانية (الإهداء) بلا مقابل أبدًا.
              </p>
            </section>
          ) : null}
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

          {/* The composer bridge — the classified quick-path into the feed. */}
          <section className="hy-card" aria-labelledby="sell-heading">
            <h2 id="sell-heading" className="hy-widget-title">
              <span className="material-symbols-outlined" aria-hidden="true">
                sell
              </span>
              عندك شيء للبيع؟
            </h2>
            <p className="hy-screen-sub">
              انشره كمنشور «بيع ومقايضة» في خلاصة الحي — يصل جيرانك مباشرة.
            </p>
            <Link className="hy-btn hy-btn-primary" href="/neighborhood?category=CLASSIFIED">
              <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
              انشر في الخلاصة
            </Link>
          </section>
        </div>
      </div>

      <p>
        <Link href="/neighborhood">خلاصة الحي</Link>
      </p>
    </main>
  );
}
