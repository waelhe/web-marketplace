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
      {session ? (
        <>
          <p>مسجّل الدخول باسم: {session.user.name || session.user.email}</p>
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
