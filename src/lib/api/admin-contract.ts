/**
 * Administration-console contract types and vocabulary — the batch-3
 * spec (2026-09-25-administration-console-design.md): the moderation
 * report queue (L45's administrative counterpart to the batch-2 report
 * affordances), the pricing-rules manager (the program's named batch-3
 * item) and the payments administration (confirm + refund).
 *
 * Pure types and constants only — client-safe (no next/headers): the
 * authenticated data CHANNEL lives in admin.ts (same split as
 * provider-contract.ts vs provider.ts).
 *
 * Every shape here is measured from the backend source and live staging
 * probes (app-java-v3, 2026-09-25):
 * - ModerationAdminController (three-layer ADMIN gate: the /api/v1/admin/**
 *   SecurityConfig rule + the class @PreAuthorize + the service gate):
 *   `GET /admin/reports?status=` on the FIFO key (createdAt ASC, id ASC)
 *   with the OPEN/RESOLVED/DISMISSED axis (ReportStatus.java), and
 *   `POST /admin/reports/{id}/resolve {action, note?}` where action
 *   parses BEFORE any service call — an invalid value answers the house
 *   400 listing DISMISS|HIDE_CONTENT (ModerationAction.java).
 * - PricingRuleController — the WHOLE class is @PreAuthorize
 *   hasRole('ADMIN') (the list read included); CreateRuleRequest: name
 *   @NotBlank ≤200, category ≤100 nullable, taxRate/discountPct
 *   @Decimal[Min,Max](0..1) nullable; DELETE answers 204.
 * - AdminController's payments reads return PaymentSummary rows whose
 *   `id` IS the payment-intent id (PaymentsService.toPaymentSummaryFrom
 *   View maps PaymentIntentSummaryView.getId) — refundedAmountCents
 *   included; confirmIntent/refundPayment are service-level
 *   hasRole('ADMIN') (PaymentsService:343/385/391).
 * - The measured NON-ADMIN experience (qa-tester token, live): the reads
 *   answer 403 AUTHZ-001 («Access denied» / userMessage «You are not
 *   allowed to perform this action.» on /pricing/rules); the console
 *   renders those words verbatim — the backend is the sole authority
 *   (roles are NOT carried by /me — measured, Task 24).
 */

import type { ContentReportView } from "./community-contract";

/** Re-exported read model — the queue rows are the same L45 view. */
export type ModerationReportView = ContentReportView;

/** ReportStatus.java — the queue's own one-directional state machine. */
export const REPORT_STATUSES = ["OPEN", "RESOLVED", "DISMISSED"] as const;
export type ReportStatusFilter = (typeof REPORT_STATUSES)[number];

/** Arabic UI labels of the MEASURED queue-status vocabulary. */
export const REPORT_STATUS_LABELS: Record<ReportStatusFilter, string> = {
  OPEN: "مفتوح",
  RESOLVED: "محسوم",
  DISMISSED: "مستبعد",
};

/**
 * ModerationAction.java — the resolve command's own vocabulary. The
 * backend parses it BEFORE any service call; an invalid value answers
 * the house 400 listing these values.
 */
export const MODERATION_ACTIONS = ["DISMISS", "HIDE_CONTENT"] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

/** Arabic UI labels of the MEASURED resolve-action vocabulary. */
export const MODERATION_ACTION_LABELS: Record<ModerationAction, string> = {
  DISMISS: "استبعاد البلاغ (لا إجراء على المحتوى)",
  HIDE_CONTENT: "إخفاء المحتوى وإغلاق البلاغ",
};

/** The administrative note bound (ResolveReportRequest, maxLength 2000). */
export const MAX_RESOLUTION_NOTE_LENGTH = 2000;

/** The queue read's page size (the spec's battery window). */
export const MODERATION_QUEUE_PAGE_SIZE = 20;

/**
 * PricingRuleResponse (marketplace-pricing) — one global pricing rule.
 * `active` is the rule's own switch (activate/deactivate are separate
 * PUT commands); taxRate/discountPct are 0..1 fractions (BigDecimal).
 */
export interface PricingRuleView {
  id: string;
  name: string;
  category: string | null;
  taxRate: number | null;
  discountPct: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** CreateRuleRequest (PricingRuleController) — the measured bounds. */
export const RULE_NAME_MAX_LENGTH = 200;
export const RULE_CATEGORY_MAX_LENGTH = 100;

/**
 * PaymentSummary (shared-api, mapped from PaymentIntentSummaryView) —
 * the administration's intent list row. `id` IS the payment-intent id
 * (measured mapping); refundedAmountCents aggregates the refunds.
 */
export interface PaymentSummaryView {
  id: string;
  bookingId: string;
  consumerId: string;
  amountCents: number;
  currency: string;
  status: string;
  refundedAmountCents: number | null;
  createdAt: string;
  updatedAt: string;
}

/** The admin payments list's page size (the spec's battery window). */
export const ADMIN_PAYMENTS_PAGE_SIZE = 20;

/**
 * PaymentResponse (marketplace-payments) — the refund command's own
 * answer: the PAYMENT row (id, amount, status, timestamps). This id is
 * the only contract surface where a payment-row id ever appears.
 */
export interface PaymentRefundView {
  id: string;
  amountCents: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Batch-4 — the administration console II (the remaining 21 admin    */
/* operations: users ×6, bookings ×1, listings ×2 + promotion ×1,     */
/* the single-intent read, providers verify/suspend ×2, ledger ×2,    */
/* dispute resolve ×1, geo ×3, revisions ×2). Same discipline: every  */
/* shape and vocabulary below is pinned from the backend source       */
/* (app-java-v3, 2026-09-25) — see the batch-4 spec.                  */
/* ------------------------------------------------------------------ */

/**
 * UserSummary (shared-api) — one row of the administration's user
 * list. `role` rides the backend's own UserRole vocabulary (the
 * ChangeRoleRequest contract passes it straight to
 * UserRole.valueOf — the console's select pins the source enum).
 */
export interface UserSummaryView {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

/** The admin user list's page size (the spec's battery window). */
export const ADMIN_USERS_PAGE_SIZE = 20;

/** UserRole.java — the role command's own three-value vocabulary. */
export const USER_ROLES = ["CONSUMER", "PROVIDER", "ADMIN"] as const;
export type UserRoleValue = (typeof USER_ROLES)[number];

/** Arabic UI labels of the MEASURED role vocabulary. */
export const USER_ROLE_LABELS: Record<UserRoleValue, string> = {
  CONSUMER: "مستهلك",
  PROVIDER: "مزوّد",
  ADMIN: "مدير",
};

/**
 * ChangeStatusRequest (AdminController) — the status command's own
 * vocabulary, pinned by @Pattern at the request boundary
 * (DISABLED|ENABLED); the reason is part of the contract (it rides
 * the identity module's structured audit line).
 */
export const USER_STATUSES = ["DISABLED", "ENABLED"] as const;
export type UserStatusValue = (typeof USER_STATUSES)[number];

/** Arabic UI labels of the MEASURED status vocabulary. */
export const USER_STATUS_LABELS: Record<UserStatusValue, string> = {
  DISABLED: "تعطيل الحساب",
  ENABLED: "تفعيل الحساب",
};

/**
 * BookingSummary (shared-api) — one row of the administration's
 * ALL-bookings read. Carries BOTH participant ids (the admin view —
 * the consumer BookingResponse never does, measured Task 23).
 */
export interface BookingSummaryView {
  id: string;
  consumerId: string;
  providerId: string;
  listingId: string;
  status: string;
  priceCents: number | null;
  currency: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

/** The admin bookings list's page size (the spec's battery window). */
export const ADMIN_BOOKINGS_PAGE_SIZE = 20;

/**
 * ProviderListingSummary (shared-api) — one row of the
 * administration's ALL-listings read. The only contract read whose
 * rows expose `providerId` (AdminController-only — measured Task 26),
 * the id source for the verify/suspend commands.
 */
export interface ProviderListingSummaryView {
  id: string;
  title: string;
  category: string;
  price: number;
  providerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** The admin listings list's page size (the spec's battery window). */
export const ADMIN_LISTINGS_PAGE_SIZE = 20;

/**
 * ListingPromotion (shared-api) — the L37 boost window's state after
 * the PUT. `promotedUntil` is null when the boost is CLEARED (the
 * same nullable-Instant contract the entity column carries).
 */
export interface ListingPromotionView {
  id: string;
  promotedUntil: string | null;
}

/**
 * ProviderBalance (marketplace-ledger) — the provider's money state.
 * The entity's id IS the providerId (getId is redefined); the balance
 * is availableCents in MINOR units.
 */
export interface ProviderBalanceView {
  id: string;
  availableCents: number;
  createdAt: string;
  updatedAt: string;
}

/** ContentPurgeResponse (AdminController) — the free-text purge count. */
export interface ContentPurgeResult {
  purgedRows: number;
}

/** AuditPurgeResponse (AdminController) — the audit purge's two counts. */
export interface AuditPurgeResult {
  scrubbedRows: number;
  usersAudRowsDeleted: number;
}

/**
 * RevisionEntry (RevisionService) — one Envers revision row. `entity`
 * is the RAW audited entity state (an arbitrary JSON object — never
 * recomposed or reshaped client-side).
 */
export interface RevisionEntryView {
  revisionNumber: number;
  revisedAt: string;
  revisionType: string;
  entity: Record<string, unknown>;
}

/**
 * GeoAdminController's slug bound — @Pattern on BOTH the create and
 * rename bodies (2-120 lowercase latin letters, digits or dashes).
 */
export const GEO_SLUG_PATTERN = "[a-z0-9-]{2,120}";
