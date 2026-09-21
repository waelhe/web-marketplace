import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { getMyListingViews } from "@/lib/api/provider";
import { CreateListingForm } from "../../forms";

/**
 * إعلان جديد — the create surface of the provider path. The measured
 * funnel: a session alone is not enough — the backend requires a
 * provider profile (the me-surface 404 house answer) AND the VERIFIED
 * status (CatalogService.create's own gate, 400 with its own words).
 * The page renders the honest states; the backend's gate message
 * surfaces verbatim when the profile is still PENDING.
 */
export const metadata: Metadata = {
  title: "إعلان جديد",
  description: "أنشئ إعلانك كمزوّد",
  robots: { index: false },
};

type NewListingPageProps = PageProps<"/provider/listings/new">;

export default async function NewListingPage(_props: NewListingPageProps) {
  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>إعلان جديد</h1>
        <p className="page-note" role="status">
          إنشاء الإعلانات للمزوّدين المسجّلين — سجّل الدخول أولًا.
        </p>
        <SignInButton callbackURL="/provider/listings/new" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  // The profile probe (the me-surface 404 house answer) — one GET that
  // decides which honest state this page renders.
  const views = await getMyListingViews();
  if (!views.ok && views.status === 404) {
    return (
      <main>
        <h1>إعلان جديد</h1>
        <p className="page-note" role="status">
          لا ملف مزوّد لحسابك بعد — أنشئه أولًا من لوحة المزوّد.
        </p>
        <p>
          <Link className="button" data-variant="primary" href="/provider">
            إلى لوحة المزوّد
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
      <h1>إعلان جديد</h1>
      <p className="page-note">
        {/* The honest funnel note: the VERIFIED gate lives in the backend
            (measured: CatalogService.create filters on VERIFIED). A
            PENDING profile's first submit surfaces the backend's own
            words — nothing is hidden or pre-claimed here. */}
        يُولد الإعلان مسودةً ثم تنشّطه من صفحة إدارته (تنشيط الإعلان هو ما
        يطلق جسر الحارة L46). إنشاء الإعلانات يتطلب توثيق ملف المزوّد من
        الإدارة — إن كان ملفك بعدُ بانتظار التوثيق فسيخبرك الباك اند عند
        الحفظ.
      </p>
      <section className="card">
        <h2>بيانات الإعلان</h2>
        <CreateListingForm />
      </section>
      <p>
        <Link href="/provider">لوحة المزوّد</Link>
      </p>
      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
