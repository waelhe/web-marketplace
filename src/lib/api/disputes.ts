/**
 * The disputes channel (L24 — النزاعات): the participant-side
 * dispute surface on a booking — the per-booking list read and the
 * open write — on the same data-channel discipline as every other
 * stage: src/lib/api/server.ts (session Bearer, direct BACKEND_URL
 * fetch, expected failures as data). Server-only (next/headers under
 * it) — the contract types and vocabulary live in
 * disputes-contract.ts.
 *
 * Every path below was measured against the backend source and the
 * live production API (app-java-v3 @ f41ef1b, 2026-09-22; anonymous
 * 401 probes re-measured on production the same day):
 * - GET  /api/v1/bookings/{bookingId}/disputes — participant or
 *   ADMIN (the backend's own gate; its AccessDeniedException words
 *   surface verbatim); a PLAIN ARRAY of DisputeResponse — no
 *   pagination on this read (measured).
 * - POST /api/v1/bookings/{bookingId}/disputes?reason=… — the open
 *   write. MEASURED CONTRACT: the reason rides the QUERY STRING
 *   (@RequestParam @NotBlank on the controller — a JSON body is
 *   silently ignored by Spring's parameter resolution, the same
 *   measured contract as the availability slot publish). Any booking
 *   participant (NO booking-status gate — the backend's own
 *   contract); answers 200 with the created DisputeResponse (NOT
 *   201 — measured ResponseEntity.ok).
 *
 * The ADMIN resolve (`POST /api/v1/admin/disputes/{id}/resolve`) is
 * deliberately NOT in this channel: /me carries no roles (measured),
 * so admin-ness is undiscoverable from this frontend — the resolve
 * stays the backend owner's admin surface, the same declared boundary
 * as the stage-6 payment-intent confirm.
 */

import { backendGet, backendSend, type BackendResult } from "./server";
import type { DisputeView } from "./disputes-contract";

/**
 * One booking's disputes — `GET /api/v1/bookings/{id}/disputes`
 * (participant or ADMIN — the backend's own gate; a refused read's
 * problem words surface verbatim, never guessed).
 */
export function getBookingDisputes(bookingId: string): Promise<BackendResult<DisputeView[]>> {
  return backendGet<DisputeView[]>(
    `/api/v1/bookings/${encodeURIComponent(bookingId)}/disputes`,
  );
}

/**
 * Open a dispute — `POST /api/v1/bookings/{id}/disputes?reason=…`.
 * The reason rides the QUERY STRING (the measured @RequestParam
 * contract); the participant gate and the reason's @NotBlank stay
 * the backend's enforcement (their words surface verbatim).
 */
export function openDispute(bookingId: string, reason: string): Promise<BackendResult<DisputeView>> {
  const params = new URLSearchParams({ reason });
  return backendSend<DisputeView>(
    "POST",
    `/api/v1/bookings/${encodeURIComponent(bookingId)}/disputes?${params}`,
  );
}
