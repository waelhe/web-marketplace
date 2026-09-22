import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/dal";
import { backendGet } from "@/lib/api/server";
import { problemMessage } from "@/lib/problem";
import { SignOutButton } from "../auth-buttons";

// Profile: DAL session + DIRECT backend fetch (no self HTTP round trip —
// official BFF guide). The /me payload shape is intentionally loose until
// the typed API layer lands with the OpenAPI export (recorded debt: exact
// DTO types come from the backend contract, not invention).
type MePayload = Record<string, unknown>;

// Private surface — `noindex` is the honest robots contract for
// session-scoped content (the one private route that was missing it;
// surfaced by the production battery's anonymous-privacy probe, 2026-09-22).
export const metadata: Metadata = {
  title: "الملف الشخصي",
  description: "جلستك الحالية وبيانات حسابك من الخادم",
  robots: { index: false },
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>الملف الشخصي</h1>
        <p className="page-note">
          لم تسجّل الدخول. <Link href="/">تسجيل الدخول</Link>
        </p>
      </main>
    );
  }

  const me = await backendGet<MePayload>("/api/v1/users/me");

  return (
    <main>
      <h1>الملف الشخصي</h1>
      <p>مسجّل الدخول باسم: {session.name || session.email}</p>

      {me.ok ? (
        <section className="card" aria-label="بيانات الحساب من الخادم">
          <h2>
            <code>GET /api/v1/users/me</code>
          </h2>
          <pre dir="ltr">{JSON.stringify(me.data, null, 2)}</pre>
        </section>
      ) : me.status === 0 ? (
        <p className="page-note" role="status">
          الخادم الخلفي غير متاح حالياً — لا يمكن قراءة البيانات الآن.
        </p>
      ) : (
        <p className="page-note" role="status">
          {problemMessage(me.problem, `تعذّر قراءة البيانات (رمز ${me.status}).`)}
        </p>
      )}

      <p>
        <Link href="/">الرئيسية</Link> <SignOutButton />
      </p>
    </main>
  );
}
