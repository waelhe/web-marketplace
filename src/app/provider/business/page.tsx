import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { isUuid, getGeoChildren, GEO_ROOT_ID } from "@/lib/api/geo";
import { getProviderPublicPage } from "@/lib/api/reputation";
import {
  PROVIDER_PAGE_LISTINGS_SIZE,
  PROVIDER_PAGE_REVIEWS_SIZE,
  PROVIDER_VERIFICATION_LABELS,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  type ProviderVerificationState,
} from "@/lib/api/reputation-contract";
import {
  BusinessHoursForm,
  ServiceAreaAddForm,
  ServiceAddForm,
  ServiceEditForm,
  ServiceMoveForms,
  ServiceRemoveForm,
  VerificationSubmitForm,
} from "./forms";

/**
 * إدارة صفحة الأعمال — W2 (yelp-level plan §5, #489): the provider's
 * own business-page writes — the declared working week (G11), the
 * services menu (G12), the service areas (G13), and the
 * ownership-verification claim (G14).
 *
 * The measured PROFILE-ID-GAP governs the page's shape honestly (the
 * /provider/profile discipline verbatim): the backend exposes NO "read
 * my profile" surface — the profile PK rides the URL (`?id=`, carried
 * from the dashboard's profile card). Without it the page states the
 * gap — never a probe, never a guess. With it, the PUBLIC page read
 * (`GET /providers/{id}/public` — the same one-read assembly the
 * public surface renders) prefills every editor, and the backend's own
 * ownership gate (a foreign id's 403 words) stays the authority.
 *
 * The area picker is the /neighborhoods drill discipline (`?areaParent=`
 * links over the public geo children read) — the declared node at any
 * level of the tree, never free text. The AREA WITHDRAW seam is stated
 * on the page itself (the served view carries no area row id — the
 * declared backend seam, recorded in the charter's debt section).
 * Private surface — `noindex` is the honest robots contract.
 */
export const metadata: Metadata = {
  title: "إدارة صفحة الأعمال",
  robots: { index: false },
};

type BusinessPageProps = PageProps<"/provider/business">;

function parseParam(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && value.length > 0 ? value : null;
}

export default async function ProviderBusinessPage({
  searchParams,
}: BusinessPageProps) {
  const sp = await searchParams;
  const rawId = parseParam(sp?.id);
  const areaParent = parseParam(sp?.areaParent) ?? GEO_ROOT_ID;

  const session = await getSession();
  if (!session) {
    // The write-path gate (the backend's measured 401 contract) — the
    // anonymous render never probes the profile read.
    return (
      <main>
        <h1>إدارة صفحة الأعمال</h1>
        <p className="page-note" role="status">
          إدارة صفحة الأعمال للمزوّدين المسجّلين — سجّل الدخول أولًا.
        </p>
        <SignInButton callbackURL="/provider/business" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  if (!rawId || !isUuid(rawId)) {
    // The measured PROFILE-ID-GAP, stated honestly (the /provider/profile
    // twin): the profile id reaches this page from the dashboard's
    // profile card — nothing is invented to fill the seam.
    return (
      <main>
        <h1>إدارة صفحة الأعمال</h1>
        <p className="page-note" role="status">
          الباك اند لا يعرض بعد قراءة «ملفي» للمزوّد (فجوة مسجّلة لديه)، لذا
          يصل معرّف ملفك إلى هذه الصفحة من لوحة المزوّد مباشرةً بعد التأهيل —
          من بطاقة ملفك ورابط «صفحة أعمالي».
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

  // The prefill read: the SAME public one-read assembly the public page
  // renders (hours, services, areas, verification) — memoized per render
  // pass; a foreign id answers 403 with the backend's own words, an
  // unknown id 404.
  const page = await getProviderPublicPage(
    rawId,
    0,
    PROVIDER_PAGE_LISTINGS_SIZE,
    0,
    PROVIDER_PAGE_REVIEWS_SIZE,
  );

  if (!page.ok) {
    return (
      <main>
        <h1>إدارة صفحة الأعمال</h1>
        {page.status === 0 ? (
          <p className="page-note" role="status">
            الخادم الخلفي غير متاح حالياً — لا يمكن قراءة صفحة أعمالك الآن.
          </p>
        ) : (
          <p className="page-note" role="status">
            {problemMessage(page.problem, `تعذّرت قراءة صفحة أعمالك (رمز ${page.status}).`)}
          </p>
        )}
        <p>
          <Link href="/provider">لوحة المزوّد</Link>
        </p>
      </main>
    );
  }

  const provider = page.data;
  const hoursByDay = new Map(
    (provider.businessHours ?? []).map((hour) => [hour.dayOfWeek, hour]),
  );
  const services = provider.services ?? [];
  const areas = provider.serviceAreas ?? [];

  // The area picker's drill read (the /neighborhoods ?parent=
  // discipline — the public geo children, one GET for the current
  // node).
  const children = await getGeoChildren(areaParent);

  return (
    <main>
      <p className="listing-crumb">
        <Link href="/provider">لوحة المزوّد</Link> / <span>صفحة الأعمال</span>
      </p>
      <h1>صفحة أعمال: {provider.displayName}</h1>
      <p className="page-note">
        كل كتلة هنا هي ما يراه الجيران على{" "}
        <Link href={`/providers/${provider.id}`}>صفحتك العامة</Link> — ساعات
        العمل، الخدمات، نطاقات الخدمة، وشارة توثيق الملكية.
      </p>

      <section className="card" aria-labelledby="verification-heading">
        <h2 id="verification-heading">توثيق الملكية</h2>
        <p className="listing-meta">
          <span
            className="listing-category"
            data-verification={provider.verificationState}
            aria-label="حالة توثيق الملكية"
          >
            {PROVIDER_VERIFICATION_LABELS[
              provider.verificationState as ProviderVerificationState
            ] ?? provider.verificationState}
          </span>
        </p>
        <p className="page-note">
          شارة عرض فقط — لا تمنح أي صلاحية. يراجع الطلبَ فريقُ الإدارة
          (القبول يضيء «مالك موثّق» على صفحتك العامة؛ الرفض يتيح التقديم
          مجددًا).
        </p>
        {provider.verificationState === "UNVERIFIED" ||
        provider.verificationState === "REJECTED" ? (
          <VerificationSubmitForm profileId={provider.id} />
        ) : (
          <p className="page-note" role="status">
            {provider.verificationState === "PENDING"
              ? "طلبك قيد مراجعة الإدارة."
              : "ملكك موثّقة — الشارة معروضة على صفحتك العامة."}
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="hours-heading">
        <h2 id="hours-heading">ساعات العمل</h2>
        <p className="page-note">
          الإقرار استبدال كامل للأسبوع: علّم الأيام وحدّد نافذة اليوم — اليوم
          غير المعلَّم يُسحب من الإعلان عند الحفظ (بوابة V96: نافذة واحدة
          لكل يوم).
        </p>
        <BusinessHoursForm
          profileId={provider.id}
          initial={WEEKDAY_ORDER.map((day) => {
            const hour = hoursByDay.get(day);
            return {
              dayOfWeek: day,
              dayLabel: WEEKDAY_LABELS[day] ?? day,
              declared: hour !== undefined,
              opensAt: hour ? hour.opensAt.slice(0, 5) : "09:00",
              closesAt: hour ? hour.closesAt.slice(0, 5) : "17:00",
            };
          })}
        />
      </section>

      <section className="card" aria-labelledby="services-heading">
        <h2 id="services-heading">الخدمات</h2>
        <p className="page-note">
          قائمتك بالترتيب الذي يعرضه الجيران. السعر بالوحدات الكاملة (ريال) —
          يُحوَّل إلى قروش على السلك؛ العملة رمز ISO 4217 (SAR). الزوج
          (سعر+عملة) معًا أو لا شيء، والمدة موجبة عند إقرارها.
        </p>
        {services.length === 0 ? (
          <p className="page-note" role="status">
            لا خدمات معلنة بعد — أضف أول خدمة أدناه.
          </p>
        ) : (
          <ul className="feed-list">
            {services.map((service, index) => (
              <li key={service.id} className="card post-card">
                <ServiceEditForm
                  profileId={provider.id}
                  service={service}
                  positionLabel={index + 1}
                />
                <ServiceMoveForms
                  profileId={provider.id}
                  serviceId={service.id}
                  position={service.position}
                  min={services[0].position}
                  max={services[services.length - 1].position}
                />
                <ServiceRemoveForm profileId={provider.id} serviceId={service.id} />
              </li>
            ))}
          </ul>
        )}
        <h3>أضف خدمة</h3>
        <ServiceAddForm profileId={provider.id} />
      </section>

      <section className="card" aria-labelledby="areas-heading">
        <h2 id="areas-heading">نطاقات الخدمة</h2>
        <p className="page-note">
          «أخدم هذه المناطق» — تُعرض بأسمائها المحلّية على صفحتك العامة.
          انزل في الشجرة الإدارية وأعلن النطاق من أي مستوى.
        </p>
        {areas.length > 0 ? (
          <p className="listing-meta" aria-label="النطاقات المعلنة">
            {areas.map((area, index) => (
              <span key={area.locationId}>
                {index > 0 ? <span>·</span> : null}
                <span>{area.nameAr ?? area.nameEn ?? area.slug}</span>
              </span>
            ))}
          </p>
        ) : (
          <p className="page-note" role="status">
            لا نطاقات معلنة بعد.
          </p>
        )}
        <p className="page-note" role="note">
          سحب نطاق معلن غير متاح عبر العقد الحالي (العرض العام لا يحمل معرّف
          صف النطاق — فجوة مسجّلة لفريق الخلفي).
        </p>
        <h3>أعلن نطاقًا</h3>
        {areaParent !== GEO_ROOT_ID ? (
          <p className="page-note">
            <Link href={`/provider/business?id=${provider.id}`}>
              من جذر الشجرة
            </Link>
          </p>
        ) : null}
        <ServiceAreaAddForm profileId={provider.id} locationId={areaParent} />
        {children.ok ? (
          children.data.length === 0 ? (
            <p className="page-note" role="status">
              لا عقد أدنى تحت هذا المستوى.
            </p>
          ) : (
            <ul className="feed-list" aria-label="عقد الشجرة الإدارية">
              {children.data.map((node) => (
                <li key={node.id} className="listing-meta">
                  <span>{node.nameAr}</span>
                  <span>·</span>
                  <Link
                    href={`/provider/business?id=${provider.id}&areaParent=${node.id}`}
                  >
                    انزل ({node.nameEn ?? node.slug})
                  </Link>
                  <span>·</span>
                  <ServiceAreaAddForm profileId={provider.id} locationId={node.id} />
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="page-note" role="status">
            تعذّرت قراءة الشجرة الإدارية الآن — عد وحاول لاحقاً.
          </p>
        )}
      </section>

      <p>
        <Link href="/provider">لوحة المزوّد</Link>
      </p>
    </main>
  );
}
