/**
 * Authenticated administration data CHANNEL — the batch-3 spec surface
 * (the moderation report queue + the pricing-rules manager + the
 * payments administration), riding the SAME authenticated server channel
 * as everything else: src/lib/api/server.ts (session Bearer,
 * auto-refresh, direct BACKEND_URL fetch, expected failures as data).
 * Server-only (next/headers under it) — the shared contract types and
 * vocabulary live in admin-contract.ts.
 *
 * Every contract here is measured from the backend source and live
 * staging probes (app-java-v3, 2026-09-25):
 * - The whole administration surface sits behind hasRole('ADMIN') —
 *   three defense layers on the moderation queue (SecurityConfig's
 *   /api/v1/admin/** rule + the class @PreAuthorize + the service
 *   gate), the class-level gate on PricingRuleController, and the
 *   service-level gates on confirmIntent/refundPayment. Every read and
 *   write below answers 403 AUTHZ-001 problem+json for a non-admin
 *   caller (measured live with the qa-tester token) — the console
 *   renders those words verbatim; the backend is the sole authority.
 * - The queue read is FIFO on the complete sort key (createdAt ASC,
 *   id ASC); the optional status axis filters OPEN/RESOLVED/DISMISSED;
 *   an invalid status parses like the action does — the house 400
 *   listing the vocabulary.
 * - A second resolve on a closed report answers 409 (the report state
 *   machine's one-directional honesty — ReportStatus.java).
 * - The payments list returns PaymentSummary rows whose id IS the
 *   payment-intent id; the refund command takes a PAYMENT-row id that
 *   no contract read exposes (the refund response itself is its only
 *   surface) — stated honestly on the form, never guessed.
 */

import { backendGet, backendSend, type BackendResult } from "./server";
import type { PagedResponse } from "./types";
import type { PaymentIntentView } from "./booking-contract";
import type {
  ModerationAction,
  ModerationReportView,
  PaymentRefundView,
  PaymentSummaryView,
  PricingRuleView,
  ReportStatusFilter,
} from "./admin-contract";

/**
 * The moderation report queue — `GET /api/v1/admin/reports?status=&page=&size=`
 * (the whole FIFO drain order, oldest first; absent status = every
 * state). Paged by the backend's complete sort key (createdAt, id).
 */
export function getModerationQueue(
  status?: ReportStatusFilter,
  page = 0,
  size = 20,
): Promise<BackendResult<PagedResponse<ModerationReportView>>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (status) params.set("status", status);
  return backendGet(`/api/v1/admin/reports?${params.toString()}`);
}

/**
 * Resolve one report — `POST /api/v1/admin/reports/{reportId}/resolve
 * {action, note?}`. action is DISMISS (close, touch nothing) or
 * HIDE_CONTENT (flip the content + alert its author + close — one
 * transaction). A closed report's history is closed history: a second
 * resolve answers 409 with the backend's own words.
 */
export function resolveReport(
  reportId: string,
  action: ModerationAction,
  note: string | null,
): Promise<BackendResult<ModerationReportView>> {
  return backendSend(
    "POST",
    `/api/v1/admin/reports/${encodeURIComponent(reportId)}/resolve`,
    note === null ? { action } : { action, note },
  );
}

/**
 * The pricing rules list — `GET /api/v1/pricing/rules` (the whole set,
 * no pagination). The read itself is behind the class-level ADMIN gate
 * (measured 403 AUTHZ-001 for the non-admin caller).
 */
export function getPricingRules(): Promise<BackendResult<PricingRuleView[]>> {
  return backendGet("/api/v1/pricing/rules");
}

/**
 * Create a pricing rule — `POST /api/v1/pricing/rules` (201). name is
 * required (≤200); category ≤100 nullable; taxRate/discountPct are
 * nullable 0..1 fractions (the backend's own Bean Validation bounds —
 * its 400 words teach them verbatim).
 */
export function createPricingRule(input: {
  name: string;
  category: string | null;
  taxRate: number | null;
  discountPct: number | null;
}): Promise<BackendResult<PricingRuleView>> {
  return backendSend("POST", "/api/v1/pricing/rules", input);
}

/**
 * Activate one pricing rule — `PUT /api/v1/pricing/rules/{id}/activate`.
 * The response is the updated row (active: true).
 */
export function activatePricingRule(
  id: string,
): Promise<BackendResult<PricingRuleView>> {
  return backendSend(
    "PUT",
    `/api/v1/pricing/rules/${encodeURIComponent(id)}/activate`,
  );
}

/**
 * Deactivate one pricing rule — `PUT /api/v1/pricing/rules/{id}/deactivate`.
 * The response is the updated row (active: false).
 */
export function deactivatePricingRule(
  id: string,
): Promise<BackendResult<PricingRuleView>> {
  return backendSend(
    "PUT",
    `/api/v1/pricing/rules/${encodeURIComponent(id)}/deactivate`,
  );
}

/**
 * Delete one pricing rule — `DELETE /api/v1/pricing/rules/{id}` (204).
 */
export function deletePricingRule(
  id: string,
): Promise<BackendResult<null>> {
  return backendSend(
    "DELETE",
    `/api/v1/pricing/rules/${encodeURIComponent(id)}`,
  );
}

/**
 * The administration's payment-intent list —
 * `GET /api/v1/admin/payments?page=&size=` (PaymentSummary rows; `id`
 * IS the intent id, refundedAmountCents aggregates the refunds).
 */
export function getPaymentSummaries(
  page = 0,
  size = 20,
): Promise<BackendResult<PagedResponse<PaymentSummaryView>>> {
  return backendGet(
    `/api/v1/admin/payments?page=${page}&size=${size}`,
  );
}

/**
 * Confirm a payment intent — `POST /api/v1/payments/intents/{id}/confirm
 * {externalId}` (ADMIN, service-level gate). Marks the intent SUCCEEDED
 * with the PSP's external id and completes the payment behind it — the
 * response is the full intent row.
 */
export function confirmPaymentIntent(
  intentId: string,
  externalId: string,
): Promise<BackendResult<PaymentIntentView>> {
  return backendSend(
    "POST",
    `/api/v1/payments/intents/${encodeURIComponent(intentId)}/confirm`,
    { externalId },
  );
}

/**
 * Refund a payment — `POST /api/v1/payments/{paymentId}/refund` (ADMIN,
 * service-level gate; full refund). The path id is a PAYMENT-row id —
 * no contract read exposes payment ids (the refund response itself is
 * their only surface); the form states this honestly.
 */
export function refundPayment(
  paymentId: string,
): Promise<BackendResult<PaymentRefundView>> {
  return backendSend(
    "POST",
    `/api/v1/payments/${encodeURIComponent(paymentId)}/refund`,
  );
}
