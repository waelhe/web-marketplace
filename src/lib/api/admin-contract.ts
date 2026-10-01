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
 * The residency-verification queue (the lifecycle's review surface —
 * NeighborhoodVerificationAdminController, PR #483): the same
 * administrative read shape as the moderation queue, applied to the
 * membership ledger. The optional state axis filters the MEASURED
 * MembershipVerificationState vocabulary; absent = the whole ACTIVE
 * ledger (left memberships are hidden by the read's own filter). The
 * queue drains on the state's own clock (updatedAt ASC, id ASC).
 */
export const VERIFICATION_QUEUE_STATES = [
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const;
export type VerificationQueueState = (typeof VERIFICATION_QUEUE_STATES)[number];

/** Arabic UI labels of the MEASURED verification vocabulary (admin side). */
export const VERIFICATION_QUEUE_STATE_LABELS: Record<VerificationQueueState, string> = {
  UNVERIFIED: "غير موثّق",
  PENDING: "قيد المراجعة",
  VERIFIED: "جار موثّق",
  REJECTED: "مرفوض",
};

/**
 * VerificationDecision — the review command's own vocabulary. The
 * backend parses it BEFORE any service call; an invalid value answers
 * the house 400 listing these values.
 */
export const VERIFICATION_DECISIONS = ["APPROVE", "REJECT"] as const;
export type VerificationDecision = (typeof VERIFICATION_DECISIONS)[number];

/** Arabic UI labels of the MEASURED review-decision vocabulary. */
export const VERIFICATION_DECISION_LABELS: Record<VerificationDecision, string> = {
  APPROVE: "قبول التوثيق (علامة «جار موثق»)",
  REJECT: "رفض التوثيق (تعطيل النشر والرسائل الجديدة)",
};

/** The verification queue read's page size (the moderation window). */
export const VERIFICATION_QUEUE_PAGE_SIZE = 20;

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

/**
 * SystemSettingResponse (AdminController, W0 yelp plan §4.6) — one
 * runtime control row: key, its native JSON value, description, and the
 * who/when bookkeeping. The value rides as the RAW JSON node the
 * backend served (an arbitrary JSON value — never reshaped here).
 */
export interface SystemSettingView {
  key: string;
  value: unknown;
  description: string | null;
  version: number;
  updatedBy: string | null;
  updatedAt: string;
}

/** The owner's reviews-mode switch key (W0's first seeded control). */
export const REVIEWS_MODE_SETTING_KEY = "reviews.mode";

/** The legal reviews-mode values (the W0 contract's own vocabulary). */
export const REVIEWS_MODE_VALUES = [
  "VERIFIED_ONLY",
  "OPEN",
  "HYBRID",
] as const;

export type ReviewsModeSetting = (typeof REVIEWS_MODE_VALUES)[number];

/** Arabic labels of the reviews-mode values (the switch's own display). */
export const REVIEWS_MODE_SETTING_LABELS: Record<ReviewsModeSetting, string> = {
  VERIFIED_ONLY: "الموثّقة فقط (الوضع الراهن)",
  OPEN: "العامة المفتوحة",
  HYBRID: "الهجين — الاثنان معًا",
};

/**
 * ModerationQueueItem (ReviewsService, W1 yelp plan §4.5) — one queued
 * review with its internal fraud signals: the reviewer and provider ids
 * (the admin surface renders them as opaque UUIDs — identity seams own
 * resolution), the rating/comment/origin/listing target, the drain
 * clock (createdAt — oldest first), and the recorded abuse flags
 * (BURST_ON_PROVIDER / NEW_ACCOUNT_ACTIVITY / TEXT_SIMILARITY).
 */
export interface ReviewModerationItemView {
  id: string;
  reviewerId: string;
  providerId: string;
  rating: number;
  comment: string | null;
  origin: "BOOKING" | "ORGANIC";
  listingId: string | null;
  createdAt: string;
  flags: string[];
}

/** The moderation queue's status axis (the backend's own vocabulary). */
export const REVIEW_MODERATION_STATES = [
  "PENDING_REVIEW",
  "PUBLISHED",
  "HIDDEN_BY_MODERATOR",
] as const;

export type ReviewModerationState = (typeof REVIEW_MODERATION_STATES)[number];

/** Arabic labels of the moderation states. */
export const REVIEW_MODERATION_STATE_LABELS: Record<
  ReviewModerationState,
  string
> = {
  PENDING_REVIEW: "قيد المراجعة",
  PUBLISHED: "منشورة",
  HIDDEN_BY_MODERATOR: "مخفية بإشراف",
};

/** The moderation decision (APPROVE|REJECT — the contract's own axis). */
export const REVIEW_MODERATION_DECISIONS = ["APPROVE", "REJECT"] as const;

export type ReviewModerationDecision =
  (typeof REVIEW_MODERATION_DECISIONS)[number];

/** Arabic labels of the moderation decisions. */
export const REVIEW_MODERATION_DECISION_LABELS: Record<
  ReviewModerationDecision,
  string
> = {
  APPROVE: "قبول — انشر المراجعة",
  REJECT: "رفض — أخفها",
};

/** The reviews moderation queue's page size (the drain-clock surface). */
export const REVIEW_MODERATION_PAGE_SIZE = 20;

/** Arabic labels of the recorded abuse-signal flags (the queue's evidence). */
export const REVIEW_FLAG_LABELS: Record<string, string> = {
  BURST_ON_PROVIDER: "دفقة مراجعات على مزوّد واحد",
  NEW_ACCOUNT_ACTIVITY: "حساب حديث النشاط",
  TEXT_SIMILARITY: "تشابه نصي مع مراجعة أخرى للمُرقّم نفسه",
};
