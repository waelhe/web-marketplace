/**
 * Booking-surface contract types and vocabulary — roadmap stage 6
 * (الحجز والدفع): the consumer booking request, the booking lifecycle
 * (confirm/complete/cancel), the payment-intent surface with the honest
 * no-Stripe state, and the provider-side availability management (the
 * exact-slot gate's provider side).
 *
 * Pure types and constants only — client-safe (no next/headers), the
 * same split as provider-contract.ts/reputation-contract.ts vs their
 * channels (the measured stage-2 build error: client forms must not
 * pull server-only modules transitively).
 *
 * Every shape here is measured from the backend source and the live
 * production API (app-java-v3 @ f41ef1b, 2026-09-22):
 * - BookingController.CreateBookingRequest: listingId + startsAt +
 *   endsAt (ISO instants, [start, end) half-open — the checkout morning
 *   is not a priced night) + optional notes. Pricing is DERIVED
 *   server-side (the effective price of the window); the client never
 *   supplies it.
 * - BookingResponse: {id, listingId, status, startsAt, endsAt, notes,
 *   createdAt, updatedAt} — NO participant ids, NO price (measured).
 *   The role join is therefore the caller's own consumer/provider
 *   lists (booking.ts' classifyBookingRole).
 * - BookingStatus machine (TRANSITIONS): PENDING → CONFIRMED |
 *   CANCELLED; CONFIRMED → COMPLETED | CANCELLED; COMPLETED and
 *   CANCELLED are terminal.
 * - PaymentsController/Service: the intent write is read-or-create on
 *   the idempotency key (a same-key call returns the existing intent;
 *   a foreign consumer's key answers 403); create requires the booking
 *   to be CONFIRMED (requireStatus words) with the caller its
 *   consumer; process is the CONSUMER path that answers clientSecret
 *   ONLY when a PSP channel is bound (null in the inert path —
 *   measured); confirm is ADMIN-only (completion is the backend's
 *   webhook/admin path, never claimed by this frontend).
 * - PaymentIntentMapper: clientSecret rides ONLY the process response
 *   (null on every other read/write of the intent).
 * - PaymentIntentStatus machine: CREATED → PROCESSING | CANCELLED;
 *   PROCESSING → SUCCEEDED | FAILED; SUCCEEDED → REFUNDED |
 *   PARTIALLY_REFUNDED (terminal thereafter).
 * - AvailabilityController: the slot publish rides the QUERY STRING
 *   (@RequestParam startsAt/endsAt — NOT a JSON body; measured), and
 *   the availability read takes from/to window params. Both are
 *   authenticated surfaces (NOT in the SecurityConfig permitAll list —
 *   the measured 401 to anonymous callers).
 * - ReviewsController/Service: the consumer review (POST /reviews)
 *   needs the booking COMPLETED with the caller its consumer; the
 *   reverse review (POST /reviews/reverse) needs the caller to be the
 *   booking's provider; one per direction per booking (409 words);
 *   rating bounds 1..5 (CreateReviewRequest @Min/@Max).
 */

/** BookingStatus enum (marketplace-booking) — the measured four states. */
export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "بانتظار تأكيد المزوّد",
  CONFIRMED: "مؤكَّد",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغى",
};

/**
 * The booking states a consumer may cancel from (the backend's own
 * TRANSITIONS: PENDING and CONFIRMED both reach CANCELLED; the two
 * terminal states answer 409 with the backend's words).
 */
export const CONSUMER_CANCELLABLE: BookingStatus[] = ["PENDING", "CONFIRMED"];

/** The provider's action states — confirm from PENDING, complete from CONFIRMED. */
export const PROVIDER_CONFIRMABLE: BookingStatus[] = ["PENDING"];
export const PROVIDER_COMPLETABLE: BookingStatus[] = ["CONFIRMED"];

/** The states from which the reviewable flow opens (COMPLETED only — measured). */
export const REVIEWABLE: BookingStatus[] = ["COMPLETED"];

/** BookingResponse (marketplace-booking) — the measured wire shape. */
export interface BookingView {
  id: string;
  listingId: string;
  status: BookingStatus;
  /** ISO instant — stay start (inclusive). */
  startsAt: string;
  /** ISO instant — stay end (EXCLUSIVE — the checkout morning is not a priced night). */
  endsAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * PaymentIntentStatus enum (marketplace-payments) — the measured seven
 * states with their transition machine.
 */
export type PaymentIntentStatus =
  | "CREATED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export const PAYMENT_INTENT_STATUS_LABELS: Record<PaymentIntentStatus, string> = {
  CREATED: "منشأ",
  PROCESSING: "قيد المعالجة",
  SUCCEEDED: "ناجح",
  FAILED: "فاشل",
  CANCELLED: "ملغى",
  REFUNDED: "مسترد كاملاً",
  PARTIALLY_REFUNDED: "مسترد جزئياً",
};

/**
 * PaymentIntentResponse (marketplace-payments) — amountCents is MINOR
 * units (the booking total the backend derived at creation). NOTE the
 * measured mapper contract: `clientSecret` is present ONLY on the
 * process path (null on create/read/cancel — the honest no-Stripe
 * state); `pspIntentId` is null until a real PSP channel exists.
 */
export interface PaymentIntentView {
  id: string;
  bookingId: string;
  amountCents: number;
  currency: string;
  status: PaymentIntentStatus;
  pspIntentId: string | null;
  clientSecret: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * One published availability slot (marketplace-availability
 * AvailabilitySlot): a bookable window [startsAt, endsAt). `booked`
 * marks the slot consumed by a CONFIRMED booking (released on cancel).
 * The audit pair rides BaseEntity's getters (optional in the wire
 * shape — the UI consumes the window and the booked flag only).
 */
export interface AvailabilitySlotView {
  id: string;
  providerId: string;
  startsAt: string;
  endsAt: string;
  booked: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * ProviderAvailabilityRule — the weekly recurring window the slot
 * generator expands into concrete slots (measured entity fields).
 * `dayOfWeek` is the DayOfWeek enum name; times are LocalTime
 * serialized "HH:mm:ss" — displayed as-is, never reinterpreted.
 */
export interface AvailabilityRuleView {
  id: string;
  providerId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** ProviderTimeOff — a blocked window [startsAt, endsAt) (measured entity fields). */
export interface ProviderTimeOffView {
  id: string;
  providerId: string;
  startsAt: string;
  endsAt: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** The DayOfWeek vocabulary the weekly-rule form offers (the enum's own names). */
export const WEEK_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

/** Arabic labels of the measured DayOfWeek vocabulary (locale-first: Sunday start). */
export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  SUNDAY: "الأحد",
  MONDAY: "الاثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
  FRIDAY: "الجمعة",
  SATURDAY: "السبت",
};

/**
 * The deterministic payment-intent idempotency key — the bridge over
 * the measured backend gap (no "intent by booking" read exists). The
 * backend's createIntent is read-or-create on the idempotency key
 * (PaymentsService, measured), so a stable key derived from the
 * booking id makes every resolve return THE one intent for that
 * booking: first resolve creates, later resolves read. The key is a
 * free-form server-side string — this shape is ours, its idempotence
 * is the backend's own contract.
 */
export function paymentIntentKey(bookingId: string): string {
  return `web-booking-${bookingId}`;
}

/**
 * The bookings page size — the backend's own default page (20), the
 * same no-invention convention as PROVIDER_REVIEWS_PAGE_SIZE.
 */
export const BOOKINGS_PAGE_SIZE = 20;

/**
 * The availability display window (days ahead of now) the provider
 * bookings page asks the backend for. The window itself is computed
 * INSIDE the channel function (booking.ts) — never in component render
 * (react-hooks/purity: Date.now() in render is a side effect).
 */
export const AVAILABILITY_WINDOW_DAYS = 60;

/**
 * The review rating bounds — CreateReviewRequest's own @Min/@Max
 * (mirrored from the backend's bean validation; the backend remains
 * the enforcement).
 */
export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
