"use server";

/**
 * The ads server actions (W5 — yelp-level plan §5/G24-G26, #496): the
 * provider's own campaign writes on the official mutating-data path (the
 * repo's literal pattern: the framework enforces the POST-only +
 * Origin/Host boundary; every action re-checks the session; the backend's
 * resource-server chain remains the authorization authority — the
 * PROVIDER role gate, the listing's ownership, the ACTIVE-only law, the
 * single-promotion law, the endsAt rule). Expected failures return as
 * ActionState data with the backend's own words surfaced verbatim —
 * never crashes, never localized-away gates.
 *
 * The money mirrors (HTML validation = the backend's own bean bounds,
 * measured live 2026-10-03): the budget strictly positive in whole
 * ر.س (fractional halalas would round and lie), the prices
 * non-negative (zero honestly makes that event free), the currency the
 * house SAR (a selectable vocabulary is an owner gate), endsAt optional
 * and strictly future (the booking form's own datetime-local → UTC
 * instant convention).
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { createAdCampaign, pauseAdCampaign, resumeAdCampaign } from "@/lib/api/ads";
import { isUuid } from "@/lib/api/geo";

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: "listingId" | "budget" | "clickPrice" | "impressionPrice" | "endsAt" }
  | { status: "success"; message: string };

const REAUTH_MESSAGE = "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Whole major units → integer cents (the lossless house conversion). */
function majorToCents(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const major = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(major)) return null;
  return major * 100;
}

/**
 * Start a paid promotion — POST /providers/me/ads/campaigns. The form
 * picks one of MY ACTIVE listings (the picker is a convenience — the
 * backend re-gates ownership and ACTIVE); success refreshes the board's
 * server render so the new campaign's frozen money state renders from
 * the contract alone.
 */
export async function createAdCampaignAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const listingId = text(formData, "listingId");
  const budgetCents = majorToCents(text(formData, "budget"));
  const clickPriceCents = majorToCents(text(formData, "clickPrice"));
  const impressionPriceCents = majorToCents(text(formData, "impressionPrice"));
  const endsAtLocal = text(formData, "endsAt");

  if (!isUuid(listingId)) {
    return { status: "error", field: "listingId", message: "اختر إعلانًا من قائمتك النشطة." };
  }
  if (budgetCents === null || budgetCents <= 0) {
    return {
      status: "error",
      field: "budget",
      message: "الميزانية مطلوبة بالريالات — رقم موجب كامل (تُحوَّل قروشًا خلف الكواليس).",
    };
  }
  if (clickPriceCents === null || clickPriceCents < 0) {
    return {
      status: "error",
      field: "clickPrice",
      message: "سعر النقرة بالريالات — رقم كامل غير سالب (الصفر يجعل النقر مجانيًا بصدق).",
    };
  }
  if (impressionPriceCents === null || impressionPriceCents < 0) {
    return {
      status: "error",
      field: "impressionPrice",
      message: "سعر الظهور بالريالات — رقم كامل غير سالب (الصفر يجعل الظهور مجانيًا بصدق).",
    };
  }

  // The booking form's own stated convention: datetime-local is
  // interpreted as UTC and travels as an ISO instant.
  let endsAt: string | undefined;
  if (endsAtLocal.length > 0) {
    const instant = new Date(`${endsAtLocal}:00Z`);
    if (Number.isNaN(instant.getTime()) || instant.getTime() <= Date.now()) {
      return {
        status: "error",
        field: "endsAt",
        message: "تاريخ الانتهاء اختياري — وإن كتبته فيجب أن يكون مستقبليًا صراحةً.",
      };
    }
    endsAt = instant.toISOString();
  }

  const result = await createAdCampaign({
    listingId,
    budgetCents,
    clickPriceCents,
    impressionPriceCents,
    currency: "SAR",
    ...(endsAt !== undefined ? { endsAt } : {}),
  });
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر بدء الترويج (رمز ${result.status}).`),
    };
  }

  refresh();
  return {
    status: "success",
    message: "انطلقت الحملة — إعلانك يتصدر النتائج المدفوعة الآن.",
  };
}

/**
 * The owner's hold — POST …/campaigns/{id}/pause (the listing loses the
 * paid boost NOW; the paused gap never bills). The backend's own words
 * ride every refusal.
 */
export async function pauseAdCampaignAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const campaignId = text(formData, "campaignId");
  if (!isUuid(campaignId)) {
    return { status: "error", message: "معرّف الحملة غير صالح." };
  }

  const result = await pauseAdCampaign(campaignId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر إيقاف الحملة (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "أوقفت الحملة — انقطعت الفوترة ولن تُحسب أيام الإيقاف." };
}

/**
 * Lift the hold — POST …/campaigns/{id}/resume (the boost returns; the
 * billing starts from the resume day). The backend's own gates teach
 * with their own words: the expired duration and the second live
 * campaign both answer 409.
 */
export async function resumeAdCampaignAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const campaignId = text(formData, "campaignId");
  if (!isUuid(campaignId)) {
    return { status: "error", message: "معرّف الحملة غير صالح." };
  }

  const result = await resumeAdCampaign(campaignId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر استئناف الحملة (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "استؤنفت الحملة — عاد الترويج يتصدر من اليوم." };
}
