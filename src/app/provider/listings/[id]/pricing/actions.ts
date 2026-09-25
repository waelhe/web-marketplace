"use server";

/**
 * Listing price-calendar server actions (L26 — the batch-1 spec §1
 * surface), the repo's verbatim Server-Action pattern (provider/actions.
 * ts family): the framework enforces the boundary (POST-only,
 * Origin/Host CSRF check); every action re-checks the session itself —
 * "render-time gating is not a security boundary" — and the backend's
 * resource-server chain remains the authorization authority (the class
 * role gate + per-listing ownership: 403 foreign, 404 unknown).
 *
 * Client-side validation mirrors the backend's own bean/entity gates so
 * the common mistakes fail fast with Arabic words — the backend remains
 * the enforcement authority (its problem+json words surface verbatim:
 * the 409 overlap teaching, the (0,10] multiplier bounds, the positive
 * [from, to) span).
 *
 * `refresh()` reruns the server render (the packaged refresh.md: callable
 * inside Server Actions only) — the page re-reads the whole calendar,
 * exactly the ×10 pattern of provider/actions.ts.
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { isUuid } from "@/lib/api/geo";
import {
  addSeasonalRate,
  deleteSeasonalRate,
  deleteWeekendRule,
  updateSeasonalRate,
  upsertWeekendRule,
} from "@/lib/api/pricing";
import { WEEKEND_MULTIPLIER_MAX } from "@/lib/api/pricing-contract";

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
 * Parse a seasonal-range form: two date inputs (the URL/HTML plain-date
 * form — the backend takes LocalDate "YYYY-MM-DD" verbatim) + a price in
 * MAJOR units (the human-facing input) converted to the backend's MINOR
 * units (priceCents — the same mapping parseListingForm uses).
 */
function parseSeasonalForm(
  formData: FormData,
): { ok: true; input: { fromDate: string; toDate: string; priceCents: number } } | { ok: false; message: string } {
  const fromDate = text(formData, "fromDate");
  const toDate = text(formData, "toDate");
  const priceMajor = text(formData, "price");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    return { ok: false, message: "التاريخان مطلوبان بصيغة YYYY-MM-DD." };
  }
  if (fromDate >= toDate) {
    // The entity's own gate: "a positive [from, to) span" — a shared or
    // inverted boundary is an empty/invalid range.
    return {
      ok: false,
      message: "بداية النطاق يجب أن تسبق نهايته — الطرف الثاني غير شامل.",
    };
  }
  const price = Number.parseFloat(priceMajor);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, message: "السعر مطلوب ولا يمكن أن يكون سالباً." };
  }
  return {
    ok: true,
    input: { fromDate, toDate, priceCents: Math.round(price * 100) },
  };
}

/**
 * Upsert the weekend rule — PUT …/calendar/weekend-rule. The multiplier
 * applies to Saturday and Sunday nights, bounds (0, 10] at scale 3 (the
 * backend's Bean Validation + V41 — its own words teach the boundary).
 */
export async function upsertWeekendRuleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const listingId = text(formData, "listingId");
  if (!isUuid(listingId)) {
    return { status: "error", message: "معرّف الإعلان غير صالح." };
  }

  const multiplierRaw = text(formData, "multiplier");
  const multiplier = Number.parseFloat(multiplierRaw);
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > WEEKEND_MULTIPLIER_MAX) {
    return {
      status: "error",
      message: "المضاعف بين ٠ (غير شامل) و١٠ (شامل) — مثال: 1.2 لزيادة ٢٠٪ نهاية الأسبوع.",
    };
  }
  const scale = multiplierRaw.split(".")[1]?.length ?? 0;
  if (scale > 3) {
    return { status: "error", message: "المضاعف حتى ٣ خانات عشرية (دقة V41)." };
  }

  const result = await upsertWeekendRule(listingId, multiplier);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر حفظ قاعدة نهاية الأسبوع (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "حُفظ مضاعف نهاية الأسبوع." };
}

/** Remove the weekend rule — DELETE …/calendar/weekend-rule (204). */
export async function deleteWeekendRuleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const listingId = text(formData, "listingId");
  if (!isUuid(listingId)) {
    return { status: "error", message: "معرّف الإعلان غير صالح." };
  }

  const result = await deleteWeekendRule(listingId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر حذف قاعدة نهاية الأسبوع (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "أُزيلت القاعدة — نهاية الأسبوع بالسعر الأساس." };
}

/**
 * Add a seasonal range — POST …/calendar/seasonal-rates (201). A real
 * overlap with a sibling answers 409 with the backend's own words;
 * adjacent boundary-sharing ranges are legal (open intervals).
 */
export async function addSeasonalRateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const listingId = text(formData, "listingId");
  if (!isUuid(listingId)) {
    return { status: "error", message: "معرّف الإعلان غير صالح." };
  }

  const parsed = parseSeasonalForm(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const result = await addSeasonalRate(listingId, parsed.input);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر إضافة النطاق الموسمي (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "أُضيف النطاق الموسمي." };
}

/** Replace one seasonal range — PUT …/calendar/seasonal-rates/{rateId}. */
export async function updateSeasonalRateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const listingId = text(formData, "listingId");
  const rateId = text(formData, "rateId");
  if (!isUuid(listingId) || !isUuid(rateId)) {
    return { status: "error", message: "معرّف الإعلان أو النطاق غير صالح." };
  }

  const parsed = parseSeasonalForm(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const result = await updateSeasonalRate(listingId, rateId, parsed.input);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تحرير النطاق الموسمي (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "حُفظ تعديل النطاق." };
}

/** Remove one seasonal range — DELETE …/seasonal-rates/{rateId} (204). */
export async function deleteSeasonalRateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const listingId = text(formData, "listingId");
  const rateId = text(formData, "rateId");
  if (!isUuid(listingId) || !isUuid(rateId)) {
    return { status: "error", message: "معرّف الإعلان أو النطاق غير صالح." };
  }

  const result = await deleteSeasonalRate(listingId, rateId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر حذف النطاق الموسمي (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "حُذف النطاق — لياليه تعود لقواعد الأساس." };
}
