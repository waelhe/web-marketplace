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
import {
  MODERATION_ACTIONS,
  MAX_RESOLUTION_NOTE_LENGTH,
  RULE_CATEGORY_MAX_LENGTH,
  RULE_NAME_MAX_LENGTH,
  type ModerationAction,
} from "@/lib/api/admin-contract";
import {
  activatePricingRule,
  confirmPaymentIntent,
  createPricingRule,
  deactivatePricingRule,
  deletePricingRule,
  refundPayment,
  resolveReport,
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
