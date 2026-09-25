"use server";

/**
 * The PUBLIC lead submission action (L34 — roadmap stage 4's consumer
 * contact surface) plus the AUTHENTICATED saved-searches actions (L35
 * — batch-1 spec §2). The lead is the app's first public write: the
 * backend's own contract permits it without mandatory authentication
 * ("بلا مصادقة إلزامية" — the guest fills name and phone; a valid
 * bearer additionally attributes the lead), so it rides
 * backendSendPublic — the session-optional twin that attaches the
 * bearer only when a session exists and otherwise sends bare (the
 * backend's security chain stays the authority; an invalid presented
 * token still 401s there).
 *
 * The saved-search actions follow the repo's verbatim Server-Action
 * pattern (provider/actions.ts family): session re-check inside every
 * action, backendSend on the authenticated channel, the backend's
 * problem+json words surfaced verbatim (the 409 cap teaching, the 400
 * criteria type gate, the 404 unknown-location), refresh() after every
 * accepted write (the packaged refresh.md: Server Actions only).
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { backendSendPublic } from "@/lib/api/server";
import { isUuid } from "@/lib/api/geo";
import {
  createSavedSearch,
  deleteSavedSearch,
  criteriaFromLink,
} from "@/lib/api/saved-searches";

/** The form state contract for the lead and saved-search forms. */
export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

/** The backend's own authored bounds (LeadRequest). */
const NAME_MAX = 120;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const MESSAGE_MAX = 2000;

interface LeadResponse {
  id: string;
  listingId: string;
  status: string;
  createdAt: string;
}

export async function submitLeadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const listingId = formData.get("listingId");
  const contactName = formData.get("contactName");
  const contactPhone = formData.get("contactPhone");
  const message = formData.get("message");

  if (typeof listingId !== "string" || !isUuid(listingId)) {
    return { status: "error", message: "معرّف الإعلان غير صالح." };
  }
  if (
    typeof contactName !== "string" ||
    contactName.trim().length === 0 ||
    contactName.trim().length > NAME_MAX
  ) {
    return { status: "error", message: "الاسم مطلوب (١٢٠ حرفاً كحد أقصى)." };
  }
  if (typeof contactPhone !== "string" || !PHONE_PATTERN.test(contactPhone.trim())) {
    return {
      status: "error",
      message: "رقم الهاتف: ٧–١٥ رقماً، مع '+' اختياري في البداية.",
    };
  }
  if (
    typeof message !== "string" ||
    message.trim().length === 0 ||
    message.trim().length > MESSAGE_MAX
  ) {
    return { status: "error", message: "الرسالة مطلوبة (٢٠٠٠ حرف كحد أقصى)." };
  }

  // Attribution is the channel's concern: backendSendPublic attaches the
  // session bearer only when one exists (a valid token attributes the
  // lead; no token takes the anonymous path the contract permits).

  const result = await backendSendPublic<LeadResponse>(
    "POST",
    `/api/v1/listings/${listingId}/leads`,
    {
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      message: message.trim(),
    },
  );
  if (!result.ok) {
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر إرسال طلب التواصل (رمز ${result.status}).`,
      ),
    };
  }

  return {
    status: "success",
    message: "وصل طلبك إلى صاحب الإعلان — سيتواصل معك على رقمك.",
  };
}

/**
 * The URL param names that ARE saved-search criteria (the browse
 * page's sanitized snapshot minus sort/page — the spec's conversion
 * map: they ride the form as hidden inputs, the action converts them
 * to the criteria record's own names through criteriaFromLink).
 */
const CRITERIA_KEYS = [
  "q",
  "category",
  "minPrice",
  "maxPrice",
  "checkIn",
  "checkOut",
  "guests",
  "locationId",
  "purpose",
  "propertyType",
  "minRooms",
  "minBathrooms",
  "minAreaM2",
  "lat",
  "lng",
  "radiusKm",
] as const;

const REAUTH_MESSAGE = "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.";

/**
 * Save the current search — POST /me/saved-searches {criteria,
 * alertEnabled} (L35). The form carries the sanitized URL params as
 * hidden inputs; the action rebuilds the criteria through
 * criteriaFromLink — the measured name map (q→query, lat→latitude,
 * lng→longitude, ISO-instant stay window) into the SearchCriteria
 * record's own deserialization names. The backend's save-time type
 * gate is the authority (its 400/404 words surface verbatim); an
 * empty criteria ({} — "كل الإعلانات") is the backend's own legal form
 * and passes through untouched.
 */
export async function saveSearchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً لحفظ بحوثك." };
  }

  const link: Record<string, string> = {};
  for (const key of CRITERIA_KEYS) {
    const value = formData.get(key);
    if (typeof value === "string" && value.trim() !== "") {
      link[key] = value.trim();
    }
  }

  const alertEnabledRaw = formData.get("alertEnabled");
  const alertEnabled = alertEnabledRaw === "on" || alertEnabledRaw === "true";

  const criteria = criteriaFromLink(link);
  const result = await createSavedSearch(criteria, alertEnabled);
  if (!result.ok) {
    if (result.unauthenticated) {
      return { status: "error", message: REAUTH_MESSAGE };
    }
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر حفظ البحث (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return {
    status: "success",
    message: alertEnabled
      ? "حُفظ البحث مع التنبيه عند مطابقة إعلان جديد."
      : "حُفظ البحث — رقاقة جديدة أعلى النتائج.",
  };
}

/**
 * Delete one saved search — DELETE /me/saved-searches/{id} (204; a
 * foreign id is the backend's own honest 404).
 */
export async function deleteSavedSearchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !isUuid(id)) {
    return { status: "error", message: "معرّف البحث المحفوظ غير صالح." };
  }

  const result = await deleteSavedSearch(id);
  if (!result.ok) {
    if (result.unauthenticated) {
      return { status: "error", message: REAUTH_MESSAGE };
    }
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر حذف البحث المحفوظ (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "حُذف البحث المحفوظ." };
}
