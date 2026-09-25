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
