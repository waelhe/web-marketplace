import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { getMyBalance, getMyStatement } from "@/lib/api/provider";
import {
  LEDGER_ENTRY_TYPE_LABELS,
  type LedgerEntryType,
} from "@/lib/api/provider-contract";

/**
 * دفتر الرصيد وكشف الحساب — charter J5's money reads (slice S3, L20):
 * `GET /providers/me/ledger/balance` + the paginated statement. The
 * privacy model is the backend's own contract (measured): both surfaces
 * answer 401 AUTHN-001 to anonymous callers, 404 problem+json when the
 * caller holds no provider profile, and the balance answers an EMPTY
 * (0) record — never a 404 — when nothing has been credited yet
 * (LedgerService.getBalance's orElseGet, read in the backend source
 * 2026-09-29). LEDGER-403 watch (battery card BE-04, the R10 fix on
 * backend main): a 403 here is the deployment's id-space defect, and
 * its problem words surface verbatim — the honest-failure pattern.
 *
 * The money-loop honesty: credits appear only when payments COMPLETE —
 * completion is the backend's webhook/admin path (Stripe is the owner
 * input) — so a 0 balance is a measured state, never a bug claim.
 * Private surface — `noindex` is the honest robots contract.
 */
export const metadata: Metadata = {
  title: "دفتر الرصيد",
  description: "رصيدك وكشف حركاتك كمزوّد",
  robots: { index: false },
};

type ProviderLedgerPageProps = PageProps<"/provider/ledger">;

/** Parse ?page= — the /listings pagination discipline (non-negative int). */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export default async function ProviderLedgerPage({ searchParams }: ProviderLedgerPageProps) {
  const sp = await searchParams;
  const page = parsePage(sp?.page);

  const session = await getSession();
  if (!session) {
    // The ledger-path gate (measured 401 contract) — never a probe from
    // the anonymous render.
    return (
      <main>
        <h1>دفتر الرصيد</h1>
        <p className="page-note" role="status">
          دفتر الرصيد للمزوّدين المسجّلين — سجّل الدخول لعرضه.
        </p>
        <SignInButton callbackURL="/provider/ledger" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  // The funnel probe + the page's data ride parallel reads: the balance
  // read's 404 IS the no-profile state machine input (the same seam the
  // dashboard's views probe uses); the statement follows the same gate.
  const [balance, statement] = await Promise.all([getMyBalance(), getMyStatement(page)]);

  if (balance.status === 404) {
    return (
      <main>
        <h1>دفتر الرصيد</h1>
        <p className="page-note" role="status">
          لا ملف مزوّد لحسابك بعد — الدفتر يُفتح بإنشاء الملف من لوحة المزوّد.
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
      <p className="listing-crumb">
        <Link href="/provider">لوحة المزوّد</Link> / <span>دفتر الرصيد</span>
      </p>
      <h1>دفتر الرصيد</h1>

      <section className="card" aria-labelledby="balance-heading">
        <h2 id="balance-heading">رصيدك المتاح</h2>
        {balance.ok ? (
          <>
            <ul className="stat-list">
              <li className="stat-row">
                <span>الرصيد المتاح</span>
                <span className="stat-value">
                  {formatPrice(balance.data.availableCents / 100, "SAR")}
                </span>
              </li>
              {balance.data.updatedAt ? (
                <li className="stat-row">
                  <span>آخر تحديث</span>
                  <span className="stat-value">{formatDateTime(balance.data.updatedAt)}</span>
                </li>
              ) : null}
            </ul>
            {balance.data.availableCents === 0 ? (
              <p className="page-note" role="status">
                {/* The measured empty state (LedgerService.getBalance's
                    orElseGet(empty) — read 2026-09-29): no credit has
                    landed yet, which is a true state of the money loop —
                    credits appear only when payments COMPLETE, and
                    completion is the backend's webhook/admin path (the
                    Stripe owner input). Never claimed as an error. */}
                لا مبالغ مُضافة إلى رصيدك بعد — تُضاف المدفوعات هنا عند اكتمالها
                عبر قناة الدفع الخلفية.
              </p>
            ) : null}
          </>
        ) : (
          <p className="page-note" role="status">
            {balance.unauthenticated
              ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
              : problemMessage(balance.problem, `تعذّرت قراءة الرصيد (رمز ${balance.status}).`)}
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="statement-heading">
        <h2 id="statement-heading">كشف الحساب</h2>
        {statement.ok ? (
          statement.data.content.length === 0 ? (
            <p className="page-note" role="status">
              لا حركات بعد — تظهر هنا مدفوعاتك المكتملة، وعمولات المنصة،
              والاستردادات (أحدثها أولًا).
            </p>
          ) : (
            <>
              <ul className="feed-list">
                {statement.data.content.map((entry) => (
                  <li key={entry.id} className="card post-card">
                    <p className="listing-meta">
                      <span className="stat-value">
                        {formatPrice(entry.amountCents / 100, "SAR")}
                      </span>
                      <span>·</span>
                      <span className="listing-category">
                        {LEDGER_ENTRY_TYPE_LABELS[entry.entryType as LedgerEntryType] ??
                          entry.entryType}
                      </span>
                      <span>·</span>
                      <span>{formatDateTime(entry.createdAt)}</span>
                    </p>
                    {entry.sourceId ? (
                      <p className="listing-meta">
                        {/* The movement's origin (the payment intent the
                            backend's ledger keyed it by) — shown as the
                            backend's own identifier, never a fabricated
                            link (the intent read is the consumer's
                            surface, measured). */}
                        <span>مرجع الحركة: {entry.sourceId}</span>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <nav className="category-filter" aria-label="تنقل صفحات الكشف">
                {page > 0 ? (
                  <Link className="button" href={`/provider/ledger?page=${page - 1}`}>
                    الأحدث (صفحة {new Intl.NumberFormat("ar").format(page)})
                  </Link>
                ) : null}
                {!statement.data.last ? (
                  <Link
                    className="button"
                    data-variant="primary"
                    href={`/provider/ledger?page=${page + 1}`}
                  >
                    الأقدم (صفحة {new Intl.NumberFormat("ar").format(page + 2)})
                  </Link>
                ) : null}
              </nav>
              <p className="page-note">
                {new Intl.NumberFormat("ar").format(statement.data.totalElements)} حركة إجمالًا —
                تاريخ {formatDate(statement.data.content[0]?.createdAt ?? "")} فصاعدًا.
              </p>
            </>
          )
        ) : (
          <p className="page-note" role="status">
            {statement.unauthenticated
              ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
              : problemMessage(
                  statement.problem,
                  `تعذّرت قراءة الكشف (رمز ${statement.status}).`,
                )}
          </p>
        )}
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
