import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getActiveListings } from "@/lib/api/public";
import { problemMessage } from "@/lib/problem";
import { PageHeader } from "@/components/ui/page-header";
import { ListingCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SignInButton, SignOutButton } from "./auth-buttons";

/** Featured strip size — top-N of the default browse read (R22, no flags). */
const HOME_FEATURED_SIZE = 4;

// Home: session-aware server component (P2 logic, Arabic RTL UI).
// Session is read directly via the auth API — the DAL (src/lib/dal.ts)
// centralizes this once interactive data arrives.
export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  // ONE backend GET for the featured strip (React cache() dedups per
  // render pass — no fetching code added here). Newest section CUT per
  // R28: the live sort probe (Task 5 report) could not prove a
  // newest-ordering, so only the default-query strip is wired.
  const featured = await getActiveListings(0, HOME_FEATURED_SIZE);

  return (
    <main>
      <PageHeader
        title="السوق"
        description="ابحث في الإعلانات النشطة أو استكشف المناطق والمزوّدين"
      />

      {/* Hero search — native GET to /listings (no client JS required).
          Param names are the Task-0-verified /api/v1/search contract;
          Task 6 owns parsing/sanitizing on the listings page. */}
      <form method="get" action="/listings" role="search" aria-label="البحث في الإعلانات">
        <Field label="البحث">
          <input type="search" name="q" autoComplete="off" />
        </Field>
        <Field label="التصنيف">
          <input type="text" name="category" autoComplete="off" />
        </Field>
        <Field label="السعر الأدنى">
          <input type="number" name="minPrice" />
        </Field>
        <Field label="السعر الأقصى">
          <input type="number" name="maxPrice" />
        </Field>
        <Field label="تاريخ الوصول">
          <input type="date" name="checkIn" />
        </Field>
        <Field label="تاريخ المغادرة">
          <input type="date" name="checkOut" />
        </Field>
        <Field label="عدد الضيوف">
          <input type="number" name="guests" />
        </Field>
        <Field label="معرّف الموقع">
          <input type="text" name="locationId" autoComplete="off" />
        </Field>
        <Field label="الغرض">
          <select name="purpose" defaultValue="">
            <option value="">الكل</option>
            <option value="RENT">إيجار</option>
            <option value="SALE">بيع</option>
          </select>
        </Field>
        <Field label="نوع العقار">
          <select name="propertyType" defaultValue="">
            <option value="">الكل</option>
            <option value="APARTMENT">شقة</option>
            <option value="VILLA">فيلا</option>
            <option value="LAND">أرض</option>
            <option value="SHOP">محل</option>
            <option value="OFFICE">مكتب</option>
            <option value="GARAGE">كراج</option>
          </select>
        </Field>
        <Field label="الغرف (أدنى)">
          <input type="number" name="minRooms" />
        </Field>
        <Field label="الحمامات (أدنى)">
          <input type="number" name="minBathrooms" />
        </Field>
        <Field label="المساحة م² (أدنى)">
          <input type="number" name="minAreaM2" />
        </Field>
        <Field label="خط العرض">
          <input type="number" name="lat" step="any" />
        </Field>
        <Field label="خط الطول">
          <input type="number" name="lng" step="any" />
        </Field>
        <Field label="النطاق كم">
          <input type="number" name="radiusKm" step="any" />
        </Field>
        <Button variant="primary" size="md" type="submit">
          ابحث
        </Button>
      </form>

      <section aria-labelledby="featured-heading">
        <h2 id="featured-heading">إعلانات مميزة</h2>
        {featured.ok ? (
          featured.data.content.length === 0 ? (
            <EmptyState
              title="لا توجد إعلانات مميزة حالياً"
              hint="جرّب تصفّح كل الإعلانات"
              action={<Link href="/listings">عرض كل الإعلانات</Link>}
            />
          ) : (
            <>
              <ul className="listing-grid">
                {featured.data.content.map((listing) => (
                  <li key={listing.id}>
                    <ListingCard listing={listing} />
                  </li>
                ))}
              </ul>
              <p>
                <Link href="/listings">عرض كل الإعلانات</Link>
              </p>
            </>
          )
        ) : featured.status === 0 ? (
          <p className="page-note" role="status">
            الخادم الخلفي غير متاح حالياً — لا يمكن قراءة الإعلانات المميزة الآن.
          </p>
        ) : (
          <p className="page-note" role="status">
            {problemMessage(featured.problem, `تعذّر قراءة الإعلانات المميزة (رمز ${featured.status}).`)}
          </p>
        )}
      </section>

      <section aria-labelledby="entries-heading">
        <h2 id="entries-heading">استكشف</h2>
        <ul>
          <li>
            <Link href="/neighborhoods">المناطق والأحياء — اختر حارتك</Link>
          </li>
          <li>
            <Link href="/provider">لوحة المزوّد — إعلاناتك</Link>
          </li>
        </ul>
      </section>

      {session ? (
        <>
          <p>مسجّل الدخول باسم: {session.user.name || session.user.email}</p>
          <p>
            <Link href="/neighborhood">حارتي — مجتمع الجيران</Link>
          </p>
          <p>
            {/* The provider path (stage 3) — the Nextdoor Business
                surface: onboarding, listings, analytics. */}
            <Link href="/provider">لوحة المزوّد — إعلاناتك</Link>
          </p>
          <p>
            {/* The inbox (stage 4) — notifications, contact requests,
                and neighbor conversations. */}
            <Link href="/inbox">الصندوق — إشعاراتك ورسائلك</Link>
          </p>
          <p>
            <Link href="/profile">الملف الشخصي (يقرأ /me عبر الوسيط)</Link>
          </p>
          <SignOutButton />
        </>
      ) : (
        <>
          <p className="page-note">لم تسجّل الدخول بعد.</p>
          <SignInButton />
        </>
      )}
    </main>
  );
}
