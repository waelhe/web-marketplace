"use server";

/**
 * Administration-console server actions (the batch-3 spec surface), the
 * repo's verbatim Server-Action pattern (provider/actions.ts family):
 * the framework enforces the boundary (POST-only, Origin/Host CSRF
 * check); every action re-checks the session itself — "render-time
 * gating is not a security boundary" — and the backend's three-layer
 * ADMIN gates remain the authorization authority. A non-admin caller
 * receives the backend's own 403 AUTHZ-001 words verbatim through the
 * action state (the measured honest-failure pattern — the same
 * discipline as the S3-gated photo surface).
 *
 * `refresh()` reruns the server render (the packaged refresh.md:
 * callable inside Server Actions only) — the page re-reads the queue,
 * the rules list and the intent summaries, exactly the ×10 pattern of
 * provider/actions.ts.
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { isUuid } from "@/lib/api/geo";
import type { DisputeResolution } from "@/lib/api/disputes-contract";
import { GEO_SLUG_PATTERN } from "@/lib/api/admin-contract";
import {
  MODERATION_ACTIONS,
  MAX_RESOLUTION_NOTE_LENGTH,
  RULE_CATEGORY_MAX_LENGTH,
  RULE_NAME_MAX_LENGTH,
  USER_ROLES,
  USER_STATUSES,
  type ModerationAction,
  type UserStatusValue,
  type UserRoleValue,
} from "@/lib/api/admin-contract";
import {
  activatePricingRule,
  archiveListing,
  confirmPaymentIntent,
  createGeoLocation,
  createPricingRule,
  creditProvider,
  deactivatePricingRule,
  deleteGeoLocation,
  deletePricingRule,
  pseudonymizeUser,
  purgeUserAuditHistory,
  purgeUserContent,
  refundPayment,
  renameGeoLocation,
  resolveDispute,
  resolveReport,
  setListingPromotion,
  suspendProvider,
  updateUserRole,
  updateUserStatus,
  verifyProvider,
} from "@/lib/api/admin";

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const REAUTH_MESSAGE = "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Parse a nullable fraction (taxRate/discountPct): empty = absent
 * (null); otherwise a finite number within the backend's own [0, 1]
 * Bean Validation bound.
 */
function parseFraction(
  raw: string,
  label: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (raw === "") return { ok: true, value: null };
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    return {
      ok: false,
      message: `${label} كسر بين ٠ و١ (شاملين) — مثال: 0.15 لـ ١٥٪.`,
    };
  }
  return { ok: true, value };
}

/**
 * Resolve one report — POST /admin/reports/{id}/resolve. The action
 * mirrors the backend's own parse order: the action value parses BEFORE
 * any service call (an invalid value never reaches the wire), and the
 * note rides the backend's own 2000-character bound.
 */
export async function resolveReportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const reportId = text(formData, "reportId");
  if (!isUuid(reportId)) {
    return { status: "error", message: "معرّف البلاغ غير صالح." };
  }

  const action = text(formData, "action");
  if (!MODERATION_ACTIONS.includes(action as ModerationAction)) {
    return {
      status: "error",
      message: "إجراء التسوية غير معروف — استبعد البلاغ أو أخفِ المحتوى.",
    };
  }

  const note = text(formData, "note");
  if (note.length > MAX_RESOLUTION_NOTE_LENGTH) {
    return {
      status: "error",
      message: `ملاحظة التسوية حتى ${new Intl.NumberFormat("ar").format(MAX_RESOLUTION_NOTE_LENGTH)} حرف.`,
    };
  }

  const result = await resolveReport(
    reportId,
    action as ModerationAction,
    note === "" ? null : note,
  );
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّرت تسوية البلاغ (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: "حُسم البلاغ — أُغلق في الطابور.",
  };
}

/**
 * Create a pricing rule — POST /pricing/rules (201). The client-side
 * bounds mirror the backend's own Bean Validation (name required ≤200,
 * category ≤100, fractions 0..1) so the common mistakes fail fast with
 * Arabic words; the backend remains the enforcement authority.
 */
export async function createPricingRuleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const name = text(formData, "name");
  if (name === "") {
    return { status: "error", message: "اسم القاعدة مطلوب." };
  }
  if (name.length > RULE_NAME_MAX_LENGTH) {
    return {
      status: "error",
      message: `اسم القاعدة حتى ${new Intl.NumberFormat("ar").format(RULE_NAME_MAX_LENGTH)} حرف.`,
    };
  }

  const category = text(formData, "category");
  if (category.length > RULE_CATEGORY_MAX_LENGTH) {
    return {
      status: "error",
      message: `الفئة حتى ${new Intl.NumberFormat("ar").format(RULE_CATEGORY_MAX_LENGTH)} حرف.`,
    };
  }

  const tax = parseFraction(text(formData, "taxRate"), "نسبة الضريبة");
  if (!tax.ok) return { status: "error", message: tax.message };
  const discount = parseFraction(text(formData, "discountPct"), "نسبة الخصم");
  if (!discount.ok) return { status: "error", message: discount.message };

  const result = await createPricingRule({
    name,
    category: category === "" ? null : category,
    taxRate: tax.value,
    discountPct: discount.value,
  });
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر إنشاء القاعدة (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "أُنشئت القاعدة." };
}

/**
 * Flip one pricing rule's active switch — PUT …/{id}/activate or
 * …/{id}/deactivate. The updated row rides the response; the page's
 * refreshed list shows the new state.
 */
export async function setPricingRuleActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const ruleId = text(formData, "ruleId");
  if (!isUuid(ruleId)) {
    return { status: "error", message: "معرّف القاعدة غير صالح." };
  }
  const activate = text(formData, "activate") === "true";

  const result = activate
    ? await activatePricingRule(ruleId)
    : await deactivatePricingRule(ruleId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر ${activate ? "تفعيل" : "تعطيل"} القاعدة (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: activate ? "فُعّلت القاعدة." : "عُطّلت القاعدة.",
  };
}

/** Delete one pricing rule — DELETE …/{id} (204). */
export async function deletePricingRuleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const ruleId = text(formData, "ruleId");
  if (!isUuid(ruleId)) {
    return { status: "error", message: "معرّف القاعدة غير صالح." };
  }

  const result = await deletePricingRule(ruleId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر حذف القاعدة (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "حُذفت القاعدة." };
}

/**
 * Confirm a payment intent — POST /payments/intents/{id}/confirm
 * {externalId} (the administration's completion command). The response
 * carries the full intent row; its final state joins the success words.
 */
export async function confirmPaymentIntentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const intentId = text(formData, "intentId");
  if (!isUuid(intentId)) {
    return { status: "error", message: "معرّف قصد الدفع غير صالح." };
  }
  const externalId = text(formData, "externalId");
  if (externalId === "") {
    return { status: "error", message: "المعرّف الخارجي لبوابة الدفع مطلوب." };
  }

  const result = await confirmPaymentIntent(intentId, externalId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تأكيد القصد (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: `أُكّد القصد — حالته الآن ${result.data.status}.`,
  };
}

/**
 * Refund a payment — POST /payments/{paymentId}/refund. The path id is
 * a PAYMENT-row id (not the intent id) — stated on the form; the
 * response carries the refunded payment row verbatim.
 */
export async function refundPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const paymentId = text(formData, "paymentId");
  if (!isUuid(paymentId)) {
    return { status: "error", message: "معرّف الدفعة غير صالح." };
  }

  const result = await refundPayment(paymentId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر الاسترداد (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: `استُردت الدفعة (${new Intl.NumberFormat("ar").format(result.data.amountCents)} وحدة صغرى) — حالتها ${result.data.status}.`,
  };
}

/* ------------------------------------------------------------------ */
/* Batch-4 — the administration console II actions (the batch-4      */
/* spec). The same verbatim Server-Action pattern: session re-check, */
/* backendSend through the official channel, the backend's problem   */
/* words verbatim, refresh() — the ADMIN gates stay the backend's.   */
/* ------------------------------------------------------------------ */

/**
 * Parse a datetime-local value as a UTC instant (the repo's stated
 * convention — the same helper shape as provider/bookings/actions.ts).
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

/** Change one user's role — PUT /admin/users/{id}/role (source enum). */
export async function updateUserRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const userId = text(formData, "userId");
  if (!isUuid(userId)) {
    return { status: "error", message: "معرّف المستخدم غير صالح." };
  }
  const role = text(formData, "role");
  if (!USER_ROLES.includes(role as UserRoleValue)) {
    return { status: "error", message: "الدور غير معروف." };
  }

  const result = await updateUserRole(userId, role as UserRoleValue);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تغيير الدور (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: `غُيّر دور المستخدم إلى ${role}.` };
}

/** Disable/enable one account — PUT /admin/users/{id}/status. */
export async function updateUserStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const userId = text(formData, "userId");
  if (!isUuid(userId)) {
    return { status: "error", message: "معرّف المستخدم غير صالح." };
  }
  const status = text(formData, "status");
  if (!USER_STATUSES.includes(status as UserStatusValue)) {
    return { status: "error", message: "الحالة يجب أن تكون DISABLED أو ENABLED." };
  }
  const reason = text(formData, "reason");
  if (reason === "") {
    return { status: "error", message: "سبب تغيير الحالة مطلوب." };
  }

  const result = await updateUserStatus(
    userId,
    status as UserStatusValue,
    reason,
  );
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تغيير حالة الحساب (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: status === "DISABLED" ? "عُطّل الحساب." : "فُعّل الحساب.",
  };
}

/** One-way account pseudonymization — POST /admin/users/{id}/pseudonymize. */
export async function pseudonymizeUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const userId = text(formData, "userId");
  if (!isUuid(userId)) {
    return { status: "error", message: "معرّف المستخدم غير صالح." };
  }
  const reason = text(formData, "reason");
  if (reason === "") {
    return { status: "error", message: "سبب التجنّي مطلوب." };
  }

  const result = await pseudonymizeUser(userId, reason);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تجنّي الحساب (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "جُنّي الحساب (عملية ذات اتجاه واحد)." };
}

/** The free-text content purge — POST /admin/users/{id}/purge-content. */
export async function purgeUserContentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const userId = text(formData, "userId");
  if (!isUuid(userId)) {
    return { status: "error", message: "معرّف المستخدم غير صالح." };
  }
  const reason = text(formData, "reason");
  if (reason === "") {
    return { status: "error", message: "سبب التطهير مطلوب." };
  }

  const result = await purgeUserContent(userId, reason);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تطهير المحتوى (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: `طُهّر المحتوى — ${new Intl.NumberFormat("ar").format(result.data.purgedRows)} صف محرّر.`,
  };
}

/** The audit-identity purge — POST /admin/users/{id}/purge-audit-history. */
export async function purgeUserAuditHistoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const userId = text(formData, "userId");
  if (!isUuid(userId)) {
    return { status: "error", message: "معرّف المستخدم غير صالح." };
  }
  const reason = text(formData, "reason");
  if (reason === "") {
    return { status: "error", message: "سبب التطهير مطلوب." };
  }

  const result = await purgeUserAuditHistory(userId, reason);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تطهير سجل التدقيق (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: `طُهّر سجل التدقيق — ${new Intl.NumberFormat("ar").format(result.data.scrubbedRows)} صف ومُسحت ${new Intl.NumberFormat("ar").format(result.data.usersAudRowsDeleted)} صف من سجل المستخدم.`,
  };
}

/** Archive one listing administratively — POST /admin/listings/{id}/archive. */
export async function archiveListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const listingId = text(formData, "listingId");
  if (!isUuid(listingId)) {
    return { status: "error", message: "معرّف الإعلان غير صالح." };
  }

  const result = await archiveListing(listingId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر أرشفة الإعلان (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: `أُرشف الإعلان «${result.data.title}» — حالته الآن ${result.data.status}.`,
  };
}

/**
 * Set (or clear) one listing's L37 boost window — PUT
 * /admin/listings/{id}/promotion. An EMPTY until field CLEARS the boost
 * (the backend's own PUT semantics — the documented admin exit).
 */
export async function setListingPromotionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const listingId = text(formData, "listingId");
  if (!isUuid(listingId)) {
    return { status: "error", message: "معرّف الإعلان غير صالح." };
  }
  const rawUntil = text(formData, "until");
  let until: string | null = null;
  if (rawUntil !== "") {
    const parsed = parseUtcInstant(rawUntil, "نهاية نافذة الترويج");
    if (!parsed.ok) return { status: "error", message: parsed.message };
    until = parsed.iso;
  }

  const result = await setListingPromotion(listingId, until);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر ضبط الترويج (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message:
      result.data.promotedUntil === null
        ? "مُسح ترويج الإعلان."
        : `ضُبط ترويج الإعلان حتى ${result.data.promotedUntil}.`,
  };
}

/** Verify one provider — POST /admin/providers/{id}/verify. */
export async function verifyProviderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const providerId = text(formData, "providerId");
  if (!isUuid(providerId)) {
    return { status: "error", message: "معرّف المزوّد غير صالح." };
  }

  const result = await verifyProvider(providerId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر توثيق المزوّد (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: `وُثّق المزوّد «${result.data.displayName}» — حالته ${result.data.status}.`,
  };
}

/** Suspend one provider — POST /admin/providers/{id}/suspend. */
export async function suspendProviderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const providerId = text(formData, "providerId");
  if (!isUuid(providerId)) {
    return { status: "error", message: "معرّف المزوّد غير صالح." };
  }

  const result = await suspendProvider(providerId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تعليق المزوّد (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: `عُلّق المزوّد «${result.data.displayName}» — حالته ${result.data.status}.`,
  };
}

/**
 * Credit a provider's ledger — POST /admin/ledger/providers/{id}/credit?
 * paymentIntentId&amountCents (the QUERY-STRING contract — no JSON body,
 * the batch-2 @RequestParam discipline).
 */
export async function creditProviderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const providerId = text(formData, "providerId");
  if (!isUuid(providerId)) {
    return { status: "error", message: "معرّف المزوّد غير صالح." };
  }
  const paymentIntentId = text(formData, "paymentIntentId");
  if (!isUuid(paymentIntentId)) {
    return { status: "error", message: "معرّف قصد الدفع غير صالح." };
  }
  const rawAmount = text(formData, "amountCents");
  const amountCents = Number.parseInt(rawAmount, 10);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return {
      status: "error",
      message: "المبلغ وحدات صغرى صحيحة أكبر من صفر.",
    };
  }

  const result = await creditProvider(providerId, paymentIntentId, amountCents);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر الإيداع (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: `أُودع المبلغ — الرصيد المتاح الآن ${new Intl.NumberFormat("ar").format(result.data.availableCents)} وحدة صغرى.`,
  };
}

/**
 * The administrative dispute resolution — POST /admin/disputes/{id}/
 * resolve. The BODY IS OPTIONAL: the form's explicit «بلا قرار» choice
 * sends NO body (the backend's own NO_ACTION semantics — money never
 * moves implicitly).
 */
export async function resolveDisputeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const disputeId = text(formData, "disputeId");
  if (!isUuid(disputeId)) {
    return { status: "error", message: "معرّف النزاع غير صالح." };
  }
  const resolution = text(formData, "resolution");
  if (
    resolution !== "NO_BODY" &&
    resolution !== "REFUND_CONSUMER" &&
    resolution !== "RELEASE_PROVIDER" &&
    resolution !== "NO_ACTION"
  ) {
    return { status: "error", message: "قرار التسوية غير معروف." };
  }

  const result = await resolveDispute(
    disputeId,
    resolution === "NO_BODY" ? null : (resolution as DisputeResolution),
  );
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّرت تسوية النزاع (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: `حُسم النزاع — حالته ${result.data.status}${
      result.data.resolution ? ` (القرار ${result.data.resolution})` : ""
    }.`,
  };
}

/** Append a child location — POST /admin/geo (201 + the node echo). */
export async function createGeoLocationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const parentId = text(formData, "parentId");
  if (!isUuid(parentId)) {
    return { status: "error", message: "معرّف الأصل غير صالح." };
  }
  const nameAr = text(formData, "nameAr");
  if (nameAr === "") {
    return { status: "error", message: "الاسم العربي مطلوب." };
  }
  const slug = text(formData, "slug");
  if (!new RegExp(`^${GEO_SLUG_PATTERN}$`).test(slug)) {
    return {
      status: "error",
      message: "الslug من ٢ إلى ١٢٠ حرفًا لاتينيًا صغيرًا أو رقمًا أو شرطة.",
    };
  }
  const nameEn = text(formData, "nameEn");

  const result = await createGeoLocation({
    parentId,
    nameAr,
    nameEn: nameEn === "" ? null : nameEn,
    slug,
  });
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر إنشاء الموقع (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: `أُنشئ الموقع «${result.data.nameAr}» (المستوى ${result.data.level}).`,
  };
}

/** Rename / re-slug one location — PATCH /admin/geo/{id}. */
export async function renameGeoLocationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const locationId = text(formData, "locationId");
  if (!isUuid(locationId)) {
    return { status: "error", message: "معرّف الموقع غير صالح." };
  }
  const nameAr = text(formData, "nameAr");
  if (nameAr === "") {
    return { status: "error", message: "الاسم العربي مطلوب." };
  }
  const slug = text(formData, "slug");
  if (!new RegExp(`^${GEO_SLUG_PATTERN}$`).test(slug)) {
    return {
      status: "error",
      message: "الslug من ٢ إلى ١٢٠ حرفًا لاتينيًا صغيرًا أو رقمًا أو شرطة.",
    };
  }
  const nameEn = text(formData, "nameEn");

  const result = await renameGeoLocation(locationId, {
    nameAr,
    nameEn: nameEn === "" ? null : nameEn,
    slug,
  });
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّرت إعادة التسمية (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: `أُعيدت تسمية الموقع إلى «${result.data.nameAr}».`,
  };
}

/** Soft-delete one childless location — DELETE /admin/geo/{id} (204). */
export async function deleteGeoLocationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const locationId = text(formData, "locationId");
  if (!isUuid(locationId)) {
    return { status: "error", message: "معرّف الموقع غير صالح." };
  }

  const result = await deleteGeoLocation(locationId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر حذف الموقع (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "حُذف الموقع." };
}
