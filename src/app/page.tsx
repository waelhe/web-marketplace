import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignInButton, SignOutButton } from "./auth-buttons";

// Home: session-aware server component (P2 logic, Arabic RTL UI).
// Session is read directly via the auth API — the DAL (src/lib/dal.ts)
// centralizes this once interactive data arrives.
export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main>
      <h1>السوق</h1>
      <p>
        {/* The public browse surface — reachable signed-out (anonymous
            GETs; the first SEO-indexable page) and signed-in alike. */}
        <Link href="/listings">تصفّح الإعلانات</Link>
      </p>
      <p>
        {/* The neighborhood picker — public geo surface (anonymous GETs);
            the community entry for members. */}
        <Link href="/neighborhoods">المناطق والأحياء — اختر حارتك</Link>
      </p>
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
