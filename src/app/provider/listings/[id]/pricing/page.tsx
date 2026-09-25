import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { formatDate, formatPrice } from "@/lib/format";
import { getListingPriceCalendar } from "@/lib/api/pricing";
import { getListingDetail } from "@/lib/api/public";
import { isUuid } from "@/lib/api/geo";
import { EmptyState } from "@/components/ui/empty-state";
import type { SeasonalRateView } from "@/lib/api/pricing-contract";
import {
  SeasonalRateAddForm,
  SeasonalRateDeleteButton,
  SeasonalRateEditForm,
  WeekendRuleDeleteButton,
  WeekendRuleForm,
} from "./forms";

/**
 * تقويم أسعار الإعلان — the L26 host-tools surface (batch-1 spec §1):
 * the weekend multiplier (one live row, upsert/remove) and the seasonal
 * ranges [fromDate, toDate) with absolute nightly prices, on the
 * backend's own measured contract.
 *
 * The page's data flow IS the backend's measured read model:
 * - the calendar read doubles as the ownership probe (403 foreign, 404
 *   unknown — requireOwnedListing) and carries NO status gate: it works
 *   for a listing in ANY state (measured 200 on an archived listing);
 * - the public detail read carries the title and the base price ONLY
 *   while the listing is ACTIVE (it 404s otherwise) — so the base-price
 *   line exists on the published view, and the non-public view states
 *   the measured read gap instead of guessing the currency (the price
 *   table then shows the backend's own minor units verbatim);
 * - the RULES-ONLY truth bound (spec §1): the response carries no day
 *   prices and takes no window — the effective nightly price of any
 *   stay is the backend's PricingService, never recomputed here
 *   (client-side re-pricing would be patch debt).
 */
export const metadata: Metadata = {
  title: "تسعير إعلان",
  description: "قواعد أسعار نهاية الأسبوع والنطاقات الموسمية",
  robots: { index: false },
};

type PricingPageProps = PageProps<"/provider/listings/[id]/pricing">;

/**
 * The nightly price label — major units in the listing's own currency
 * when the public read is available; the backend's own minor units
 * verbatim when it is not (never a guessed currency).
 */
function nightlyPriceLabel(priceCents: number, currency: string | null): string {
  return currency !== null
    ? formatPrice(priceCents / 100, currency)
    : `${new Intl.NumberFormat("ar").format(priceCents)} وحدة صغرى`;
}

export default async function ListingPricingPage({ params }: PricingPageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>تسعير إعلان</h1>
        <p className="page-note" role="status">
          تسعير الإعلانات للمزوّدين المسجّلين — سجّل الدخول أولًا.
        </p>
        <SignInButton callbackURL={`/provider/listings/${id}/pricing`} />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  if (!isUuid(id)) {
    return (
      <main>
        <h1>تسعير إعلان</h1>
        <p className="page-note" role="status">
          معرّف الإعلان غير صالح.
        </p>
        <p>
          <Link href="/provider">لوحة المزوّد</Link>
        </p>
      </main>
    );
  }

  // The ownership probe AND the primary data — no status gate exists on
  // the calendar read (measured on an archived listing).
  const calendar = await getListingPriceCalendar(id);
  if (!calendar.ok) {
    if (calendar.status === 403) {
      return (
        <main>
          <h1>تسعير إعلان</h1>
          <p className="page-note" role="status">
            هذا الإعلان ليس لك — لكل مزوّد إعلاناته.
          </p>
          <p>
            <Link href="/provider">لوحة المزوّد</Link>
          </p>
        </main>
      );
    }
    if (calendar.status === 404) {
      return (
        <main>
          <h1>تسعير إعلان</h1>
          <p className="page-note" role="status">
            لا يوجد إعلان بهذا المعرّف.
          </p>
          <p>
            <Link href="/provider">لوحة المزوّد</Link>
          </p>
        </main>
      );
    }
    return (
      <main>
        <h1>تسعير إعلان</h1>
        <p className="page-note" role="status">
          {calendar.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(
                calendar.problem,
                `تعذّر قراءة تقويم الأسعار (رمز ${calendar.status}).`,
              )}
        </p>
        <p>
          <Link href={`/provider/listings/${id}`}>إدارة الإعلان</Link>
        </p>
      </main>
    );
  }

  // Best-effort public read: the title and the base price exist here
  // ONLY while the listing is ACTIVE (the measured read model) — the
  // non-public view states that gap instead of guessing fields.
  const detail = await getListingDetail(id);
  const published = detail.ok;
  const listing = published ? detail.data : null;

  return (
    <main>
      <h1>تسعير إعلان</h1>

      <section className="card">
        <h2>{listing !== null ? listing.title : "الإعلان غير منشور"}</h2>
        {listing !== null ? (
          <p className="listing-meta">
            <span>السعر الأساس {formatPrice(listing.price, listing.currency)}</span>
            <span>·</span>
            <span>آخر تحديث {formatDate(listing.updatedAt)}</span>
          </p>
        ) : (
          <p className="page-note">
            الإعلان غير ظاهر في العرض العام (مسودة، أو موقوف، أو منتهيًا، أو
            مؤرشفًا) — القراءة الحقلية متاحة للباك اند على المنشور فقط،
            لكن التقويم نفسه قابل للإدارة في أي حالة (قياس).
          </p>
        )}
        <p className="listing-meta">
          <Link href={`/provider/listings/${id}`}>إدارة الإعلان</Link>
        </p>
      </section>

      <section className="card" aria-labelledby="weekend-heading">
        <h2 id="weekend-heading">قاعدة نهاية الأسبوع</h2>
        {calendar.data.weekendRule !== null ? (
          <>
            <p className="listing-meta">
              <span className="stat-value">
                ×{new Intl.NumberFormat("ar", { maximumFractionDigits: 3 }).format(
                  calendar.data.weekendRule.multiplier,
                )}
              </span>
              <span>·</span>
              <span>على السعر الأساس لليالي السبت والأحد</span>
              <span>·</span>
              <span>آخر تحديث {formatDate(calendar.data.weekendRule.updatedAt)}</span>
            </p>
            <div className="action-row">
              <WeekendRuleDeleteButton listingId={id} />
            </div>
          </>
        ) : (
          <EmptyState
            title="لا قاعدة نهاية أسبوع"
            hint="كل الليالي بالسعر الأساس — أنشئ مضاعفًا لليالي السبت والأحد أدناه."
          />
        )}
        <WeekendRuleForm
          listingId={id}
          currentMultiplier={calendar.data.weekendRule?.multiplier ?? null}
        />
      </section>

      <section className="card" aria-labelledby="seasonal-heading">
        <h2 id="seasonal-heading">النطاقات الموسمية</h2>
        <p className="page-note">
          نطاقات مفتوحة [البداية، النهاية) بسعر ليلة مطلق — المتجاورة بحدّ
          مشترك قانونية، والتداخل الفعلي يرفضه الخادم بكلماته (409).
        </p>
        {calendar.data.seasonalRates.length > 0 ? (
          <table className="pricing-table">
            <thead>
              <tr>
                <th scope="col">من (شامل)</th>
                <th scope="col">حتى (غير شامل)</th>
                <th scope="col">سعر الليلة</th>
                <th scope="col">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {calendar.data.seasonalRates.map((rate: SeasonalRateView) => (
                <SeasonalRateRow
                  key={rate.id}
                  rate={rate}
                  listingId={id}
                  currency={listing?.currency ?? null}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="page-note" role="status">
            لا نطاقات موسمية بعد — أضف أول نطاق أدناه.
          </p>
        )}
        <SeasonalRateAddForm listingId={id} />
      </section>

      <p className="page-note">
        هذه الصفحة تعرض القواعد فقط — تسعير الليالي الفعلي لأي نافذة إقامة
        يحسبه الباك اند عند الطلب (PricingService) ولا يُعاد حسابه هنا.
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

/**
 * One seasonal-range row — the measured fields rendered as the backend
 * returns them (LocalDate "YYYY-MM-DD" verbatim, absolute nightly price
 * in minor units), the exclusive end labeled in its column header, and
 * the native <details> disclosure for the edit form (zero invented
 * toggle state).
 */
function SeasonalRateRow({
  rate,
  listingId,
  currency,
}: {
  rate: SeasonalRateView;
  listingId: string;
  currency: string | null;
}) {
  return (
    <>
      <tr>
        <td>{rate.fromDate}</td>
        <td>{rate.toDate}</td>
        <td>{nightlyPriceLabel(rate.priceCents, currency)}</td>
        <td>
          <div className="action-row">
            <SeasonalRateDeleteButton listingId={listingId} rateId={rate.id} />
          </div>
        </td>
      </tr>
      <tr className="pricing-edit-row">
        <td colSpan={4}>
          <details>
            <summary>حرّر النطاق</summary>
            <SeasonalRateEditForm listingId={listingId} rate={rate} />
          </details>
        </td>
      </tr>
    </>
  );
}
