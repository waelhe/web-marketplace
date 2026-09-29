import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { getMyMembership } from "@/lib/api/community";
import { neighborhoodDemoEnabled, formatRating, DEMO_BUSINESSES } from "@/lib/neighborhood-product";
import {
  DEMO_FEATURED_SERVICE,
  SERVICE_TRADES,
  SERVICE_TRADE_LABELS,
  ownerCount,
  parseServiceTrade,
  serviceMatches,
  type ServiceTrade,
} from "@/lib/neighborhood-design";

/**
 * دليل الخدمات والتوصيات — the services directory (slice S10, screen
 * ③ of the owner-supplied design spec 2026-09-29). The design's own
 * anatomy: the page hero, the search box + the trades chips, the
 * FEATURED first row (the owner's own service card — أبو حاتم, the
 * very card his supplied HTML embeds inside the feed's
 * recommendation post), and the neighborhood businesses directory
 * riding the SAME NeighborhoodBusiness contract the feed's rail rode
 * in S8 (one source of truth).
 *
 * All rows are display rows («بيانات عرض», demo ids, never links —
 * discipline rules 1–5). The REAL trust channels stay honest: the
 * directory's verified badges mirror the measured provider vocabulary,
 * and the note states plainly when the backend's provider contracts
 * come live the same cards go real. `noindex` — session-scoped.
 */
export const metadata: Metadata = {
  title: "دليل الخدمات — حيّنا",
  description: "حرفيو حيّك بأقوال جيرانك — تقييمات موثوقة وتوصيات مجربة",
  robots: { index: false },
};

type ServicesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Latin-digit one-decimal rating — the owner's own number style. */
const ratingLatn = (rating: number) =>
  new Intl.NumberFormat("ar-u-nu-latn", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);

/** The trades chips' mapping onto the businesses' Arabic trade labels. */
const TRADE_KEYWORDS: Record<Exclude<ServiceTrade, "ALL">, readonly string[]> = {
  COOLING: ["تكييف", "تبريد"],
  HOME_CARE: ["منزلية", "نظافة", "صحة", "تموين", "أغذية"],
  STAY: ["إقامة", "شاليه", "سفر"],
  MAINTENANCE: ["صيانة", "تشطيب", "دهانات"],
};

/** Does a business row answer a trade chip? */
function businessMatchesTrade(tradeLabel: string, trade: ServiceTrade): boolean {
  if (trade === "ALL") return true;
  return TRADE_KEYWORDS[trade].some((keyword) => tradeLabel.includes(keyword));
}

/** Read ?q= as a single trimmed string. */
function parseQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

/** An icon tile per trade — the directory's visual vocabulary. */
const TRADE_ICONS: Record<ServiceTrade, string> = {
  ALL: "handyman",
  COOLING: "hvac",
  HOME_CARE: "home_repair_service",
  STAY: "cottage",
  MAINTENANCE: "construction",
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const sp = await searchParams;
  const trade = parseServiceTrade(sp?.trade);
  const q = parseQuery(sp?.q);

  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>دليل الخدمات</h1>
        <p className="page-note" role="status">
          هذا القسم لأعضاء الحارات — محتواه خاص بالجيران المسجّلين.
        </p>
        <SignInButton callbackURL="/neighborhood/services" />
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
          <h1>دليل الخدمات</h1>
          <p className="page-note" role="status">
            لم تنتمِ إلى حارة بعد — العضوية هي مفتاح دليل الخدمات.
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
        <h1>دليل الخدمات</h1>
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

  const demoOn = neighborhoodDemoEnabled();
  const featured = demoOn ? DEMO_FEATURED_SERVICE[0] ?? null : null;
  const businesses = demoOn
    ? DEMO_BUSINESSES.filter(
        (biz) =>
          (trade === null || businessMatchesTrade(biz.trade, trade)) &&
          serviceMatches(biz.name, biz.trade, q),
      )
    : [];
  // The featured row hides under a non-matching chip (its OWN trade is
  // the directory's featured identity — COOLING).
  const featuredVisible =
    featured !== null &&
    (trade === null || trade === "ALL" || trade === featured.trade) &&
    serviceMatches(featured.name, featured.tradeLabel, q);

  /** Rebuild a filter href preserving the other parameter. */
  const href = (nextTrade: string | null) => {
    const params = new URLSearchParams();
    if (nextTrade) params.set("trade", nextTrade);
    if (q) params.set("q", q);
    const query = params.toString();
    return query ? `/neighborhood/services?${query}` : "/neighborhood/services";
  };

  return (
    <main>
      {/* THE PAGE HERO — the directory's own banner. */}
      <section className="hy-page-hero" aria-labelledby="services-title">
        <div className="hy-page-hero-id">
          <span className="hy-service-hero-icon" aria-hidden="true">
            <span className="material-symbols-outlined">handyman</span>
          </span>
          <div>
            <h1 id="services-title" className="hy-page-title">
              دليل الخدمات والتوصيات
            </h1>
            <p className="hy-page-sub">
              حرفيو حيّك بأقوال جيرانك — تقييمات موثوقة وتوصيات مجربة
            </p>
          </div>
        </div>
      </section>

      {/* The search box + the trades chips — server-side ?q= and ?trade=. */}
      <form className="hy-filter" action="/neighborhood/services" method="get" role="search">
        <div className="hy-searchbox">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="ابحث عن حرفي أو خدمة…"
            aria-label="ابحث في دليل الخدمات"
          />
        </div>
        {trade ? <input type="hidden" name="trade" value={trade} /> : null}
        <button type="submit" className="hy-btn hy-btn-primary">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          ابحث
        </button>
      </form>
      <nav className="hy-filter" aria-label="تصنيفات الدليل">
        {SERVICE_TRADES.map((value) => (
          <Link
            key={value}
            href={value === "ALL" ? href(null) : href(value)}
            className="hy-pill"
            data-active={(value === "ALL" ? trade === null : trade === value) || undefined}
          >
            {SERVICE_TRADE_LABELS[value]}
          </Link>
        ))}
      </nav>

      <div className="hy-cols">
        <div className="hy-col">
          {/* THE FEATURED ROW — the owner's own service card. */}
          {featuredVisible && featured ? (
            <section className="hy-section" aria-labelledby="featured-heading">
              <div className="hy-section-head">
                <h2 id="featured-heading" className="hy-section-title">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    workspace_premium
                  </span>
                  توصية الحي الأولى
                </h2>
                <span className="hy-badge-demo">بيانات عرض</span>
              </div>
              <article className="hy-card hy-directory-row" data-featured="true">
                <div className="hy-service-id">
                  <span className="hy-icon-tile" data-tone="primary" aria-hidden="true">
                    <span className="material-symbols-outlined">{featured.icon}</span>
                  </span>
                  <div>
                    <span className="hy-service-name-row">
                      <span className="hy-service-name">{featured.name}</span>
                      <span className="hy-service-rating" aria-label={`التقييم ${ratingLatn(featured.rating)} من 5`}>
                        <span className="hy-stars" aria-hidden="true">★★★★★</span>
                        {ratingLatn(featured.rating)}
                        <span className="hy-rating-count">({featured.reviewsLabel})</span>
                      </span>
                    </span>
                    <span className="hy-service-coverage">{featured.coverage}</span>
                    <p className="hy-directory-note">{featured.neighborNote}</p>
                  </div>
                </div>
                <div className="hy-service-actions">
                  <button
                    type="button"
                    className="hy-btn hy-btn-primary"
                    disabled
                    title="قريبًا — الاتصال المباشر بانتظار عقد التواصل لدى الباك اند"
                  >
                    <span className="material-symbols-outlined">call</span>
                    اتصل الآن
                  </button>
                  <span className="hy-post-chip" data-tone="verified">
                    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.75rem" }}>
                      verified
                    </span>
                    {featured.tradeLabel}
                  </span>
                </div>
              </article>
            </section>
          ) : null}

          {/* The directory rows — the S8 businesses contract under the
              design's directory anatomy. */}
          {demoOn ? (
            <section className="hy-section" aria-labelledby="directory-heading">
              <div className="hy-section-head">
                <h2 id="directory-heading" className="hy-section-title">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {TRADE_ICONS[trade ?? "ALL"]}
                  </span>
                  أعمال وخدمات حيّك
                </h2>
                <span className="hy-badge-demo">بيانات عرض</span>
              </div>
              {businesses.length > 0 ? (
                <ul className="hy-directory-rows">
                  {businesses.map((biz) => (
                    /* Display rows, never links (rule 4): the demo id is
                        not a backend UUID — the public provider read would
                        404, and a fake page would poison trust. */
                    <li key={biz.id} className="hy-card hy-directory-row">
                      <div className="hy-service-id">
                        <span className="hy-icon-tile" data-tone="neutral" aria-hidden="true">
                          <span className="material-symbols-outlined">
                            {businessMatchesTrade(biz.trade, "STAY")
                              ? "cottage"
                              : businessMatchesTrade(biz.trade, "HOME_CARE")
                                ? "home_repair_service"
                                : businessMatchesTrade(biz.trade, "MAINTENANCE")
                                  ? "construction"
                                  : "storefront"}
                          </span>
                        </span>
                        <div>
                          <span className="hy-service-name-row">
                            <span className="hy-service-name">{biz.name}</span>
                            {biz.verified ? (
                              <span className="hy-post-chip" data-tone="verified">
                                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.75rem" }}>
                                  verified
                                </span>
                                موثّق
                              </span>
                            ) : null}
                          </span>
                          <span className="hy-service-coverage">
                            {biz.trade} • {biz.tagline}
                          </span>
                          <span className="hy-service-rating">
                            {biz.rating !== null ? (
                              <>
                                <span className="hy-stars" aria-hidden="true">★★★★★</span>
                                {formatRating(biz.rating)}
                                <span className="hy-rating-count">
                                  ({ownerCount(biz.reviews)} تقييمًا)
                                </span>
                              </>
                            ) : (
                              <span className="hy-rating-count">جديد — بلا تقييمات بعد</span>
                            )}
                            {biz.offerings > 0 ? (
                              <span className="hy-rating-count">
                                • {ownerCount(biz.offerings)} عروض نشطة
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hy-empty" role="status">
                  لا أعمال تطابق تصنيفك أو بحثك — جرّب تصنيفًا آخر أو امسح البحث.
                </p>
              )}
              <p className="hy-directory-note">
                <strong>القناة الحقيقية:</strong> عندما تُفعَّل عقود مقدمي الخدمة لدى الباك اند
                ستظهر الأعمال الحقيقية هنا بنفس البطاقات وبروابط صفحاتها العلنية.
              </p>
            </section>
          ) : null}
        </div>

        <div className="hy-col">
          {/* The recommendation bridge — the feed's trusted posts. */}
          <section className="hy-card" aria-labelledby="recs-heading">
            <div className="hy-widget-head">
              <h2 id="recs-heading" className="hy-widget-title">
                <span className="material-symbols-outlined" aria-hidden="true">
                  recommend
                </span>
                توصيات الجيران الحية
              </h2>
            </div>
            <p className="hy-screen-sub">
              أقوال الجيران المجربة تُنشر في الخلاصة تحت تصنيف «توصية خدمة» — تقييم الحرفي
              بأقوال أهل الحي لا بالإعلانات.
            </p>
            <Link className="hy-btn hy-btn-primary" href="/neighborhood?category=RECOMMENDATION">
              <span className="material-symbols-outlined" aria-hidden="true">forum</span>
              اقرأ توصيات الجيران
            </Link>
          </section>

          {/* The directory's honest-discipline note. */}
          <section className="hy-card" aria-labelledby="trust-heading">
            <h2 id="trust-heading" className="hy-widget-title">
              <span className="material-symbols-outlined" aria-hidden="true">
                verified_user
              </span>
              ميثاق الثقة
            </h2>
            <ul className="hy-market-rules">
              <li>كل تقييم في الدليل من جار تعامل فعليًا مع الحرفي.</li>
              <li>«موثّق» تعني تحقق المنصة من هوية مقدم الخدمة — لا أكثر ولا أقل.</li>
              <li>ادفع عبر المنصة فقط، واحتفظ بسجل المحادثة داخل رسائل الجيران.</li>
            </ul>
          </section>
        </div>
      </div>

      <p>
        <Link href="/neighborhood">خلاصة الحي</Link>
      </p>
    </main>
  );
}
