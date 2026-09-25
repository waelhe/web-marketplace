import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import {
  getModerationQueue,
  getPaymentSummaries,
  getPricingRules,
} from "@/lib/api/admin";
import {
  ADMIN_PAYMENTS_PAGE_SIZE,
  MODERATION_QUEUE_PAGE_SIZE,
  REPORT_STATUS_LABELS,
  type ReportStatusFilter,
} from "@/lib/api/admin-contract";
import {
  REPORT_REASON_LABELS,
  type ReportReason,
} from "@/lib/api/community-contract";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ConfirmIntentForm,
  PricingRuleCreateForm,
  RefundForm,
  ResolveReportForm,
  RuleActiveButton,
  RuleDeleteButton,
} from "./forms";

/**
 * لوحة الإدارة — the batch-3 spec surface: the moderation report queue
 * (L45's administrative counterpart to the batch-2 report affordances),
 * the pricing-rules manager and the payments administration, all on the
 * backend's own measured ADMIN-gated contract.
 *
 * The page's truth bound (spec's honesty clause): the whole surface
 * sits behind the backend's three-layer hasRole('ADMIN') gates and the
 * app carries no role claims of its own (roles are NOT in /me —
 * measured, Task 24). Every read below answers 403 AUTHZ-001 for a
 * non-admin caller and those words render VERBATIM — the backend is
 * the sole authority; the admin happy paths are unverifiable with the
 * test account (no ADMIN credentials exist on our side — declared in
 * the spec, never guessed).
 */

export const metadata: Metadata = {
  title: "لوحة الإدارة",
  description: "طابور الإشراف وقواعد التسعير وإدارة المدفوعات",
  robots: { index: false },
};

/** The status axis chip — OPEN/RESOLVED/DISMISSED on the backend's own vocabulary. */
function statusLabel(status: string): string {
  return (
    REPORT_STATUS_LABELS[status as ReportStatusFilter] ?? status
  );
}

export default async function AdminConsolePage() {
  const session = await getSession();
  if (!session) {
    return (
      <main>
        <h1>لوحة الإدارة</h1>
        <p className="page-note" role="status">
          لوحة الإدارة للحسابات الإدارية — سجّل الدخول أولًا.
        </p>
        <SignInButton callbackURL="/admin" />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  // The three section reads fire together — each is an expected-failure
  // channel (the 403 words are data, not exceptions).
  const [queue, rules, payments] = await Promise.all([
    getModerationQueue(undefined, 0, MODERATION_QUEUE_PAGE_SIZE),
    getPricingRules(),
    getPaymentSummaries(0, ADMIN_PAYMENTS_PAGE_SIZE),
  ]);

  return (
    <main>
      <h1>لوحة الإدارة</h1>
      <p className="page-note" role="note">
        هذه اللوحة للإدارة: قراءاتها وأوامرها كلها محرّسة بدور الأدمن على
        الخلفي نفسه، والحساب غير الإداري يرى رفض الخلفي بكلماته الحرفية —
        الخلفي هو السلطة الوحيدة، ولا تُدّعى مسارات لا يستطيع هذا الحساب
        التحقق منها.
      </p>

      {/* -- §1 the moderation report queue ----------------------------- */}
      <section className="card" aria-labelledby="moderation-heading">
        <h2 id="moderation-heading">بلاغات الإشراف</h2>
        <p className="page-note">
          طابور FIFO كامل (الأقدم أولاً) — محور الحالة: مفتوح / محسوم /
          مستبعد. التسوية على بلاغ مغلق تُجيب 409 بكلمات الخلفي.
        </p>
        {queue.ok ? (
          queue.data.content.length === 0 ? (
            <EmptyState title="لا بلاغات في الطابور" />
          ) : (
            <ul className="feed-list">
              {queue.data.content.map((report) => (
                <li key={report.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="حالة البلاغ">
                      {statusLabel(report.status)}
                    </span>
                    <span>·</span>
                    <span aria-label="نوع الهدف">{report.targetType}</span>
                    <span>·</span>
                    <span aria-label="سبب الإبلاغ">
                      {REPORT_REASON_LABELS[report.reason as ReportReason] ??
                        report.reason}
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(report.createdAt)}</span>
                  </p>
                  <p className="listing-meta" dir="ltr">
                    <span>target: {report.targetId}</span>
                  </p>
                  {report.resolutionNote ? (
                    <p className="post-body">ملاحظة التسوية: {report.resolutionNote}</p>
                  ) : null}
                  {report.status === "OPEN" ? (
                    <ResolveReportForm reportId={report.id} />
                  ) : (
                    <p className="page-note" role="status">
                      أُغلق البلاغ
                      {report.resolvedAt ? ` — ${formatDate(report.resolvedAt)}` : ""}.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : queue.status === 0 ? (
          <p className="page-note" role="status">
            الخادم الخلفي غير متاح حالياً — لا يمكن قراءة الطابور الآن.
          </p>
        ) : (
          <p className="page-note" role="status">
            {problemMessage(
              queue.problem,
              `تعذّرت قراءة الطابور (رمز ${queue.status}).`,
            )}
          </p>
        )}
      </section>

      {/* -- §2 the pricing rules manager -------------------------------- */}
      <section className="card" aria-labelledby="pricing-rules-heading">
        <h2 id="pricing-rules-heading">قواعد التسعير</h2>
        <p className="page-note">
          قواعد التسعير العامة — الإنشاء والتفعيل والتعطيل والحذف، بحدود
          الخلفي نفسها (الاسم ≤ ٢٠٠ حرف، الفئة ≤ ١٠٠، والكسور بين ٠ و١).
        </p>
        {rules.ok ? (
          rules.data.length === 0 ? (
            <EmptyState title="لا قواعد تسعير بعد" />
          ) : (
            <ul className="feed-list">
              {rules.data.map((rule) => (
                <li key={rule.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="حالة القاعدة">
                      {rule.active ? "مفعّلة" : "معطّلة"}
                    </span>
                    <span>·</span>
                    <span>{rule.name}</span>
                    {rule.category ? (
                      <>
                        <span>·</span>
                        <span>{rule.category}</span>
                      </>
                    ) : null}
                  </p>
                  {rule.taxRate !== null || rule.discountPct !== null ? (
                    <p className="post-body">
                      {rule.taxRate !== null
                        ? `ضريبة ${new Intl.NumberFormat("ar", { maximumFractionDigits: 4 }).format(rule.taxRate)}`
                        : ""}
                      {rule.taxRate !== null && rule.discountPct !== null
                        ? " · "
                        : ""}
                      {rule.discountPct !== null
                        ? `خصم ${new Intl.NumberFormat("ar", { maximumFractionDigits: 4 }).format(rule.discountPct)}`
                        : ""}
                    </p>
                  ) : null}
                  <div className="inline-actions">
                    <RuleActiveButton ruleId={rule.id} active={rule.active} />
                    <RuleDeleteButton ruleId={rule.id} />
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : rules.status === 0 ? (
          <p className="page-note" role="status">
            الخادم الخلفي غير متاح حالياً — لا يمكن قراءة القواعد الآن.
          </p>
        ) : (
          <p className="page-note" role="status">
            {problemMessage(
              rules.problem,
              `تعذّرت قراءة القواعد (رمز ${rules.status}).`,
            )}
          </p>
        )}
        <PricingRuleCreateForm />
      </section>

      {/* -- §3 the payments administration ------------------------------ */}
      <section className="card" aria-labelledby="payments-heading">
        <h2 id="payments-heading">المدفوعات</h2>
        <p className="page-note">
          ملخصات قصد الدفع (المعرّف هو القصد نفسه) مع المبلغ والعملة والحالة
          والمسترد — والتأكيد والاسترداد أوامر إدارية على عقد الخلفي.
        </p>
        {payments.ok ? (
          payments.data.content.length === 0 ? (
            <EmptyState title="لا قصد دفع بعد" />
          ) : (
            <ul className="feed-list">
              {payments.data.content.map((intent) => (
                <li key={intent.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="حالة القصد">
                      {intent.status}
                    </span>
                    <span>·</span>
                    <span>
                      {formatPrice(intent.amountCents / 100, intent.currency)}
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(intent.createdAt)}</span>
                  </p>
                  <p className="listing-meta" dir="ltr">
                    <span>intent: {intent.id}</span>
                    <span> · booking: {intent.bookingId}</span>
                    <span> · consumer: {intent.consumerId}</span>
                  </p>
                  {intent.refundedAmountCents ? (
                    <p className="post-body">
                      المسترد:{" "}
                      {new Intl.NumberFormat("ar").format(intent.refundedAmountCents)}{" "}
                      وحدة صغرى
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        ) : payments.status === 0 ? (
          <p className="page-note" role="status">
            الخادم الخلفي غير متاح حالياً — لا يمكن قراءة المدفوعات الآن.
          </p>
        ) : (
          <p className="page-note" role="status">
            {problemMessage(
              payments.problem,
              `تعذّرت قراءة المدفوعات (رمز ${payments.status}).`,
            )}
          </p>
        )}
        <ConfirmIntentForm />
        <RefundForm />
      </section>

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
