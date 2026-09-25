import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage, type ProblemDetail } from "@/lib/problem";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import {
  getAllBookings,
  getAllListings,
  getAuditedEntities,
  getModerationQueue,
  getPaymentIntent,
  getPaymentSummaries,
  getPricingRules,
  getProviderBalance,
  getRevisions,
  getUsers,
} from "@/lib/api/admin";
import {
  ADMIN_BOOKINGS_PAGE_SIZE,
  ADMIN_LISTINGS_PAGE_SIZE,
  ADMIN_PAYMENTS_PAGE_SIZE,
  ADMIN_USERS_PAGE_SIZE,
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
  ArchiveListingForm,
  ConfirmIntentForm,
  CreditProviderForm,
  GeoCreateForm,
  GeoDeleteForm,
  GeoRenameForm,
  PricingRuleCreateForm,
  PromotionForm,
  PseudonymizeForm,
  PurgeAuditHistoryForm,
  PurgeContentForm,
  RefundForm,
  ResolveDisputeForm,
  ResolveReportForm,
  RuleActiveButton,
  RuleDeleteButton,
  SuspendProviderForm,
  UserStatusForm,
  UserRoleForm,
  VerifyProviderForm,
} from "./forms";

/**
 * لوحة الإدارة — batch-3's console + the batch-4 spec: the remaining
 * 21 administrative operations (users ×6, all-bookings ×1, all-listings
 * ×2 + promotion ×1, the single-intent read, providers verify/suspend
 * ×2, ledger ×2, dispute resolve ×1, geo ×3, revisions ×2) — the whole
 * `/api/v1/admin/**` contract surface now has a console home.
 *
 * The page's truth bound (the spec's honesty clause): every operation
 * sits behind the backend's three-layer hasRole('ADMIN') gates and the
 * app carries no role claims of its own (roles are NOT in /me —
 * measured, Task 24). Every read below answers 403 AUTHZ-001 for a
 * non-admin caller and those words render VERBATIM — the backend is
 * the sole authority; the admin happy paths are unverifiable with the
 * test account (no ADMIN credentials exist on our side — declared in
 * the spec, never guessed).
 *
 * The three input-driven reads (single intent, provider balance,
 * entity revisions) ride the URL as state (`?intentId=`,
 * `?balanceProviderId=`, `?revisionEntity=&revisionId=`) through plain
 * GET forms — the /neighborhoods?parent= discipline, no client-side
 * fetch, no Server Action for a pure read.
 */

export const metadata: Metadata = {
  title: "لوحة الإدارة",
  description: "طابور الإشراف وقواعد التسعير وإدارة المدفوعات والمستخدمين والحجوزات والإعلانات والأستاذ والنزاعات والجغرافيا ومراجعات التدقيق",
  robots: { index: false },
};

type AdminPageProps = PageProps<"/admin">;

/** The status axis chip — OPEN/RESOLVED/DISMISSED on the backend's own vocabulary. */
function statusLabel(status: string): string {
  return (
    REPORT_STATUS_LABELS[status as ReportStatusFilter] ?? status
  );
}

function first(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
}

/** The standard expected-failure note (reads as data — the 403 words). */
function ReadFailure({
  problem,
  status,
  what,
}: {
  problem: ProblemDetail | null;
  status: number;
  what: string;
}) {
  if (status === 0) {
    return (
      <p className="page-note" role="status">
        الخادم الخلفي غير متاح حالياً — لا يمكن قراءة {what} الآن.
      </p>
    );
  }
  return (
    <p className="page-note" role="status">
      {problemMessage(problem, `تعذّرت قراءة ${what} (رمز ${status}).`)}
    </p>
  );
}

export default async function AdminConsolePage({
  searchParams,
}: AdminPageProps) {
  const sp = await searchParams;
  const intentId = first(sp?.intentId);
  const balanceProviderId = first(sp?.balanceProviderId);
  const revisionEntity = first(sp?.revisionEntity);
  const revisionId = first(sp?.revisionId);
  const bookingStatus = first(sp?.bookingStatus);

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

  // The seven section reads fire together — each is an expected-failure
  // channel (the 403 words are data, not exceptions).
  const [queue, rules, payments, users, bookings, listings, entities] =
    await Promise.all([
      getModerationQueue(undefined, 0, MODERATION_QUEUE_PAGE_SIZE),
      getPricingRules(),
      getPaymentSummaries(0, ADMIN_PAYMENTS_PAGE_SIZE),
      getUsers(0, ADMIN_USERS_PAGE_SIZE),
      getAllBookings(bookingStatus === "" ? null : bookingStatus, 0, ADMIN_BOOKINGS_PAGE_SIZE),
      getAllListings(0, ADMIN_LISTINGS_PAGE_SIZE),
      getAuditedEntities(),
    ]);

  // The three input-driven reads fire only when their URL state is
  // present (the /neighborhoods?parent= discipline — a pure read rides
  // the address, never a client fetch).
  const [intent, balance, revisions] = await Promise.all([
    intentId === "" ? null : getPaymentIntent(intentId),
    balanceProviderId === "" ? null : getProviderBalance(balanceProviderId),
    revisionEntity === "" || revisionId === ""
      ? null
      : getRevisions(revisionEntity, revisionId),
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
        ) : (
          <ReadFailure problem={queue.problem} status={queue.status} what="الطابور" />
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
        ) : (
          <ReadFailure problem={rules.problem} status={rules.status} what="القواعد" />
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
        ) : (
          <ReadFailure problem={payments.problem} status={payments.status} what="المدفوعات" />
        )}
        <form method="get" action="/admin" className="stack-form">
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

      {/* -- §4 the users administration --------------------------------- */}
      <section className="card" aria-labelledby="users-heading">
        <h2 id="users-heading">المستخدمون</h2>
        <p className="page-note">
          قائمة الحسابات مع أدوارها — وأوامر الدور والحالة والتجنّي وتطهير
          المحتوى وسجل التدقيق، كلها بمعاجم الخلفي وحدوده الحرفية.
        </p>
        {users.ok ? (
          users.data.content.length === 0 ? (
            <EmptyState title="لا مستخدمون" />
          ) : (
            <ul className="feed-list">
              {users.data.content.map((user) => (
                <li key={user.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="الدور">
                      {user.role}
                    </span>
                    <span>·</span>
                    <span>{user.displayName ?? user.email ?? "بلا اسم ظاهر"}</span>
                    <span>·</span>
                    <span>{formatDateTime(user.createdAt)}</span>
                  </p>
                  <p className="listing-meta" dir="ltr">
                    <span>user: {user.id}</span>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={users.problem} status={users.status} what="المستخدمين" />
        )}
        <UserRoleForm />
        <UserStatusForm />
        <PseudonymizeForm />
        <PurgeContentForm />
        <PurgeAuditHistoryForm />
      </section>

      {/* -- §5 the all-bookings administration -------------------------- */}
      <section className="card" aria-labelledby="bookings-heading">
        <h2 id="bookings-heading">الحجوزات (كلها)</h2>
        <p className="page-note">
          كل حجوزات المنصة بجانبيها (المستهلك والمزوّد) — مرشّح الحالة يمرّ
          كما هو إلى الخلفي (لا معجم طرفي).
        </p>
        <form method="get" action="/admin" className="stack-form">
          <label htmlFor="bookings-status">مرشّح الحالة (اختياري — يمرّ حرفيًا)</label>
          <input
            id="bookings-status"
            name="bookingStatus"
            type="text"
            dir="ltr"
            defaultValue={bookingStatus}
          />
          <button type="submit" className="button">رشّح</button>
        </form>
        {bookings.ok ? (
          bookings.data.content.length === 0 ? (
            <EmptyState title="لا حجوزات" />
          ) : (
            <ul className="feed-list">
              {bookings.data.content.map((booking) => (
                <li key={booking.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="حالة الحجز">
                      {booking.status}
                    </span>
                    <span>·</span>
                    <span>
                      {booking.priceCents !== null
                        ? formatPrice(booking.priceCents / 100, booking.currency)
                        : "بلا سعر"}
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(booking.startsAt)}</span>
                  </p>
                  <p className="listing-meta" dir="ltr">
                    <span>booking: {booking.id}</span>
                    <span> · consumer: {booking.consumerId}</span>
                    <span> · provider: {booking.providerId}</span>
                    <span> · listing: {booking.listingId}</span>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={bookings.problem} status={bookings.status} what="الحجوزات" />
        )}
      </section>

      {/* -- §6 the all-listings + promotion administration --------------- */}
      <section className="card" aria-labelledby="listings-heading">
        <h2 id="listings-heading">كل الإعلانات</h2>
        <p className="page-note">
          جرد المنصة كاملًا بكل الحالات — صفوفه تحمل providerId (مصدر معرّف
          المزوّد الوحيد في قراءة عقدية)، والأرشفة والترويج أوامر إدارية.
        </p>
        {listings.ok ? (
          listings.data.content.length === 0 ? (
            <EmptyState title="لا إعلانات" />
          ) : (
            <ul className="feed-list">
              {listings.data.content.map((listing) => (
                <li key={listing.id} className="card post-card">
                  <p className="listing-meta">
                    <span className="listing-category" aria-label="حالة الإعلان">
                      {listing.status}
                    </span>
                    <span>·</span>
                    <span>{listing.title}</span>
                    <span>·</span>
                    <span>{listing.category}</span>
                  </p>
                  <p className="listing-meta" dir="ltr">
                    <span>listing: {listing.id}</span>
                    <span> · provider: {listing.providerId}</span>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={listings.problem} status={listings.status} what="الإعلانات" />
        )}
        <ArchiveListingForm />
        <PromotionForm />
      </section>

      {/* -- §7 the providers administration ----------------------------- */}
      <section className="card" aria-labelledby="providers-heading">
        <h2 id="providers-heading">المزوّدون</h2>
        <p className="page-note">
          التوثيق والتعليق — بمعرّف الملف (فضاء معرّف الملف، لا معرّف
          المستخدم؛ مصدره عمود providerId في قائمة الإعلانات أعلاه).
        </p>
        <VerifyProviderForm />
        <SuspendProviderForm />
      </section>

      {/* -- §8 the administrative ledger -------------------------------- */}
      <section className="card" aria-labelledby="ledger-heading">
        <h2 id="ledger-heading">الأستاذ</h2>
        <p className="page-note">
          رصيد مزوّد بالإيداع من قصد دفع — عقد الخلفي نفسه: الإيداع على
          سلسلة الاستعلام (لا جسم JSON).
        </p>
        <form method="get" action="/admin" className="stack-form">
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

      {/* -- §9 the administrative dispute resolution --------------------- */}
      <section className="card" aria-labelledby="disputes-heading">
        <h2 id="disputes-heading">النزاعات</h2>
        <p className="page-note">
          قرار التسوية الإداري — الجسم اختياري بحسب عقد الخلفي (غيابه =
          NO_ACTION)، والقرار المالي يُسمّى صراحةً.
        </p>
        <ResolveDisputeForm />
      </section>

      {/* -- §10 the administrative geo tree ------------------------------ */}
      <section className="card" aria-labelledby="geo-heading">
        <h2 id="geo-heading">الشجرة الجغرافية</h2>
        <p className="page-note">
          إنشاء موقع وابن وإعادة تسمية وحذف — حدود الخلفي نفسها: الأصل
          المجهول 404، وتعارض slug والحوارات ذات الأبناء 409 بكلماته.
        </p>
        <GeoCreateForm />
        <GeoRenameForm />
        <GeoDeleteForm />
      </section>

      {/* -- §11 the Envers revision trail -------------------------------- */}
      <section className="card" aria-labelledby="revisions-heading">
        <h2 id="revisions-heading">سجل المراجعات</h2>
        <p className="page-note">
          كيانات التدقيق (Envers) ومراجعات أي كيان بمعرّفه — الكيان يُعرض
          خامًا كما أعاده الخلفي (بلا إعادة تركيب).
        </p>
        {entities.ok ? (
          entities.data.length === 0 ? (
            <EmptyState title="لا كيانات مدقّقة" />
          ) : (
            <ul className="feed-list" dir="ltr">
              {entities.data.map((name) => (
                <li key={name} className="card post-card">
                  <p className="listing-meta">
                    <span>{name}</span>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ReadFailure problem={entities.problem} status={entities.status} what="الكيانات المدقّقة" />
        )}
        <form method="get" action="/admin" className="stack-form">
          <label htmlFor="revision-entity">اسم الكيان المدقّق</label>
          <input
            id="revision-entity"
            name="revisionEntity"
            type="text"
            dir="ltr"
            defaultValue={revisionEntity}
          />
          <label htmlFor="revision-id">معرّف الكيان</label>
          <input
            id="revision-id"
            name="revisionId"
            type="text"
            dir="ltr"
            defaultValue={revisionId}
          />
          <button type="submit" className="button">اقرأ المراجعات</button>
        </form>
        {revisions ? (
          revisions.ok ? (
            revisions.data.length === 0 ? (
              <EmptyState title="لا مراجعات لهذا الكيان" />
            ) : (
              <ul className="feed-list">
                {revisions.data.map((entry) => (
                  <li key={entry.revisionNumber} className="card post-card">
                    <p className="listing-meta">
                      <span className="listing-category" aria-label="نوع المراجعة">
                        {entry.revisionType}
                      </span>
                      <span>·</span>
                      <span dir="ltr">rev {entry.revisionNumber}</span>
                      <span>·</span>
                      <span>{formatDateTime(entry.revisedAt)}</span>
                    </p>
                    <pre className="post-body" dir="ltr">
                      {JSON.stringify(entry.entity, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ReadFailure problem={revisions.problem} status={revisions.status} what="المراجعات" />
          )
        ) : null}
      </section>

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}
