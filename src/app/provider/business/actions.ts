"use server";

/**
 * The business-page server actions (W2 — yelp-level plan §5, #489): the
 * hours replacement, the services menu writes, the area declaration,
 * and the verification claim — the same official mutating-data path as
 * every house action (POST-only, Origin/Host CSRF check, the session
 * re-checked here, the backend's own ownership gate teaches the
 * caller: a foreign profile id answers 403 with its own words). The
 * refresh() after every success re-renders the page's public-read
 * prefill (the editors' source of truth) in place.
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import {
  addOfferedService,
  addServiceArea,
  moveOfferedService,
  removeOfferedService,
  replaceBusinessHours,
  submitProviderVerification,
  updateOfferedService,
} from "@/lib/api/provider";
import { WEEKDAY_ORDER } from "@/lib/api/reputation-contract";
import { isUuid } from "@/lib/api/geo";

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const REAUTH_MESSAGE = "سجّل الدخول أولًا — إدارة صفحة الأعمال للمزوّدين المسجّلين.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** The follow-profile id gate: every write in this file needs it. */
function requireProfileId(formData: FormData): string | null {
  const profileId = text(formData, "profileId");
  return isUuid(profileId) ? profileId : null;
}

/**
 * The hours replacement — `PUT /providers/{id}/business-hours`. The
 * form's checked days ARE the declared week (a day absent from the
 * request is withdrawn — the backend's own replacement law). The time
 * inputs ride "HH:MM" (the LocalTime partial the backend parses).
 */
export async function replaceBusinessHoursAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const profileId = requireProfileId(formData);
  if (!profileId) return { status: "error", message: "معرّف المزوّد غير صالح." };

  const hours: { dayOfWeek: string; opensAt: string; closesAt: string }[] = [];
  for (const day of WEEKDAY_ORDER) {
    if (text(formData, `declared-${day}`) !== "on") continue;
    const opensAt = text(formData, `opens-${day}`);
    const closesAt = text(formData, `closes-${day}`);
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(opensAt) || !timePattern.test(closesAt)) {
      return {
        status: "error",
        message: `نافذة ${day} غير صالحة — استخدم حقلي الوقت كما هما.`,
      };
    }
    hours.push({ dayOfWeek: day, opensAt, closesAt });
  }

  const result = await replaceBusinessHours(profileId, hours);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر حفظ ساعات العمل (رمز ${result.status}).`,
      ),
    };
  }

  refresh();
  const count = result.data?.length ?? hours.length;
  return {
    status: "success",
    message:
      count > 0
        ? `حُفظ أسبوع العمل — ${new Intl.NumberFormat("ar").format(count)} أيام معلنة.`
        : "حُفظ الأسبوع فارغاً — لا ساعات معلنة.",
  };
}

/**
 * The service entry parser shared by add/update — the entity's own
 * authored bounds mirrored client-side (the pair together-or-nothing
 * law, the ISO 4217 shape, the positive duration); the backend's Bean
 * Validation stays the authority. The price rides MAJOR units and
 * converts to integer cents here.
 */
function parseServiceEntry(formData: FormData): {
  ok: true;
  entry: {
    title: string;
    description: string | null;
    durationMinutes: number | null;
    priceCents: number | null;
    currency: string | null;
  };
} | {
  ok: false;
  message: string;
} {
  const title = text(formData, "title");
  if (title.length === 0) return { ok: false, message: "اسم الخدمة مطلوب." };

  const description = text(formData, "description");

  const durationRaw = text(formData, "durationMinutes");
  let durationMinutes: number | null = null;
  if (durationRaw !== "") {
    durationMinutes = Number.parseInt(durationRaw, 10);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      return { ok: false, message: "المدة يجب أن تكون عددًا موجبًا من الدقائق." };
    }
  }

  const priceRaw = text(formData, "price");
  const currency = text(formData, "currency").toUpperCase();
  let priceCents: number | null = null;
  if (priceRaw !== "" || currency !== "") {
    // The money pair is declared together or not at all (the entity's
    // own law — the V96 CHECK's defect definition).
    if (priceRaw === "" || currency === "") {
      return { ok: false, message: "السعر والعملة يُقرران معًا أو لا شيء." };
    }
    const price = Number.parseFloat(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, message: "السعر يجب أن يكون عددًا غير سالب." };
    }
    priceCents = Math.round(price * 100);
    if (!/^[A-Z]{3}$/.test(currency)) {
      return { ok: false, message: "العملة رمز ISO 4217 من ثلاثة أحرف لاتينية." };
    }
  }

  return {
    ok: true,
    entry: {
      title,
      description: description || null,
      durationMinutes,
      priceCents,
      currency,
    },
  };
}

/** The add — `POST /providers/{id}/services` (position auto-allocates). */
export async function addServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const profileId = requireProfileId(formData);
  if (!profileId) return { status: "error", message: "معرّف المزوّد غير صالح." };

  const parsed = parseServiceEntry(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const result = await addOfferedService(profileId, parsed.entry);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّرت إضافة الخدمة (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "أُضيفت الخدمة إلى قائمتك." };
}

/** The edit — `PUT /providers/{id}/services/{serviceId}` (display fields). */
export async function updateServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const profileId = requireProfileId(formData);
  const serviceId = text(formData, "serviceId");
  if (!profileId || !isUuid(serviceId)) {
    return { status: "error", message: "معرّف غير صالح." };
  }

  const parsed = parseServiceEntry(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const result = await updateOfferedService(profileId, serviceId, parsed.entry);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر حفظ الخدمة (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "حُفظت الخدمة." };
}

/**
 * The move — `PUT /providers/{id}/services/{serviceId}/position`
 * `{position}` (swap semantics: the target's occupant takes the
 * mover's old position; the whole menu returns in its new order).
 */
export async function moveServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const profileId = requireProfileId(formData);
  const serviceId = text(formData, "serviceId");
  const positionRaw = text(formData, "position");
  const position = Number.parseInt(positionRaw, 10);
  if (!profileId || !isUuid(serviceId) || !Number.isInteger(position) || position < 0) {
    return { status: "error", message: "معرّف أو ترتيب غير صالح." };
  }

  const result = await moveOfferedService(profileId, serviceId, position);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر تحريك الخدمة (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "حُرّكت الخدمة." };
}

/** The withdraw — `DELETE /providers/{id}/services/{serviceId}` (soft delete). */
export async function removeServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const profileId = requireProfileId(formData);
  const serviceId = text(formData, "serviceId");
  if (!profileId || !isUuid(serviceId)) {
    return { status: "error", message: "معرّف غير صالح." };
  }

  const result = await removeOfferedService(profileId, serviceId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر سحب الخدمة (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "سُحبت الخدمة من قائمتك." };
}

/**
 * The area declaration — `POST /providers/{id}/service-areas`
 * `{locationId}` (the geo-tree node id). The backend's own gates
 * teach: 409 an already-declared node, 404 an unknown node.
 */
export async function addServiceAreaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const profileId = requireProfileId(formData);
  const locationId = text(formData, "locationId");
  if (!profileId || !isUuid(locationId)) {
    return { status: "error", message: "معرّف غير صالح." };
  }

  const result = await addServiceArea(profileId, locationId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر إعلان النطاق (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "أُعلن نطاق الخدمة." };
}

/**
 * The verification claim — `POST /providers/{id}/verification` (queues
 * the claim: UNVERIFIED/REJECTED → PENDING; the administrative
 * confirm/reject resolves it).
 */
export async function submitVerificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const profileId = requireProfileId(formData);
  if (!profileId) return { status: "error", message: "معرّف المزوّد غير صالح." };

  const result = await submitProviderVerification(profileId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر تقديم الطلب (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "وصل طلبك — قيد مراجعة الإدارة الآن." };
}
