/**
 * The booking channel (roadmap stage 6 — الحجز والدفع): the consumer
 * booking request + lifecycle writes, the self-scoped list reads via
 * the ME chain, the payment-intent resolve/process surface, and the
 * provider-side availability read + slot publish — on the same
 * data-channel discipline as every other stage: src/lib/api/server.ts
 * (session Bearer, direct BACKEND_URL fetch, expected failures as
 * data). Server-only (next/headers under it) — the contract types and
 * vocabulary live in booking-contract.ts.
 *
 * Every path below was re-measured against the backend source and the
 * live production API (app-java-v3 @ f41ef1b, 2026-09-22):
 * - GET  /api/v1/bookings/{id} — participant-scoped detail (consumer,
 *   provider or ADMIN; anyone else gets the backend's own refusal).
 * - GET  /api/v1/bookings/consumer/{consumerId}?page&size — self or
 *   ADMIN only (the path id is a users.id).
 * - GET  /api/v1/bookings/provider/{providerId}?page&size — owning
 *   provider or ADMIN only (the path id is a users.id — the A1
 *   convention: every cross-module provider_id carries a user id).
 * - POST /api/v1/bookings — CONSUMER role; the nightly total is
 *   derived server-side (effective price); the exact-slot gate
 *   rejects windows that do not match a published slot EXACTLY (its
 *   400 words surface verbatim); 429 RL-001 on the bookingCreate
 *   budget.
 * - POST /api/v1/bookings/{id}/confirm — PROVIDER (the booking's
 *   provider only).
 * - POST /api/v1/bookings/{id}/complete — PROVIDER (COMPLETED is the
 *   reviewable state).
 * - POST /api/v1/bookings/{id}/cancel — either participant.
 * - POST /api/v1/payments/intents — read-or-create on the
 *   idempotencyKey; requires the booking CONFIRMED with the caller
 *   its consumer.
 * - POST /api/v1/payments/intents/{id}/process — CONSUMER;
 *   clientSecret ONLY when a PSP channel is bound (null measured in
 *   the inert path).
 * - GET  /api/v1/providers/{id}/availability?from&to — authenticated
 *   (NOT permitAll); List<AvailabilitySlot>.
 * - POST /api/v1/providers/{id}/availability/slots?startsAt&endsAt —
 *   the slot publish rides the QUERY STRING (@RequestParam — NOT a
 *   JSON body; measured), owner-scoped (authHelper.ownsProvider).
 *
 * IDENTITY (the me chain): the caller's backend users.id resolves
 * through GET /api/v1/users/me — the same measured identity seam
 * inbox.ts uses for message ownership, never a guessed
 * Better-Auth↔users.id mapping. BookingResponse carries NO
 * participant ids (measured), so the caller's ROLE on a booking is
 * the measured join: which of the caller's OWN consumer/provider
 * first pages contains the booking id (classifyBookingRole).
 */

import { cache } from "react";
import { backendGet, backendSend, type BackendResult } from "./server";
import { getMyBackendUser } from "./inbox";
import type { PagedResponse } from "./types";
import {
  AVAILABILITY_WINDOW_DAYS,
  BOOKINGS_PAGE_SIZE,
  paymentIntentKey,
  type AvailabilityRuleView,
  type AvailabilitySlotView,
  type BookingView,
  type PaymentIntentView,
  type ProviderTimeOffView,
} from "./booking-contract";

/** Run a backend call with the caller's own /me-resolved users.id. */
async function withMyId<T>(
  fn: (id: string) => Promise<BackendResult<T>>,
): Promise<BackendResult<T>> {
  const me = await getMyBackendUser();
  if (!me.ok) {
    return { ok: false, status: me.status, problem: null, unauthenticated: me.status === 401 };
  }
  return fn(me.id);
}

/**
 * My consumer bookings — `GET /api/v1/bookings/consumer/{me.id}`
 * (self-scoped through the me chain; the id never comes from the
 * client). Memoized per render pass so the page body and any other
 * caller in the same request share ONE backend GET.
 */
export const getMyConsumerBookings = cache(
  async (page: number): Promise<BackendResult<PagedResponse<BookingView>>> =>
    withMyId((id) =>
      backendGet<PagedResponse<BookingView>>(
        `/api/v1/bookings/consumer/${encodeURIComponent(id)}?page=${page}&size=${BOOKINGS_PAGE_SIZE}`,
      ),
    ),
);

/**
 * My provider bookings — `GET /api/v1/bookings/provider/{me.id}`
 * (the bookings placed on the caller's own listings; same me-chain
 * scoping, same memoization).
 */
export const getMyProviderBookings = cache(
  async (page: number): Promise<BackendResult<PagedResponse<BookingView>>> =>
    withMyId((id) =>
      backendGet<PagedResponse<BookingView>>(
        `/api/v1/bookings/provider/${encodeURIComponent(id)}?page=${page}&size=${BOOKINGS_PAGE_SIZE}`,
      ),
    ),
);

/**
 * One booking — `GET /api/v1/bookings/{id}` (participant-scoped: the
 * consumer or the provider of the booking, or ADMIN; anyone else gets
 * the backend's own refusal — 404 unknown id, 403 not a participant).
 */
export function getBooking(id: string): Promise<BackendResult<BookingView>> {
  return backendGet<BookingView>(`/api/v1/bookings/${encodeURIComponent(id)}`);
}

/** The caller's role on one booking — the measured join (see module doc). */
export type BookingRole = "consumer" | "provider" | "unknown";

/**
 * Classify the caller's role on a booking. BookingResponse carries NO
 * participant ids (measured), so the role resolves through the
 * caller's OWN first pages: the booking's presence in the consumer
 * list makes the caller its consumer; in the provider list its
 * provider. A booking beyond both first pages (or a foreign booking
 * the detail read already refused) classifies "unknown" — the page
 * then renders the shared facts only, never a guessed role. Memoized
 * per render pass so the detail page's classification shares the list
 * reads with every other caller in the same request.
 */
export const classifyBookingRole = cache(
  async (bookingId: string): Promise<{ ok: true; role: BookingRole } | { ok: false; status: number }> => {
    const me = await getMyBackendUser();
    if (!me.ok) return { ok: false, status: me.status };

    const [consumerPage, providerPage] = await Promise.all([
      getMyConsumerBookings(0),
      getMyProviderBookings(0),
    ]);
    const asConsumer =
      consumerPage.ok && consumerPage.data.content.some((booking) => booking.id === bookingId);
    const asProvider =
      providerPage.ok && providerPage.data.content.some((booking) => booking.id === bookingId);
    if (asConsumer) return { ok: true, role: "consumer" };
    if (asProvider) return { ok: true, role: "provider" };
    return { ok: true, role: "unknown" };
  },
);

/**
 * Create a booking request — `POST /api/v1/bookings` (CONSUMER role;
 * 201 with the BookingResponse). The stay window is [startsAt, endsAt)
 * half-open; the nightly total is DERIVED server-side (the client
 * never supplies pricing — the backend's own contract). The
 * exact-slot gate's 400 words and the bookingCreate budget's 429
 * RL-001 surface verbatim.
 */
export function createBooking(input: {
  listingId: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
}): Promise<BackendResult<BookingView>> {
  return backendSend<BookingView>("POST", "/api/v1/bookings", input);
}

/** Confirm a booking — `POST /api/v1/bookings/{id}/confirm` (the booking's provider). */
export function confirmBooking(id: string): Promise<BackendResult<BookingView>> {
  return backendSend<BookingView>("POST", `/api/v1/bookings/${encodeURIComponent(id)}/confirm`);
}

/**
 * Complete a booking — `POST /api/v1/bookings/{id}/complete` (the
 * booking's provider). COMPLETED is the reviewable state both review
 * directions gate on.
 */
export function completeBooking(id: string): Promise<BackendResult<BookingView>> {
  return backendSend<BookingView>("POST", `/api/v1/bookings/${encodeURIComponent(id)}/complete`);
}

/** Cancel a booking — `POST /api/v1/bookings/{id}/cancel` (either participant). */
export function cancelBooking(id: string): Promise<BackendResult<BookingView>> {
  return backendSend<BookingView>("POST", `/api/v1/bookings/${encodeURIComponent(id)}/cancel`);
}

/**
 * Resolve the booking's payment intent — `POST /api/v1/payments/intents`
 * with the deterministic idempotency key (booking-contract's
 * paymentIntentKey). The backend's create is READ-OR-CREATE on the
 * key (measured), so this resolves THE one intent for the booking:
 * first resolve creates (201), later resolves return the existing one
 * (200) — the bridge over the measured gap that no "intent by
 * booking" read exists. Requires the booking CONFIRMED with the
 * caller its consumer (the backend's own gates; their words surface
 * verbatim).
 */
export function resolvePaymentIntent(
  bookingId: string,
): Promise<BackendResult<PaymentIntentView>> {
  return backendSend<PaymentIntentView>("POST", "/api/v1/payments/intents", {
    bookingId,
    idempotencyKey: paymentIntentKey(bookingId),
  });
}

/**
 * Process the payment intent — `POST /api/v1/payments/intents/{id}/process`
 * (CONSUMER). clientSecret returns ONLY when a real PSP channel is
 * bound on the backend (null in the inert path — the honest no-Stripe
 * state, measured); the intent moves CREATED → PROCESSING and its
 * completion stays the backend's webhook/admin path — never claimed
 * here.
 */
export function processPaymentIntent(
  intentId: string,
): Promise<BackendResult<PaymentIntentView>> {
  return backendSend<PaymentIntentView>(
    "POST",
    `/api/v1/payments/intents/${encodeURIComponent(intentId)}/process`,
  );
}

/**
 * Cancel the payment intent —
 * `POST /api/v1/payments/intents/{id}/cancel` (CONSUMER only — the
 * backend's own @PreAuthorize). The intent state machine allows the
 * transition from CREATED alone (PaymentIntentStatus.TRANSITIONS:
 * CREATED → {PROCESSING, CANCELLED}); a cancel from any other state
 * answers 409 with the backend's own ConflictException words —
 * surfaced verbatim, never pre-validated away.
 */
export function cancelPaymentIntent(
  intentId: string,
): Promise<BackendResult<PaymentIntentView>> {
  return backendSend<PaymentIntentView>(
    "POST",
    `/api/v1/payments/intents/${encodeURIComponent(intentId)}/cancel`,
  );
}

/**
 * My published availability slots —
 * `GET /api/v1/providers/{me.id}/availability?from&to` (authenticated;
 * NOT permitAll — the measured 401 to anonymous callers). The display
 * window is computed HERE, inside the channel function (react-hooks
 * purity: Date.now() belongs in the data layer, never in component
 * render).
 */
export function getMyAvailability(): Promise<BackendResult<AvailabilitySlotView[]>> {
  return withMyId((id) => {
    const from = new Date();
    const to = new Date(from.getTime() + AVAILABILITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    return backendGet<AvailabilitySlotView[]>(
      `/api/v1/providers/${encodeURIComponent(id)}/availability?${params}`,
    );
  });
}

/**
 * Publish one availability slot —
 * `POST /api/v1/providers/{me.id}/availability/slots?startsAt&endsAt`.
 * MEASURED CONTRACT: the publish rides the QUERY STRING
 * (@RequestParam on the controller — a JSON body is silently ignored
 * by Spring's parameter resolution, so the instants MUST be query
 * parameters). Owner-scoped server-side (authHelper.ownsProvider —
 * the me chain supplies the id; the client never sends it).
 */
export function publishAvailabilitySlot(
  startsAt: string,
  endsAt: string,
): Promise<BackendResult<AvailabilitySlotView>> {
  return withMyId((id) => {
    const params = new URLSearchParams({ startsAt, endsAt });
    return backendSend<AvailabilitySlotView>(
      "POST",
      `/api/v1/providers/${encodeURIComponent(id)}/availability/slots?${params}`,
    );
  });
}

/**
 * Create a WEEKLY availability rule —
 * `POST /api/v1/providers/{me.id}/availability/rules?dayOfWeek&startTime&endTime`.
 * MEASURED CONTRACT: the query string again (@RequestParam
 * dayOfWeek/startTime/endTime — LocalTime binds "HH:mm"). A recurring
 * weekly window the slot generator expands into concrete slots — the
 * effect is visible in the slots read (getMyAvailability), never
 * recomputed here. Same ownsProvider gate as the slot publish (the
 * me chain supplies the id). The contract exposes NO read/delete for
 * rules (measured, 108 paths) — the created entity echoes back and
 * that is the whole surface.
 */
export function createAvailabilityRule(
  dayOfWeek: string,
  startTime: string,
  endTime: string,
): Promise<BackendResult<AvailabilityRuleView>> {
  return withMyId((id) => {
    const params = new URLSearchParams({ dayOfWeek, startTime, endTime });
    return backendSend<AvailabilityRuleView>(
      "POST",
      `/api/v1/providers/${encodeURIComponent(id)}/availability/rules?${params}`,
    );
  });
}

/**
 * Block a time-off window —
 * `POST /api/v1/providers/{me.id}/time-off?startsAt&endsAt` (ISO
 * instants on the query string — @RequestParam @DateTimeFormat, the
 * slot publish's own convention). Marks the window unavailable
 * (conflicts with booking and search availability — the backend's own
 * words). No read/delete in the contract (measured) — the created
 * entity echoes back.
 */
export function createTimeOff(
  startsAt: string,
  endsAt: string,
): Promise<BackendResult<ProviderTimeOffView>> {
  return withMyId((id) => {
    const params = new URLSearchParams({ startsAt, endsAt });
    return backendSend<ProviderTimeOffView>(
      "POST",
      `/api/v1/providers/${encodeURIComponent(id)}/time-off?${params}`,
    );
  });
}
