import type { Metadata } from "next";
import Link from "next/link";
import {
  getPaymentIntent,
  getPaymentSummaries,
  getProviderBalance,
} from "@/lib/api/admin";
import { ADMIN_PAYMENTS_PAGE_SIZE } from "@/lib/api/admin-contract";
import { formatDateTime, formatPrice } from "@/lib/format";
import { EmptyState, PanelHead, ReadFailure } from "../panel-parts";
import {
  ConfirmIntentForm,
  CreditProviderForm,
  RefundForm,
  ResolveDisputeForm,
} from "../forms";

/**
 * لوحة المالية (slice N2): the money administration — the S6 console's
 * payments + ledger + disputes sections on ONE panel (they were always
 * one workflow: confirm/refund ride the intent rows, the balance credit
 * rides the deposit contract, the dispute resolution names its financial
 * decision explicitly). The input-driven reads (single intent, provider
 * balance) ride the URL as state through plain GET forms — the
 * /neighborhoods?parent= discipline, no client-side fetch.
 */

export const metadata: Metadata = {
  title: "المالية",
  robots: { index: false },
};

type FinancePageProps = PageProps<"/admin/finance">;

function first(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
}

export default async function FinancePanelPage({ searchParams }: FinancePageProps) {
  const sp = await searchParams;
  const intentId = first(sp?.intentId);
  const balanceProviderId = first(sp?.balanceProviderId);

  // The two input-driven reads fire only when their URL state is
  // present (a pure read rides the address, never a client fetch).
  const [payments, intent, balance] = await Promise.all([
    getPaymentSummaries(0, ADMIN_PAYMENTS_PAGE_SIZE),
    intentId === "" ? null : getPaymentIntent(intentId),
    balanceProviderId === "" ? null : getProviderBalance(balanceProviderId),
  ]);

  return (
    <main className="hy-adm-panel">
      <PanelHead
        title="المالية"
        note={
          <>
            ملخصات قصد الدفع (المعرّف هو القصد نفسه) مع المبلغ والعملة
            والحالة والمسترد — والتأكيد والاسترداد أوامر إدارية على عقد
            الخلفي، والأستاذ إيداعه على سلسلة الاستعلام، وقرار النزاع يُسمّي
            قراره المالي صراحةً.
          </>
        }
      />

      <section className="card hy-adm-section" aria-labelledby="payments-heading">
        <h2 id="payments-heading">المدفوعات</h2>
        {payments.ok ? (
          payments.data.content.length === 0 ? (
            <EmptyState title="لا قصد دفع بعد" />
          ) : (
            <ul className="feed-list">
              {payments.data.content.map((intentRow) => (
                <li key={intentRow.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="حالة القصد">
                      {intentRow.status}
                    </span>
                    <span>·</span>
                    <span>
                      {formatPrice(intentRow.amountCents / 100, intentRow.currency)}
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(intentRow.createdAt)}</span>
                  </p>
                  <p className="listing-meta" dir="ltr">
                    <span>intent: {intentRow.id}</span>
                    <span> · booking: {intentRow.bookingId}</span>
                    <span> · consumer: {intentRow.consumerId}</span>
                  </p>
                  {intentRow.refundedAmountCents ? (
                    <p className="post-body">
                      المسترد:{" "}
                      {new Intl.NumberFormat("ar").format(intentRow.refundedAmountCents)}{" "}
                      وحدة صغرى
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={payments.problem} status={payments.status} what="المدفوعات" />
        )}
        <form method="get" action="/admin/finance" className="stack-form">
          <label htmlFor="lookup-intent-id">اقرأ قصدًا واحدًا بمعرّفه</label>
          <input id="lookup-intent-id" name="intentId" type="text" dir="ltr" defaultValue={intentId} />
          <p className="field-hint">
            القراءة على العنوان نفسه (URL هو الحالة) — انسخ المعرّف من صف
            أعلاه.
          </p>
          <button type="submit" className="button">اقرأ القصد</button>
        </form>
        {intent ? (
          intent.ok ? (
            <div className="card post-card">
              <p className="listing-meta">
                <span className="listing-category" aria-label="حالة القصد">
                  {intent.data.status}
                </span>
                <span>·</span>
                <span>
                  {formatPrice(intent.data.amountCents / 100, intent.data.currency)}
                </span>
                <span>·</span>
                <span>{formatDateTime(intent.data.createdAt)}</span>
              </p>
              <p className="listing-meta" dir="ltr">
                <span>intent: {intent.data.id}</span>
                <span> · booking: {intent.data.bookingId}</span>
                <span> · consumer: {intent.data.consumerId}</span>
              </p>
            </div>
          ) : (
            <ReadFailure problem={intent.problem} status={intent.status} what="القصد" />
          )
        ) : null}
        <ConfirmIntentForm />
        <RefundForm />
      </section>

      <section className="card hy-adm-section" aria-labelledby="ledger-heading">
        <h2 id="ledger-heading">الأستاذ</h2>
        <p className="page-note">
          رصيد مزوّد بالإيداع من قصد دفع — عقد الخلفي نفسه: الإيداع على
          سلسلة الاستعلام (لا جسم JSON).
        </p>
        <form method="get" action="/admin/finance" className="stack-form">
          <label htmlFor="balance-provider-id">اقرأ رصيد مزوّد بمعرّفه</label>
          <input
            id="balance-provider-id"
            name="balanceProviderId"
            type="text"
            dir="ltr"
            defaultValue={balanceProviderId}
          />
          <button type="submit" className="button">اقرأ الرصيد</button>
        </form>
        {balance ? (
          balance.ok ? (
            <div className="card post-card">
              <p className="listing-meta">
                <span className="listing-category" aria-label="الرصيد المتاح">
                  {new Intl.NumberFormat("ar").format(balance.data.availableCents)} وحدة صغرى
                </span>
                <span>·</span>
                <span>{formatDateTime(balance.data.createdAt)}</span>
              </p>
              <p className="listing-meta" dir="ltr">
                <span>provider: {balance.data.id}</span>
              </p>
            </div>
          ) : (
            <ReadFailure problem={balance.problem} status={balance.status} what="الرصيد" />
          )
        ) : null}
        <CreditProviderForm />
      </section>

      <section className="card hy-adm-section" aria-labelledby="disputes-heading">
        <h2 id="disputes-heading">النزاعات</h2>
        <p className="page-note">
          قرار التسوية الإداري — الجسم اختياري بحسب عقد الخلفي (غيابه =
          NO_ACTION)، والقرار المالي يُسمّى صراحةً.
        </p>
        <ResolveDisputeForm />
      </section>

      <p>
        <Link href="/admin">النظرة العامة ←</Link>
      </p>
    </main>
  );
}
