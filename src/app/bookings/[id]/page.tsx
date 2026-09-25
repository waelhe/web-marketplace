import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/app/auth-buttons";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { formatDateTime, formatPrice } from "@/lib/format";
import {
  classifyBookingRole,
  getBooking,
  resolvePaymentIntent,
  type BookingRole,
} from "@/lib/api/booking";
import { getMyBackendUser } from "@/lib/api/inbox";
import { getBookingDisputes } from "@/lib/api/disputes";
import {
  DISPUTE_RESOLUTION_LABELS,
  DISPUTE_STATUS_LABELS,
  type DisputeView,
} from "@/lib/api/disputes-contract";
import {
  BOOKING_STATUS_LABELS,
  CONSUMER_CANCELLABLE,
  PAYMENT_INTENT_STATUS_LABELS,
  PROVIDER_COMPLETABLE,
  PROVIDER_CONFIRMABLE,
  REVIEWABLE,
  type BookingStatus,
} from "@/lib/api/booking-contract";
import {
  BookingConversationButton,
  BookingLifecycleForm,
  BookingReviewForm,
  DisputeOpenForm,
  PaymentCancelForm,
  PaymentProcessForm,
} from "../forms";

/**
 * تفاصيل الحجز — roadmap stage 6's participant-scoped detail
 * (الحجز والدفع). The privacy model is the backend's own contract
 * (measured): GET /bookings/{id} answers the consumer or the provider
 * of the booking (or ADMIN) and refuses everyone else with its own
 * words — this page renders that model faithfully (anonymous → the
 * gate; a refused read → the backend's problem words, never a guess).
 *
 * THE MEASURED ROLE JOIN: BookingResponse carries NO participant ids
 * (measured), so the caller's role resolves through their OWN
 * consumer/provider first pages (booking.ts' classifyBookingRole). A
 * booking beyond both first pages renders the shared facts with an
 * honest note — never a guessed role and never its actions.
 *
 * The payment block resolves the intent through the deterministic
 * idempotency key (read-or-create — the backend's own contract; no
 * "intent by booking" read exists, measured gap). amountCents is the
 * booking's ONLY readable total (BookingResponse carries no price);
 * clientSecret returns only when a real PSP channel is bound (null
 * measured in the inert path) and completion stays the backend's
 * webhook/admin path — the honest PROCESSING state, never a claimed
 * success.
 *
 * The disputes section (L24 — النزاعات) renders for every successful
 * booking read: the booking read's own participant gate already held
 * (participant or ADMIN), and the list read answers that same audience
 * (the backend's authority — its refusal words surface verbatim). The
 * open form renders for KNOWN roles only (a participant beyond both
 * first pages classifies "unknown" and gets the shared facts — the
 * stage-6 convention); the backend's open has NO booking-status gate
 * (measured), so none is invented here. The resolve is the
 * administration's decision (ADMIN-only, undiscoverable from /me —
 * measured) — its outcome renders when it exists, never claimed.
 *
 * Private surface — `noindex` is the honest robots contract.
 */
export const metadata: Metadata = {
  title: "تفاصيل الحجز",
  description: "حجزك — حالته ونافذته ودفعها وإجراءاته",
  robots: { index: false },
};

type BookingDetailPageProps = PageProps<"/bookings/[id]">;

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    // The booking-path gate (measured 401 contract) — rendered before
    // ANY booking read: an anonymous visitor never probes the surface.
    return (
      <main>
        <h1>تفاصيل الحجز</h1>
        <p className="page-note" role="status">
          تفاصيل الحجز للمشاركين المسجّلين — سجّل الدخول لعرضها.
        </p>
        <SignInButton callbackURL={`/bookings/${id}`} />
        <p>
          <Link href="/">الرئيسية</Link>
        </p>
      </main>
    );
  }

  const result = await getBooking(id);

  if (!result.ok) {
    return (
      <main>
        <h1>تفاصيل الحجز</h1>
        {result.status === 404 ? (
          <p className="page-note" role="status">
            الحجز غير موجود.
          </p>
        ) : result.unauthenticated ? (
          <p className="page-note" role="status">
            جلستك مع الباك اند منتهية — سجّل الدخول من جديد.
          </p>
        ) : (
          /* The backend's own refusal words (a non-participant read is
              refused there) — surfaced verbatim, never guessed. */
          <p className="page-note" role="status">
            {problemMessage(result.problem, `تعذّرت قراءة الحجز (رمز ${result.status}).`)}
          </p>
        )}
        <p>
          <Link href="/bookings">حجوزاتي</Link>
        </p>
      </main>
    );
  }

  const booking = result.data;
  const status = booking.status as BookingStatus;
  const classification = await classifyBookingRole(id);
  const role: BookingRole = classification.ok ? classification.role : "unknown";

  return (
    <main>
      <p className="listing-crumb">
        <Link href="/bookings">حجوزاتي</Link> / <span>تفاصيل الحجز</span>
      </p>
      <h1>تفاصيل الحجز</h1>

      <section className="card" aria-label="بيانات الحجز">
        <p className="listing-meta">
          <span className="booking-status" data-status={status}>
            {BOOKING_STATUS_LABELS[status] ?? booking.status}
          </span>
        </p>
        <dl className="property-facts">
          <div className="property-fact">
            <dt>الإقامة</dt>
            <dd>
              {formatDateTime(booking.startsAt)} — {formatDateTime(booking.endsAt)}
            </dd>
          </div>
          {booking.notes ? (
            <div className="property-fact">
              <dt>ملاحظة</dt>
              <dd>{booking.notes}</dd>
            </div>
          ) : null}
          <div className="property-fact">
            <dt>طُلب</dt>
            <dd>{formatDateTime(booking.createdAt)}</dd>
          </div>
        </dl>
        <p className="listing-meta">
          <Link href={`/listings/${booking.listingId}`}>الإعلان المحجوز</Link>
        </p>
        {/* The booking's chat thread entry (batch-2 spec §4): the single
            conversation per booking, opened (or reused) from either
            participant's side — the backend's own gates scope it. */}
        <BookingConversationButton bookingId={booking.id} />
        <p className="page-note">
          {/* The measured seam, stated honestly: the booking response
              carries no participant ids and no price — the role joins
              through your own lists and the total rides the payment
              intent alone. */}
          الاستجابة لا تحمل هوية المشاركين ولا المبلغ — دورك يُستنتج من
          قوائمك، والمجموع يظهر في قصد الدفع عند تأكيد الحجز.
        </p>
      </section>

      {role === "unknown" ? (
        <p className="page-note" role="status">
          دورك في هذا الحجز غير ظاهر من أول صفحة من قوائمك — الحقائق أعلاه
          مشتركة، وإجراءات كل دور تظهر لدى مشاركه المعروف.
        </p>
      ) : null}

      {role === "consumer" ? (
        <ConsumerSections bookingId={booking.id} status={status} />
      ) : null}

      {role === "provider" ? (
        <ProviderSections bookingId={booking.id} status={status} />
      ) : null}

      <DisputesSection bookingId={booking.id} role={role} />

      <p>
        <Link href="/">الرئيسية</Link>
      </p>
    </main>
  );
}

/** The consumer's role-classified sections: cancel / payment / review. */
async function ConsumerSections({
  bookingId,
  status,
}: {
  bookingId: string;
  status: BookingStatus;
}) {
  return (
    <>
      {CONSUMER_CANCELLABLE.includes(status) ? (
        <section className="card" aria-label="إجراءاتك">
          <h2>إجراءاتك</h2>
          <div className="action-row">
            <BookingLifecycleForm bookingId={bookingId} kind="cancel" />
          </div>
        </section>
      ) : null}

      {status === "CONFIRMED" ? <PaymentSection bookingId={bookingId} /> : null}

      {REVIEWABLE.includes(status) ? (
        <section className="card" aria-labelledby="review-heading">
          <h2 id="review-heading">قيّم إقامتك</h2>
          <p className="page-note">
            تقييم واحد لهذا الحجز المكتمل — يظهر على صفحة المزوّد العامة.
          </p>
          <BookingReviewForm bookingId={bookingId} direction="consumer" />
        </section>
      ) : null}
    </>
  );
}

/** The provider's role-classified sections: confirm / complete / cancel / reverse review. */
function ProviderSections({
  bookingId,
  status,
}: {
  bookingId: string;
  status: BookingStatus;
}) {
  return (
    <>
      {PROVIDER_CONFIRMABLE.includes(status) || PROVIDER_COMPLETABLE.includes(status) ? (
        <section className="card" aria-label="إجراءاتك كمزوّد">
          <h2>إجراءاتك كمزوّد</h2>
          <div className="action-row">
            {PROVIDER_CONFIRMABLE.includes(status) ? (
              <BookingLifecycleForm bookingId={bookingId} kind="confirm" />
            ) : null}
            {PROVIDER_COMPLETABLE.includes(status) ? (
              <BookingLifecycleForm bookingId={bookingId} kind="complete" />
            ) : null}
            <BookingLifecycleForm bookingId={bookingId} kind="cancel" />
          </div>
        </section>
      ) : null}

      {REVIEWABLE.includes(status) ? (
        <section className="card" aria-labelledby="reverse-review-heading">
          <h2 id="reverse-review-heading">قيّم ضيفك</h2>
          <p className="page-note">
            التقييم العكسي (اتجاه المزوّد للمستهلك) — تقييم واحد لهذا الحجز
            المكتمل، ولا يدخل في معدّلك العام.
          </p>
          <BookingReviewForm bookingId={bookingId} direction="provider" />
        </section>
      ) : null}
    </>
  );
}

/**
 * The payment block — resolved through the deterministic idempotency
 * key (read-or-create; the backend's own contract). amountCents is
 * the booking's only readable total; the PROCESSING state is the
 * honest surface of the measured no-Stripe backend (clientSecret
 * null), and completion is the backend's webhook/admin path.
 */
async function PaymentSection({ bookingId }: { bookingId: string }) {
  const intent = await resolvePaymentIntent(bookingId);

  return (
    <section className="card" aria-labelledby="payment-heading">
      <h2 id="payment-heading">الدفع</h2>
      {intent.ok ? (
        <>
          <ul className="stat-list">
            <li className="stat-row">
              <span>المبلغ</span>
              <span className="stat-value">
                {formatPrice(intent.data.amountCents / 100, intent.data.currency)}
              </span>
            </li>
            <li className="stat-row">
              <span>حالة قصد الدفع</span>
              <span className="stat-value">
                {PAYMENT_INTENT_STATUS_LABELS[intent.data.status] ?? intent.data.status}
              </span>
            </li>
          </ul>
          {intent.data.clientSecret === null ? (
            <p className="page-note">
              {/* The honest no-Stripe state, measured: no PSP channel is
                  bound on the backend, so no client secret exists — the
                  completion of this intent is the backend owner's
                  payment-channel step, never claimed here. */}
              لا توجد قناة دفع إلكترونية مربوطة بالخادم بعد — اكتمال الدفع
              عبر بوابة الدفع مسؤولية مالك الباك اند (مفاتيح Stripe).
            </p>
          ) : null}
          {intent.data.status === "CREATED" ? (
            <div className="action-row">
              <PaymentProcessForm intentId={intent.data.id} />
              <PaymentCancelForm intentId={intent.data.id} />
            </div>
          ) : null}
        </>
      ) : (
        <p className="page-note" role="status">
          {intent.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(
                intent.problem,
                `تعذّر فتح قصد الدفع (رمز ${intent.status}).`,
              )}
        </p>
      )}
    </section>
  );
}

/**
 * The disputes section (L24 — النزاعات): the booking's disputes and
 * the participant's open form. The list read is the backend's own
 * authority (the booking read above already held its participant
 * gate); the resolve outcome renders as a measured fact when present —
 * the decision itself is the administration's (ADMIN-only, roles not
 * carried by /me — measured), never claimed here. refundedAmountCents
 * renders in MINOR units: the dispute response carries no currency
 * (measured) and the total is never guessed.
 */
async function DisputesSection({
  bookingId,
  role,
}: {
  bookingId: string;
  role: BookingRole;
}) {
  const [disputes, me] = await Promise.all([
    getBookingDisputes(bookingId),
    getMyBackendUser(),
  ]);

  return (
    <section className="card" aria-labelledby="disputes-heading">
      <h2 id="disputes-heading">النزاعات</h2>
      {disputes.ok ? (
        disputes.data.length === 0 ? (
          <p className="page-note">لا نزاعات على هذا الحجز بعد.</p>
        ) : (
          <ul className="dispute-list">
            {disputes.data.map((dispute) => (
              <DisputeItem key={dispute.id} dispute={dispute} mine={me.ok && dispute.openedBy === me.id} />
            ))}
          </ul>
        )
      ) : (
        <p className="page-note" role="status">
          {disputes.unauthenticated
            ? "جلستك مع الباك اند منتهية — سجّل الدخول من جديد."
            : problemMessage(
                disputes.problem,
                `تعذّرت قراءة نزاعات الحجز (رمز ${disputes.status}).`,
              )}
        </p>
      )}
      {role !== "unknown" ? <DisputeOpenForm bookingId={bookingId} /> : null}
      <p className="page-note">
        {/* The measured seams, stated honestly: the resolve is the
            administration's decision (its financial outcome included),
            and the dispute response carries no currency — the refunded
            total renders in minor units, never guessed. */}
        حسم النزاع قرار إدارة السوق بقراره المالي (استرداد أو بقاء أو بلا
        حركة) — يظهر هنا عند صدوره، وإجمالي ما استُرد يُعرض بالوحدات الصغرى
        لأن استجابة النزاع لا تحمل العملة.
      </p>
    </section>
  );
}

/** One dispute card — the measured facts of a single dispute row. */
function DisputeItem({ dispute, mine }: { dispute: DisputeView; mine: boolean }) {
  return (
    <li className="dispute-item">
      <div className="dispute-head">
        <span className="dispute-status" data-status={dispute.status}>
          {DISPUTE_STATUS_LABELS[dispute.status] ?? dispute.status}
        </span>
        <span className="listing-meta">فتحه {mine ? "أنت" : "طرف آخر"}</span>
      </div>
      <p className="dispute-reason">{dispute.reason}</p>
      <p className="listing-meta">{formatDateTime(dispute.createdAt)}</p>
      {dispute.status === "RESOLVED" && dispute.resolution ? (
        <p className="listing-meta">
          الحسم: {DISPUTE_RESOLUTION_LABELS[dispute.resolution] ?? dispute.resolution}
          {dispute.refundedAmountCents !== null
            ? ` — إجمالي ما استُرد: ${new Intl.NumberFormat("ar").format(
                dispute.refundedAmountCents,
              )} وحدة صغرى`
            : ""}
        </p>
      ) : null}
    </li>
  );
}
