"use client";

/**
 * Booking action forms (roadmap stage 6 — الحجز والدفع) — the
 * useActionState house pattern (packaged mutating-data guide). One
 * file per route group's forms, the provider/forms.tsx convention:
 * every form posts its Server Action, mirrors the backend's own bean
 * bounds in HTML validation, and surfaces the action's
 * ActionState (the backend's problem+json words ride verbatim).
 *
 * The request form's UTC convention: datetime-local inputs carry no
 * timezone (HTML spec), so the values are interpreted AS UTC — the
 * hint states it, the action normalizes it (append Z → ISO instant),
 * and the backend's exact-slot gate remains the authority on whether
 * the window matches a published slot.
 */

import { useActionState } from "react";
import {
  cancelBookingAction,
  cancelPaymentIntentAction,
  completeBookingAction,
  confirmBookingAction,
  createBookingAction,
  createReviewAction,
  createReverseReviewAction,
  openBookingConversationAction,
  openDisputeAction,
  processPaymentIntentAction,
  type ActionState,
} from "./actions";
import { REVIEW_RATING_MAX, REVIEW_RATING_MIN } from "@/lib/api/booking-contract";
import { DISPUTE_REASON_MAX_LENGTH } from "@/lib/api/disputes-contract";

const IDLE: ActionState = { status: "idle" };

function StateMessage({ state }: { state: ActionState }) {
  if (state.status === "error") {
    return (
      <p className="page-note" role="alert">
        {state.message}
      </p>
    );
  }
  if (state.status === "success") {
    return (
      <p className="page-note" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

/**
 * The booking request form — the consumer's entry write. The stay
 * window is [start, end) half-open (the checkout morning is not a
 * priced night — the backend's own convention); the nightly total is
 * derived server-side, never sent from here.
 */
export function BookingRequestForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createBookingAction,
    IDLE,
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="listingId" value={listingId} />
      <label htmlFor="booking-starts">بداية الإقامة (بتوقيت UTC)</label>
      <input
        id="booking-starts"
        name="startsAt"
        type="datetime-local"
        required
        dir="ltr"
      />
      <label htmlFor="booking-ends">نهاية الإقامة (بتوقيت UTC)</label>
      <input
        id="booking-ends"
        name="endsAt"
        type="datetime-local"
        required
        dir="ltr"
      />
      <p className="field-hint">
        النافذة من البداية إلى النهاية نصف مفتوحة — صباح المغادرة ليس ليلة محسوبة.
        يجب أن تطابق فتحة توافر منشورة تمامًا (يعلّمك الخادم كلماته عند عدم المطابقة).
      </p>
      <label htmlFor="booking-notes">ملاحظة للمزوّد (اختياري)</label>
      <textarea id="booking-notes" name="notes" rows={3} placeholder="سأصل متأخرًا…" />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الإرسال…" : "أرسل طلب الحجز"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * One lifecycle button-form — cancel (either participant), confirm
 * and complete (the provider). The backend's own transition machine
 * is the authority (409 words surface verbatim); the page renders
 * this form only from the states the machine allows.
 */
export function BookingLifecycleForm({
  bookingId,
  kind,
}: {
  bookingId: string;
  kind: "cancel" | "confirm" | "complete";
}) {
  const config = {
    cancel: {
      action: cancelBookingAction,
      label: "ألغِ الحجز",
      pendingLabel: "جارٍ الإلغاء…",
      variant: "danger" as const,
    },
    confirm: {
      action: confirmBookingAction,
      label: "أكّد الحجز",
      pendingLabel: "جارٍ التأكيد…",
      variant: "primary" as const,
    },
    complete: {
      action: completeBookingAction,
      label: "أتمِم الحجز",
      pendingLabel: "جارٍ الإتمام…",
      variant: "primary" as const,
    },
  }[kind];

  const [state, action, pending] = useActionState<ActionState, FormData>(
    config.action,
    IDLE,
  );

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="bookingId" value={bookingId} />
      <button
        type="submit"
        className="button"
        data-variant={config.variant}
        disabled={pending}
      >
        {pending ? config.pendingLabel : config.label}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * The payment process form — the consumer's payment step on a
 * CONFIRMED booking. The honest no-Stripe state is the surface's own
 * contract: the backend answers clientSecret only when a real PSP
 * channel is bound (null measured in the inert path); completion is
 * the backend's webhook/admin path, never claimed here.
 */
export function PaymentProcessForm({ intentId }: { intentId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    processPaymentIntentAction,
    IDLE,
  );

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="intentId" value={intentId} />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ بدء المعالجة…" : "ابدأ معالجة الدفع"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * The payment CANCEL form (batch-2 spec §2) — the consumer's other
 * action on a CREATED intent. The backend's state machine allows the
 * cancel from CREATED alone; an already-moved intent answers 409
 * with the backend's own words (surfaced verbatim — never
 * pre-validated away).
 */
export function PaymentCancelForm({ intentId }: { intentId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    cancelPaymentIntentAction,
    IDLE,
  );

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="intentId" value={intentId} />
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "جارٍ الإلغاء…" : "ألغِ قصد الدفع"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * «محادثة هذا الحجز» — the booking thread's entry (batch-2 spec §4):
 * opens (or reuses) the single chat thread per booking and lands the
 * caller on the conversation page. Participant-scoped by the
 * backend's own gates — the action only carries the session's token.
 */
export function BookingConversationButton({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    openBookingConversationAction,
    IDLE,
  );

  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="bookingId" value={bookingId} />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "جارٍ الفتح…" : "محادثة هذا الحجز"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * The booking review form — both directions of the L21 two-way
 * review (the consumer's review of the provider, the provider's
 * reverse review of the consumer): same shape, same 1..5 bounds, the
 * backend gates each direction to its own booking participant on a
 * COMPLETED booking (409/403/400 words verbatim).
 */
export function BookingReviewForm({
  bookingId,
  direction,
}: {
  bookingId: string;
  direction: "consumer" | "provider";
}) {
  const isConsumer = direction === "consumer";
  const [state, action, pending] = useActionState<ActionState, FormData>(
    isConsumer ? createReviewAction : createReverseReviewAction,
    IDLE,
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label htmlFor={`review-rating-${bookingId}-${direction}`}>
        {isConsumer ? "تقييمك للمزوّد" : "تقييمك للضيف"}
      </label>
      <select
        id={`review-rating-${bookingId}-${direction}`}
        name="rating"
        required
        defaultValue="5"
        dir="ltr"
      >
        {Array.from(
          { length: REVIEW_RATING_MAX - REVIEW_RATING_MIN + 1 },
          (_, index) => REVIEW_RATING_MIN + index,
        ).map((value) => (
          <option key={value} value={value}>
            {new Intl.NumberFormat("ar").format(value)} من{" "}
            {new Intl.NumberFormat("ar").format(REVIEW_RATING_MAX)}
          </option>
        ))}
      </select>
      <label htmlFor={`review-comment-${bookingId}-${direction}`}>
        {isConsumer ? "تعليقك العلني (اختياري)" : "تعليقك العلني عن الضيف (اختياري)"}
      </label>
      <textarea
        id={`review-comment-${bookingId}-${direction}`}
        name="comment"
        rows={3}
        placeholder={isConsumer ? "المكان والتعامل…" : "الضيف والتقيد بالاتفاق…"}
      />
      <p className="field-hint">
        {isConsumer
          ? "تقييم واحد لهذا الحجز — يظهر على صفحة المزوّد العامة."
          : "تقييم عكسي واحد لهذا الحجز — لا يدخل في معدّلك كمزوّد."}
      </p>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ النشر…" : "انشر التقييم"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * The dispute open form — L24: either booking participant states the
 * reason (≤ 1000 chars, the column's own bound mirrored in HTML
 * validation; @NotBlank stays the backend's). The backend has NO
 * booking-status gate on open (measured) so the form asks no state;
 * the resolve is the administration's decision — the surfaced state
 * is whatever the backend said, never a claimed outcome.
 */
export function DisputeOpenForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    openDisputeAction,
    IDLE,
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label htmlFor={`dispute-reason-${bookingId}`}>سبب النزاع</label>
      <textarea
        id={`dispute-reason-${bookingId}`}
        name="reason"
        rows={3}
        required
        maxLength={DISPUTE_REASON_MAX_LENGTH}
        placeholder="ما الذي لم يسلُم في هذا الحجز؟"
      />
      <p className="field-hint">
        النزاع يراه الطرف الآخر وإدارة السوق — والحسم (بقراره المالي) يظهر هنا عند
        صدوره.
      </p>
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "جارٍ الفتح…" : "افتح النزاع"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}
