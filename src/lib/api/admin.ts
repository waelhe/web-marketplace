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
import type { DisputeResolution, DisputeView } from "./disputes-contract";
import type { GeoNode } from "./geo";
import type { ProviderProfileView } from "./provider-contract";
import type {
  AuditPurgeResult,
  BookingSummaryView,
  ContentPurgeResult,
  ListingPromotionView,
  ModerationAction,
  ModerationReportView,
  PaymentRefundView,
  PaymentSummaryView,
  PricingRuleView,
  ProviderBalanceView,
  ProviderListingSummaryView,
  ReportStatusFilter,
  RevisionEntryView,
  UserStatusValue,
  UserRoleValue,
  UserSummaryView,
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

/* ------------------------------------------------------------------ */
/* Batch-4 — the administration console II channels (the remaining   */
/* 21 admin operations, the batch-4 spec). Same authenticated server  */
/* channel; every contract below is pinned from the backend source:   */
/* AdminController (class-level ADMIN gate on all fourteen ops),      */
/* GeoAdminController (class gate + service gate), LedgerController   */
/* (method-level @PreAuthorize), the admin/providers/{id}/verify +   */
/* suspend surface under the /api/v1/admin/** SecurityConfig rule,    */
/* and DisputeController's admin resolve (optional body).            */
/* ------------------------------------------------------------------ */

/**
 * The administration's user list — `GET /api/v1/admin/users?page=&size=`
 * (UserSummary rows: id, email, displayName, role, timestamps).
 */
export function getUsers(
  page = 0,
  size = 20,
): Promise<BackendResult<PagedResponse<UserSummaryView>>> {
  return backendGet(`/api/v1/admin/users?page=${page}&size=${size}`);
}

/**
 * Change one user's role — `PUT /api/v1/admin/users/{id}/role {role}`.
 * The body's role rides the backend's own UserRole enum (valueOf —
 * the console's select pins CONSUMER|PROVIDER|ADMIN from source).
 */
export function updateUserRole(
  userId: string,
  role: UserRoleValue,
): Promise<BackendResult<null>> {
  return backendSend(
    "PUT",
    `/api/v1/admin/users/${encodeURIComponent(userId)}/role`,
    { role },
  );
}

/**
 * Disable/enable one account — `PUT /api/v1/admin/users/{id}/status
 * {status, reason}`. Both fields are the backend's own request-bound
 * contract (@Pattern DISABLED|ENABLED + @NotBlank reason — the reason
 * rides the identity module's structured audit line).
 */
export function updateUserStatus(
  userId: string,
  status: UserStatusValue,
  reason: string,
): Promise<BackendResult<null>> {
  return backendSend(
    "PUT",
    `/api/v1/admin/users/${encodeURIComponent(userId)}/status`,
    { status, reason },
  );
}

/**
 * One-way account pseudonymization — `POST /api/v1/admin/users/{id}/
 * pseudonymize {reason}` (I7's erasure flow, phase 1). The backend
 * answers 503 SU-001 while its HMAC secret channel is unbound — the
 * capability is OFF, not broken (stated on the form).
 */
export function pseudonymizeUser(
  userId: string,
  reason: string,
): Promise<BackendResult<null>> {
  return backendSend(
    "POST",
    `/api/v1/admin/users/${encodeURIComponent(userId)}/pseudonymize`,
    { reason },
  );
}

/**
 * The free-text content purge — `POST /api/v1/admin/users/{id}/
 * purge-content {reason}` → {purgedRows} (I7 phase 3). Idempotent by
 * the port contract; the service's own guard requires the account to
 * be pseudonymized first (409 otherwise — the backend's words).
 */
export function purgeUserContent(
  userId: string,
  reason: string,
): Promise<BackendResult<ContentPurgeResult>> {
  return backendSend(
    "POST",
    `/api/v1/admin/users/${encodeURIComponent(userId)}/purge-content`,
    { reason },
  );
}

/**
 * The audit-identity purge — `POST /api/v1/admin/users/{id}/
 * purge-audit-history {reason}` → {scrubbedRows, usersAudRowsDeleted}
 * (I7 phase 3). Same pseudonymized-first guard; heavy and idempotent.
 */
export function purgeUserAuditHistory(
  userId: string,
  reason: string,
): Promise<BackendResult<AuditPurgeResult>> {
  return backendSend(
    "POST",
    `/api/v1/admin/users/${encodeURIComponent(userId)}/purge-audit-history`,
    { reason },
  );
}

/**
 * The administration's ALL-bookings read — `GET /api/v1/admin/bookings?
 * status=&page=&size=` (BookingSummary rows carrying BOTH participant
 * ids — the admin view). The optional status filter passes through
 * verbatim (no client-side vocabulary — the backend is the authority).
 */
export function getAllBookings(
  status: string | null,
  page = 0,
  size = 20,
): Promise<BackendResult<PagedResponse<BookingSummaryView>>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (status) params.set("status", status);
  return backendGet(`/api/v1/admin/bookings?${params.toString()}`);
}

/**
 * The administration's ALL-listings read — `GET /api/v1/admin/listings?
 * page=&size=` (ProviderListingSummary rows). The only contract read
 * whose rows expose providerId — the id source for verify/suspend.
 */
export function getAllListings(
  page = 0,
  size = 20,
): Promise<BackendResult<PagedResponse<ProviderListingSummaryView>>> {
  return backendGet(
    `/api/v1/admin/listings?page=${page}&size=${size}`,
  );
}

/**
 * Archive one listing administratively — `POST /api/v1/admin/listings/
 * {id}/archive`. The response is the archived summary row verbatim.
 */
export function archiveListing(
  listingId: string,
): Promise<BackendResult<ProviderListingSummaryView>> {
  return backendSend(
    "POST",
    `/api/v1/admin/listings/${encodeURIComponent(listingId)}/archive`,
  );
}

/**
 * Set (or clear) one listing's L37 boost window — `PUT /api/v1/admin/
 * listings/{id}/promotion {until}`. An ABSENT/null until CLEARS the
 * boost (the backend's own PUT semantics — an admin correcting a
 * shading is the documented exit); the response is the resulting
 * ListingPromotion state (promotedUntil: null when cleared).
 */
export function setListingPromotion(
  listingId: string,
  until: string | null,
): Promise<BackendResult<ListingPromotionView>> {
  return backendSend(
    "PUT",
    `/api/v1/admin/listings/${encodeURIComponent(listingId)}/promotion`,
    { until },
  );
}

/**
 * One payment intent's summary — `GET /api/v1/admin/payments/{id}` (the
 * single-intent read; same PaymentSummary shape as the list rows).
 */
export function getPaymentIntent(
  intentId: string,
): Promise<BackendResult<PaymentSummaryView>> {
  return backendGet(
    `/api/v1/admin/payments/${encodeURIComponent(intentId)}`,
  );
}

/**
 * Verify one provider — `POST /api/v1/admin/providers/{id}/verify`.
 * The path id is a PROFILE id (the profile-id space — never the user
 * id); the response is the updated ProviderResponse.
 */
export function verifyProvider(
  providerId: string,
): Promise<BackendResult<ProviderProfileView>> {
  return backendSend(
    "POST",
    `/api/v1/admin/providers/${encodeURIComponent(providerId)}/verify`,
  );
}

/**
 * Suspend one provider — `POST /api/v1/admin/providers/{id}/suspend`
 * (same profile-id space; the response is the updated row).
 */
export function suspendProvider(
  providerId: string,
): Promise<BackendResult<ProviderProfileView>> {
  return backendSend(
    "POST",
    `/api/v1/admin/providers/${encodeURIComponent(providerId)}/suspend`,
  );
}

/**
 * One provider's ledger balance — `GET /api/v1/admin/ledger/providers/
 * {providerId}/balance` → ProviderBalance (the entity's id IS the
 * providerId; availableCents in minor units).
 */
export function getProviderBalance(
  providerId: string,
): Promise<BackendResult<ProviderBalanceView>> {
  return backendGet(
    `/api/v1/admin/ledger/providers/${encodeURIComponent(providerId)}/balance`,
  );
}

/**
 * Credit a provider's ledger from a payment — `POST /api/v1/admin/
 * ledger/providers/{providerId}/credit?paymentIntentId&amountCents`.
 * A QUERY-STRING contract (@RequestParam on the backend — never a
 * JSON body), the same discipline as the batch-2 availability writes.
 */
export function creditProvider(
  providerId: string,
  paymentIntentId: string,
  amountCents: number,
): Promise<BackendResult<ProviderBalanceView>> {
  const params = new URLSearchParams({
    paymentIntentId,
    amountCents: String(amountCents),
  });
  return backendSend(
    "POST",
    `/api/v1/admin/ledger/providers/${encodeURIComponent(providerId)}/credit?${params.toString()}`,
  );
}

/**
 * The administrative dispute resolution — `POST /api/v1/admin/disputes/
 * {id}/resolve {resolution?}`. The BODY IS OPTIONAL: absent = NO_ACTION
 * (the endpoint's own backward-compatible semantics — money never moves
 * implicitly; REFUND_CONSUMER must be named). resolution === null sends
 * NO body, exactly the measured contract.
 */
export function resolveDispute(
  disputeId: string,
  resolution: DisputeResolution | null,
): Promise<BackendResult<DisputeView>> {
  return backendSend(
    "POST",
    `/api/v1/admin/disputes/${encodeURIComponent(disputeId)}/resolve`,
    resolution === null ? undefined : { resolution },
  );
}

/**
 * Append a child location — `POST /api/v1/admin/geo {parentId, nameAr,
 * nameEn?, slug}` (201 + the created GeoNode echo). The parent must
 * exist (404 otherwise); slug conflicts answer 409 in the backend's
 * own words; the slug rides the source @Pattern [a-z0-9-]{2,120}.
 */
export function createGeoLocation(input: {
  parentId: string;
  nameAr: string;
  nameEn: string | null;
  slug: string;
}): Promise<BackendResult<GeoNode>> {
  return backendSend("POST", "/api/v1/admin/geo", {
    parentId: input.parentId,
    nameAr: input.nameAr,
    nameEn: input.nameEn,
    slug: input.slug,
  });
}

/**
 * Rename / re-slug one location — `PATCH /api/v1/admin/geo/{id}
 * {nameAr, nameEn?, slug}` (the level and parent are immutable — the
 * backend's own contract). The response is the updated GeoNode.
 */
export function renameGeoLocation(
  locationId: string,
  input: {
    nameAr: string;
    nameEn: string | null;
    slug: string;
  },
): Promise<BackendResult<GeoNode>> {
  return backendSend(
    "PATCH",
    `/api/v1/admin/geo/${encodeURIComponent(locationId)}`,
    input,
  );
}

/**
 * Soft-delete one childless location — `DELETE /api/v1/admin/geo/{id}`
 * (204). A node WITH children answers 409 (no silent subtree
 * orphaning — the backend's own words).
 */
export function deleteGeoLocation(
  locationId: string,
): Promise<BackendResult<null>> {
  return backendSend(
    "DELETE",
    `/api/v1/admin/geo/${encodeURIComponent(locationId)}`,
  );
}

/**
 * The audited-entity names — `GET /api/v1/admin/revisions/entities`
 * (the Envers @Audited entities, sorted). The revisions read's own
 * entity-name axis.
 */
export function getAuditedEntities(): Promise<BackendResult<string[]>> {
  return backendGet("/api/v1/admin/revisions/entities");
}

/**
 * One entity's revision trail — `GET /api/v1/admin/revisions/
 * {entityName}/{id}` → RevisionEntry rows {revisionNumber, revisedAt,
 * revisionType, entity}. The entity payload is the RAW audited state —
 * rendered verbatim, never recomposed.
 */
export function getRevisions(
  entityName: string,
  entityId: string,
): Promise<BackendResult<RevisionEntryView[]>> {
  return backendGet(
    `/api/v1/admin/revisions/${encodeURIComponent(entityName)}/${encodeURIComponent(entityId)}`,
  );
}
