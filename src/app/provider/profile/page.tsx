import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { isUuid } from "@/lib/api/geo";
import { formatDateTime } from "@/lib/format";
import { getProviderProfileById } from "@/lib/api/provider";
import {
  ACTOR_TYPE_LABELS,
  PROVIDER_STATUS_LABELS,
  type ProviderActorType,
  type ProviderStatus,
} from "@/lib/api/provider-contract";
import { EditProviderProfileForm } from "../forms";

/**
 * تعديل ملف المزوّد — charter J5's edit surface (slice S3): the
 * measured PROFILE-ID-GAP governs the page's shape honestly. The
 * backend exposes NO "read my profile" surface — the profile PK is
 * returned by the onboarding POST alone, so this page takes it as URL
 * state (`?id=` — the /neighborhoods ?parent= discipline; the
 * onboarding redirect carries it). Without the id the page states the
 * gap — never a probe and never a guess; with it, the profile read
 * prefills the edit form, and the backend's own ownership gate
 * (verifyOwnership — a foreign id's 403 words) stays the authority.
 * Private surface — `noindex` is the honest robots contract.
 */
export const metadata: Metadata = {
  title: "تعديل ملف المزوّد",
  description: "حرّر اسمك العلني ونبذتك وصفة نشاطك",
  robots: { index: false },
};

type ProviderProfilePageProps = PageProps<"/provider/profile">;

export default async function ProviderProfilePage({ searchParams }: ProviderProfilePageProps) {
  const sp = await searchParams;
  const rawId = Array.isArray(sp?.id) ? sp?.id[0] : sp?.id;

  const session = await getSession();
  if (!session) {
    // The edit-path gate (the backend's measured 401 contract) — the
    // anonymous render never probes the profile read.
    return (
      <main>
        <h1>تعديل ملف المزوّد</h1>
        <p className="page-note" role="status">
          تعديل الملف للمزوّدين المسجّلين — سجّل الدخول أولًا.
        </p>
        <SignInButton callbackURL="/provider/profile" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  if (!rawId) {
    // The measured PROFILE-ID-GAP, stated honestly: the backend exposes
    // no "read my profile" surface, so the profile id reaches this page
    // through the onboarding redirect (`?profile=` on the dashboard) —
    // nothing is invented to fill the seam.
    return (
      <main>
        <h1>تعديل ملف المزوّد</h1>
        <p className="page-note" role="status">
          الباك اند لا يعرض بعد قراءة «ملفي» للمزوّد (فجوة مسجّلة لديه)، لذا
          يصل معرّف ملفك إلى هذه الصفحة عند إنشائه — من لوحة المزوّد مباشرة
          بعد التأهيل. عد إلى اللوحة لتصل إلى بطاقة ملفك ورابط تعديله.
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

  if (!isUuid(rawId)) {
    return (
      <main>
        <h1>تعديل ملف المزوّد</h1>
        <p className="page-note" role="status">
          معرّف الملف في الرابط غير صالح.
        </p>
        <p>
          <Link href="/provider">لوحة المزوّد</Link>
        </p>
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const profile = await getProviderProfileById(rawId);

  return (
    <main>
      <p className="listing-crumb">
        <Link href="/provider">لوحة المزوّد</Link> / <span>تعديل ملف المزوّد</span>
      </p>
      <h1>تعديل ملف المزوّد</h1>

      {profile.ok ? (
        <>
          <section className="card" aria-labelledby="profile-summary-heading">
            <h2 id="profile-summary-heading">ملفك الحالي</h2>
            <ul className="stat-list">
              <li className="stat-row">
                <span>الحالة</span>
                <span className="stat-value">
                  {PROVIDER_STATUS_LABELS[profile.data.status as ProviderStatus] ??
                    profile.data.status}
                </span>
              </li>
              <li className="stat-row">
                <span>الصفة</span>
                <span className="stat-value">
                  {ACTOR_TYPE_LABELS[profile.data.actorType as ProviderActorType] ??
                    profile.data.actorType}
                </span>
              </li>
              {profile.data.ratingAverage !== null ? (
                <li className="stat-row">
                  <span>معدّل التقييم</span>
                  <span className="stat-value">
                    {new Intl.NumberFormat("ar", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }).format(profile.data.ratingAverage)} من ٥
                  </span>
                </li>
              ) : null}
            </ul>
            <p className="page-note">
              {profile.data.displayName} — آخر تحديث{" "}
              {formatDateTime(profile.data.updatedAt)}
            </p>
          </section>

          <section className="card" aria-labelledby="profile-edit-heading">
            <h2 id="profile-edit-heading">التعديلات</h2>
            <p className="page-note">
              {/* The measured trust chain (read in the backend source
                  2026-09-29): the update gate is hasRole('PROVIDER') — a
                  role the L36 onboarding does NOT grant (create requires
                  CONSUMER alone); the administration's role PUT is the
                  elevator. A refusal here is the backend's own words. */}
              حفظ التعديلات يتطلب دور «المزوّد» في جلستك — وهو دور تمنحه
              الإدارة بعد تأهيلك (إنشاء الملف وحده لا يمنحه). إن رفض الخادم
              الحفظ فستظهر كلماته كما هي.
            </p>
            <EditProviderProfileForm profile={profile.data} />
          </section>
        </>
      ) : profile.status === 404 ? (
        <p className="page-note" role="status">
          لا ملف مزوّد بهذا المعرّف.
        </p>
      ) : profile.unauthenticated ? (
        <p className="page-note" role="status">
          جلستك مع الباك اند منتهية — سجّل الدخول من جديد.
        </p>
      ) : (
        /* The backend's own refusal words (verifyOwnership's 403 on a
            foreign id among them) — surfaced verbatim, never guessed. */
        <p className="page-note" role="status">
          {problemMessage(profile.problem, `تعذّرت قراءة الملف (رمز ${profile.status}).`)}
        </p>
      )}

      <p>
        <Link href="/provider">لوحة المزوّد</Link>
      </p>
      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
