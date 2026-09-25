"use server";

/**
 * Booking server actions (roadmap stage 6 — الحجز والدفع) — the
 * official mutating-data path (packaged guides: mutating-data +
 * server-actions), the stage-2/3 pattern verbatim. The framework
 * enforces the boundary (POST-only, Origin/Host CSRF check); every
 * action re-checks the session itself — "render-time gating is not a
 * security boundary" — and the backend's resource-server chain
 * remains the authorization authority (the measured 401/403/404/409
 * gates; ownership and role checks live server-side there).
 *
 * Expected failures come back as ActionState data; the backend's own
 * problem+json words (userMessage/detail) surface verbatim so its
 * state machine teaches the caller (the exact-slot 400, the
 * transition 409s, the review-direction gates, the CONFIRMED-gate
 * words, the 429 budgets). Writes ride backendSend — the direct
 * BACKEND_URL channel, session Bearer included; ids arrive from the
 * client as references ONLY, identity always derives from the
 * session.
 */

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { isUuid } from "@/lib/api/geo";
import {
  cancelBooking,
  cancelPaymentIntent,
  confirmBooking,
  completeBooking,
  createBooking,
  processPaymentIntent,
} from "@/lib/api/booking";
import { openBookingConversation } from "@/lib/api/inbox";
import { openDispute } from "@/lib/api/disputes";
import { DISPUTE_REASON_MAX_LENGTH } from "@/lib/api/disputes-contract";
import { createReview, createReverseReview } from "@/lib/api/reputation";
import { REVIEW_RATING_MAX, REVIEW_RATING_MIN } from "@/lib/api/booking-contract";

/**
 * The form state contract shared by every booking action form
 * (type-only export — a `use server` module's runtime exports are the
 * async functions alone; forms inline `{ status: "idle" }`).
 */
export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const REAUTH_MESSAGE = "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value.length > 0 ? value : null;
}

/**
 * Parse a datetime-local value into a UTC ISO instant — the request
 * form's UTC convention. datetime-local carries NO timezone (an HTML
 * spec fact), so the value is interpreted AS UTC by appending the Z
 * designator (the form's hint states the convention to the user; the
 * backend receives a proper ISO-8601 instant either way). Accepts
 * both minute and second precision.
 */
function parseUtcInstant(
  raw: string,
  label: string,
): { ok: true; iso: string } | { ok: false; message: string } {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    return { ok: false, message: `${label}: أدخل تاريخًا ووقتًا صالحين.` };
  }
  const normalized = raw.length === 16 ? `${raw}:00` : raw;
  const parsed = new Date(`${normalized}Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, message: `${label}: تاريخ/وقت غير صالح.` };
  }
  return { ok: true, iso: parsed.toISOString() };
}

/**
 * Create a booking request — POST /api/v1/bookings (the consumer's
 * entry into the booking lifecycle). The stay window is
 * [startsAt, endsAt) half-open; pricing is DERIVED server-side (never
 * sent). The backend's exact-slot gate teaches with its own 400 words
 * when the window does not match a published slot exactly. Success
 * redirects to the new booking's page (redirect throws NEXT_REDIRECT
 * — called at top level, never inside try/catch).
 */
export async function createBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً لطلب الحجز." };
  }

  const listingId = text(formData, "listingId");
  if (!isUuid(listingId)) {
    return { status: "error", message: "معرّف الإعلان غير صالح." };
  }

  const starts = parseUtcInstant(text(formData, "startsAt"), "بداية الإقامة");
  if (!starts.ok) return { status: "error", message: starts.message };
  const ends = parseUtcInstant(text(formData, "endsAt"), "نهاية الإقامة");
  if (!ends.ok) return { status: "error", message: ends.message };

  if (new Date(starts.iso).getTime() >= new Date(ends.iso).getTime()) {
    return { status: "error", message: "نهاية الإقامة يجب أن تكون بعد بدايتها." };
  }

  const notes = optionalText(formData, "notes");

  const result = await createBooking({
    listingId,
    startsAt: starts.iso,
    endsAt: ends.iso,
    notes,
  });
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر إرسال طلب الحجز (رمز ${result.status}).`),
    };
  }

  redirect(`/bookings/${result.data.id}`);
}

/** Confirm a booking — POST /api/v1/bookings/{id}/confirm (the provider's accept). */
export async function confirmBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const id = text(formData, "bookingId");
  if (!isUuid(id)) return { status: "error", message: "معرّف الحجز غير صالح." };

  const result = await confirmBooking(id);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر تأكيد الحجز (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "أُكد الحجز — انتظر الضيف ليرتب الدفع." };
}

/**
 * Complete a booking — POST /api/v1/bookings/{id}/complete (the
 * provider's close of the stay; COMPLETED opens both review
 * directions).
 */
export async function completeBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const id = text(formData, "bookingId");
  if (!isUuid(id)) return { status: "error", message: "معرّف الحجز غير صالح." };

  const result = await completeBooking(id);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر إتمام الحجز (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "أُتمّ الحجز — فُتح باب التقييم المتبادل." };
}

/** Cancel a booking — POST /api/v1/bookings/{id}/cancel (either participant). */
export async function cancelBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const id = text(formData, "bookingId");
  if (!isUuid(id)) return { status: "error", message: "معرّف الحجز غير صالح." };

  const result = await cancelBooking(id);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر إلغاء الحجز (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "أُلغي الحجز." };
}

/**
 * Process the payment intent — POST /api/v1/payments/intents/{id}/process
 * (the consumer's payment step). The HONEST no-Stripe state: the
 * backend answers clientSecret ONLY when a real PSP channel is bound
 * (null measured in the inert path); the intent moves to PROCESSING
 * and its completion is the backend's webhook/admin path — this
 * action never claims success, the surfaced state is what the backend
 * said.
 */
export async function processPaymentIntentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const intentId = text(formData, "intentId");
  if (!isUuid(intentId)) return { status: "error", message: "معرّف قصد الدفع غير صالح." };

  const result = await processPaymentIntent(intentId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر بدء معالجة الدفع (رمز ${result.status}).`),
    };
  }

  refresh();
  return {
    status: "success",
    message:
      result.data.clientSecret === null
        ? "قصد الدفع قيد المعالجة — اكتماله عبر قناة الدفع الخلفية (بوابة المالك)."
        : "قصد الدفع قيد المعالجة — أكمل الدفع لدى مزوّد الدفع.",
  };
}

/**
 * Cancel the payment intent — POST /api/v1/payments/intents/{id}/cancel
 * (batch-2 spec §2; CONSUMER only — the backend's own gate). The intent
 * state machine allows the transition from CREATED alone; anything
 * else answers 409 with the backend's own ConflictException words —
 * surfaced verbatim, never pre-validated away.
 */
export async function cancelPaymentIntentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const intentId = text(formData, "intentId");
  if (!isUuid(intentId)) return { status: "error", message: "معرّف قصد الدفع غير صالح." };

  const result = await cancelPaymentIntent(intentId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر إلغاء قصد الدفع (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "أُلغي قصد الدفع." };
}

/**
 * Open (or reuse) the BOOKING's conversation thread —
 * POST /api/v1/messages/conversations {bookingId} (batch-2 spec §4).
 * The single chat thread per booking; participant-scoped by the
 * backend's own gates. Redirects to the conversation page (the same
 * landing as «راسل الجار» — a new surface, not a re-render).
 */
export async function openBookingConversationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const bookingId = text(formData, "bookingId");
  if (!isUuid(bookingId)) return { status: "error", message: "معرّف الحجز غير صالح." };

  const result = await openBookingConversation(bookingId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر فتح محادثة الحجز (رمز ${result.status}).`),
    };
  }

  redirect(`/inbox/conversations/${result.data.id}`);
}

/** Parse + bound-check the shared review form fields (the request's own @Min/@Max mirror). */
function parseReviewForm(
  formData: FormData,
): { ok: true; rating: number; comment: string | null } | { ok: false; message: string } {
  const ratingRaw = text(formData, "rating");
  const rating = Number.parseInt(ratingRaw, 10);
  if (!Number.isFinite(rating) || rating < REVIEW_RATING_MIN || rating > REVIEW_RATING_MAX) {
    return { ok: false, message: `التقييم رقم بين ${REVIEW_RATING_MIN} و${REVIEW_RATING_MAX}.` };
  }
  return { ok: true, rating, comment: optionalText(formData, "comment") };
}

/**
 * The consumer review — POST /api/v1/reviews (one per completed
 * booking, by the booking's consumer). The backend's direction and
 * completion gates surface verbatim (409 already-exists, 403 not the
 * consumer, 400 not COMPLETED).
 */
export async function createReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً لكتابة تقييمك." };
  }

  const bookingId = text(formData, "bookingId");
  if (!isUuid(bookingId)) return { status: "error", message: "معرّف الحجز غير صالح." };

  const parsed = parseReviewForm(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const result = await createReview(bookingId, parsed.rating, parsed.comment);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر نشر التقييم (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "نُشر تقييمك." };
}

/**
 * The reverse review — POST /api/v1/reviews/reverse (the booking's
 * provider rates its consumer; one per completed booking). Same
 * mirrored gates, surfaced verbatim.
 */
export async function createReverseReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً لكتابة تقييم الضيف." };
  }

  const bookingId = text(formData, "bookingId");
  if (!isUuid(bookingId)) return { status: "error", message: "معرّف الحجز غير صالح." };

  const parsed = parseReviewForm(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const result = await createReverseReview(bookingId, parsed.rating, parsed.comment);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر نشر تقييم الضيف (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "نُشر تقييمك للضيف." };
}

/**
 * Open a dispute — POST /api/v1/bookings/{id}/disputes (L24, either
 * booking participant; the reason rides the query string on the
 * backend's own @RequestParam contract). NO booking-status gate and
 * no per-booking limit exist on the backend's open (measured) — this
 * action mirrors only the reason's @NotBlank and the reason column's
 * 1000-char bound; the participant 403 and every other gate stay the
 * backend's, their words surfacing verbatim. The resolve is the
 * administration's decision (ADMIN-only, undiscoverable from /me —
 * measured) — the success message states exactly that, never a
 * claimed outcome.
 */
export async function openDisputeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً لفتح النزاع." };
  }

  const bookingId = text(formData, "bookingId");
  if (!isUuid(bookingId)) return { status: "error", message: "معرّف الحجز غير صالح." };

  const reason = text(formData, "reason");
  if (reason.length === 0) {
    return { status: "error", message: "سبب النزاع مطلوب." };
  }
  if (reason.length > DISPUTE_REASON_MAX_LENGTH) {
    return {
      status: "error",
      message: `سبب النزاع حتى ${new Intl.NumberFormat("ar").format(DISPUTE_REASON_MAX_LENGTH)} حرفًا.`,
    };
  }

  const result = await openDispute(bookingId, reason);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر فتح النزاع (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "فُتح النزاع — الحسم بيد إدارة السوق ويظهر هنا عند صدوره." };
}
