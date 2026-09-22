/**
 * Disputes-surface contract types and vocabulary — the L24 layer
 * (النزاعات): a booking participant opens a dispute on their booking,
 * the marketplace administration resolves it with a decision that
 * carries the financial outcome.
 *
 * Pure types and constants only — client-safe (no next/headers), the
 * same split as booking-contract.ts/reputation-contract.ts vs their
 * channels (the measured stage-2 build error: client forms must not
 * pull server-only modules transitively).
 *
 * Every shape here is measured from the backend source and the live
 * production API (app-java-v3 @ f41ef1b, 2026-09-22; anonymous 401s
 * re-measured on production the same day):
 * - DisputeController: open is `POST /api/v1/bookings/{bookingId}/
 *   disputes` with the reason riding the QUERY STRING (@RequestParam
 *   @NotBlank — a JSON body is silently ignored by Spring's parameter
 *   resolution, the same measured contract as the availability slot
 *   publish); it answers 200 (ResponseEntity.ok — NOT 201) with the
 *   DisputeResponse. list is `GET /api/v1/bookings/{bookingId}/
 *   disputes` — a PLAIN ARRAY (no pagination), participant or ADMIN.
 * - DisputeService.open: NO booking-status gate (any state — the
 *   backend's own contract; this surface invents none) and NO
 *   per-booking count limit; the only gate is requireParticipant —
 *   the shared BookingInfo contract whose AccessDeniedException words
 *   ("You are not a participant in this booking") surface verbatim.
 * - DisputeService.listForBooking: ADMIN bypasses the participant
 *   check; everyone else answers the same 403 words.
 * - The ADMIN resolve (`POST /api/v1/admin/disputes/{id}/resolve`,
 *   gated hasRole('ADMIN') at BOTH the SecurityConfig `/api/v1/admin/**`
 *   matcher and @PreAuthorize) is a backend-owner surface from here:
 *   /me carries NO roles (UserResponse measured: id, email,
 *   displayName, createdAt, updatedAt), so this frontend cannot
 *   discover admin-ness — the same declared boundary the stage-6
 *   payment-intent confirm received.
 * - DisputeStatus machine (TRANSITIONS): OPEN → RESOLVED; RESOLVED is
 *   terminal (a repeated resolve answers 409 "Cannot transition from
 *   RESOLVED to RESOLVED" — the admin path's own words).
 * - DisputeResolution: the resolve decision's outcome —
 *   REFUND_CONSUMER executes the full refund and records the movement
 *   on the dispute (refundPaymentId + refundedAmountCents, null
 *   otherwise); RELEASE_PROVIDER leaves the money with the provider;
 *   NO_ACTION resolves without a financial movement.
 * - DisputeResponse: {id, bookingId, openedBy, status, resolution,
 *   refundPaymentId, refundedAmountCents, reason, createdAt,
 *   updatedAt} — openedBy IS a participant users.id (unlike
 *   BookingResponse) so "did I open this" joins through the me chain.
 * - Dispute.reason column: length 1000 — mirrored below as the form's
 *   bound (the backend's @NotBlank remains the empty-reason
 *   enforcement).
 */

/** DisputeStatus enum (marketplace-disputes) — the measured two states. */
export type DisputeStatus = "OPEN" | "RESOLVED";

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: "مفتوح",
  RESOLVED: "محسوم",
};

/**
 * DisputeResolution enum (marketplace-disputes) — the resolve
 * decision's financial outcome. Null while the dispute is OPEN.
 */
export type DisputeResolution = "REFUND_CONSUMER" | "RELEASE_PROVIDER" | "NO_ACTION";

export const DISPUTE_RESOLUTION_LABELS: Record<DisputeResolution, string> = {
  REFUND_CONSUMER: "استرداد المبلغ للمستهلك",
  RELEASE_PROVIDER: "بقاء المبلغ مع المزوّد",
  NO_ACTION: "حسم بلا حركة مالية",
};

/**
 * DisputeResponse (marketplace-disputes) — the measured wire shape.
 * `resolution`, `refundPaymentId` and `refundedAmountCents` are null
 * until the admin's resolve; the refund pair is set ONLY on a
 * REFUND_CONSUMER decision.
 */
export interface DisputeView {
  id: string;
  bookingId: string;
  /** The opener's users.id — a participant (the open gate measured). */
  openedBy: string;
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  refundPaymentId: string | null;
  /** The payment's cumulative refunded total in MINOR units. */
  refundedAmountCents: number | null;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The dispute reason's bound — the disputes.reason column length
 * (measured @Column length 1000). Mirrored in the form's HTML
 * validation; the backend's @NotBlank remains the empty-reason
 * authority.
 */
export const DISPUTE_REASON_MAX_LENGTH = 1000;
