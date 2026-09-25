import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getActiveListings, searchListings } from "@/lib/api/public";
import { problemMessage } from "@/lib/problem";
import type { BackendResult } from "@/lib/api/server";
import type { ListingSummary, PagedResponse } from "@/lib/api/types";
import { ListingCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SignInButton, SignOutButton } from "./auth-buttons";

/** Featured strip size — top-N of the default browse read (R22, no flags). */
const HOME_FEATURED_SIZE = 4;
/** Latest strip size — newest-ordered read (spec §2 «الأحدث»). */
const HOME_LATEST_SIZE = 4;

// Home per approved spec §2 (docs/superpowers/specs/
// 2026-09-23-browse-platform-design.md), top to bottom (RTL): session-aware
// header (visual upgrade only) → search hero (text + category + location —
// three fields ONLY; the full filter surface is /listings §3) → featured
// (L37 shading order from the same browse point) → latest → the two entry
// cards (neighborhoods + «اعرض عقارك») → footer. Session logic is unchanged
// from the previous homepage (same getSession read, same links, same
// SignIn/SignOut components) — presentation only. SEO policy for the home
// route is unchanged (layout defaults; no generateMetadata added).
export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  // TWO public reads (both cache()-deduped per render pass):
  // 1) Featured — `GET /api/v1/listings?page&size` (the L37 shading order
  //    rides the default browse read itself — spec §2, same channel as before).
  const featured = await getActiveListings(0, HOME_FEATURED_SIZE);
  // 2) Latest — spec §2 «الأحدث». Measured decision (2026-09-25, staging):
  //    `GET /api/v1/listings?sort=newest` answers 500 INT-001 (traceId
  //    774ef041… — same defect family as the flagged q+sort 500), so the
  //    public listings endpoint cannot carry a sort. The proven newest
  //    channel is `GET /api/v1/search?page&size&sort=newest` (Task-6 probe,
  //    re-measured today: valid PagedResponse) — still one anonymous public
  //    GET, wired through the existing sanitized searchListings layer.
  const latest = await searchListings({}, 0, HOME_LATEST_SIZE, "newest");

  return (
    <>
      {/* Session-aware header (spec §2 — visual upgrade only: the same
          session facts and links that lived at the page bottom, now a top
          bar; no new session logic). */}
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-header-brand">
            السوق
          </Link>
          <nav className="site-header-nav" aria-label="التنقل الرئيس">
            <Link href="/listings">تصفّح الإعلانات</Link>
            <Link href="/neighborhoods">المناطق والأحياء</Link>
          </nav>
          <div className="site-header-session">
            {session ? (
              <>
                <span className="site-header-user">
                  مرحبًا، {session.user.name || session.user.email}
                </span>
                <nav className="site-header-user-nav" aria-label="أسطح حسابك">
                  <Link href="/neighborhood">حارتي</Link>
                  <Link href="/provider">لوحة المزوّد</Link>
                  <Link href="/bookings">حجوزاتي</Link>
                  <Link href="/inbox">الصندوق</Link>
                  <Link href="/profile">ملفي</Link>
                </nav>
                <SignOutButton />
              </>
            ) : (
              <>
                <span className="site-header-note">لم تسجّل الدخول بعد.</span>
                <SignInButton />
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Search hero — spec §2: text + category + location ONLY (three
            fields; the 16-field wall moved out — the full filter sidebar is
            /listings §3). Native GET to /listings (no client JS): param
            names are the parsed /listings contract, and the location field
            is free PROSE — /listings resolves it server-side (uuid direct
            or ≥2-char geo suggest, listings/page.tsx R-measured). */}
        <section className="home-hero" aria-labelledby="hero-heading">
          <h1 id="hero-heading">اعثر على مكانك القادم</h1>
          <p className="home-hero-lede">
            إعلانات عقارية وخدمية نشطة في حارتك — تصفّح، تواصل مع أصحاب
            الإعلانات، واحجز مباشرة.
          </p>
          <form
            className="home-hero-form"
            method="get"
            action="/listings"
            role="search"
            aria-label="البحث في الإعلانات"
          >
            <Field label="البحث">
              <input
                type="search"
                name="q"
                autoComplete="off"
                placeholder="ابحث بالكلمات…"
              />
            </Field>
            <Field label="الفئة">
              <input
                type="text"
                name="category"
                autoComplete="off"
                list="hero-category-examples"
                placeholder="مثال: إقامة"
              />
              <datalist id="hero-category-examples">
                <option value="stay" />
                <option value="إقامة" />
                <option value="خدمة" />
                <option value="عقار" />
              </datalist>
            </Field>
            <Field label="الموقع" hint="اسم المنطقة — يُحلّ تلقائيًا في نتائج البحث">
              <input
                type="text"
                name="locationId"
                autoComplete="off"
                placeholder="مثال: قدسيا"
              />
            </Field>
            <Button variant="primary" size="lg" type="submit">
              ابحث
            </Button>
          </form>
        </section>

        {/* Featured — L37 shading order from the same browse point. */}
        <section aria-labelledby="featured-heading" className="home-section featured-ribbon">
          <div className="home-section-head">
            <h2 id="featured-heading">إعلانات مميزة</h2>
            <Link href="/listings">عرض كل الإعلانات</Link>
          </div>
          <ListingStrip
            result={featured}
            emptyTitle="لا توجد إعلانات مميزة حالياً"
            emptyHint="جرّب تصفّح كل الإعلانات"
          />
        </section>

        {/* Latest — newest-ordered public read (spec §2 «الأحدث»). */}
        <section aria-labelledby="latest-heading" className="home-section">
          <div className="home-section-head">
            <h2 id="latest-heading">الأحدث</h2>
            <Link href="/listings?sort=newest">عرض الأحدث</Link>
          </div>
          <ListingStrip
            result={latest}
            emptyTitle="لا توجد إعلانات بعد"
            emptyHint="أول إعلان يُنشأ سيظهر هنا"
          />
        </section>

        {/* The two entry cards (spec §2: بطاقتا الحارات و«اعرض عقارك»). */}
        <section aria-labelledby="entries-heading" className="home-section">
          <h2 id="entries-heading">استكشف</h2>
          <ul className="entry-cards">
            <li className="entry-card">
              <h3>حارتك — مجتمع الجيران</h3>
              <p>
                اختر حيّك من الشجرة الإدارية، وادخل مجتمع جوارك: منشورات،
                رسائل مباشرة، وأعمال الحي.
              </p>
              <div className="entry-card-cta">
                <Link href="/neighborhoods" className="button" data-variant="secondary">
                  اختر حارتك
                </Link>
              </div>
            </li>
            <li className="entry-card">
              <h3>اعرض عقارك</h3>
              <p>
                أنشئ إعلانك مسودة ثم انشّره ليراه الزوّار — إدارة كاملة
                لإعلاناتك ومشاهداتها وحجوزاتك.
              </p>
              <div className="entry-card-cta">
                <Link href="/provider" className="button" data-variant="primary">
                  ابدأ كمزوّد
                </Link>
              </div>
            </li>
          </ul>
        </section>
      </main>

      {/* Footer — body's sticky-footer shape (flex column + margin-block
          auto) anticipated this since the foundation. */}
      <footer className="site-footer">
        <div className="site-footer-inner">
          <p className="site-footer-brand">السوق</p>
          <nav aria-label="روابط التذييل">
            <Link href="/listings">تصفّح الإعلانات</Link>
            <Link href="/neighborhoods">المناطق والأحياء</Link>
          </nav>
          <p className="site-footer-note">
            واجهة عربية عامة — إعلانات نشطة يصلها الجميع ومحركات البحث.
          </p>
        </div>
      </footer>
    </>
  );
}

/** One listings strip: the shared render for the featured + latest rows
 *  (grid of ListingCard; honest failure branches as data, like every
 *  public surface in this app — never a crashed render). */
function ListingStrip({
  result,
  emptyTitle,
  emptyHint,
}: {
  result: BackendResult<PagedResponse<ListingSummary>>;
  emptyTitle: string;
  emptyHint: string;
}) {
  if (result.ok) {
    if (result.data.content.length === 0) {
      return (
        <EmptyState
          title={emptyTitle}
          hint={emptyHint}
          action={<Link href="/listings">عرض كل الإعلانات</Link>}
        />
      );
    }
    return (
      <ul className="listing-grid">
        {result.data.content.map((listing) => (
          <li key={listing.id}>
            <ListingCard listing={listing} />
          </li>
        ))}
      </ul>
    );
  }
  if (result.status === 0) {
    return (
      <p className="page-note" role="status">
        الخادم الخلفي غير متاح حالياً — لا يمكن قراءة الإعلانات الآن.
      </p>
    );
  }
  return (
    <p className="page-note" role="status">
      {problemMessage(
        result.problem,
        `تعذّر قراءة الإعلانات (رمز ${result.status}).`,
      )}
    </p>
  );
}
