"use server";

/**
 * Provider availability server actions (roadmap stage 6 — the
 * exact-slot gate's provider side): the slot publish. The framework
 * enforces the boundary (POST-only, Origin/Host CSRF check); the
 * action re-checks the session itself, and the backend's
 * authHelper.ownsProvider gate remains the authorization authority —
 * the provider user id resolves through the ME chain inside the
 * channel (booking.ts' publishAvailabilitySlot), never from the
 * client. The MEASURED wire contract: the publish rides the QUERY
 * STRING (@RequestParam startsAt/endsAt — the channel builds it).
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import {
  createAvailabilityRule,
  createTimeOff,
  publishAvailabilitySlot,
} from "@/lib/api/booking";
import { WEEK_DAYS, type WeekDay } from "@/lib/api/booking-contract";

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
 * Parse a datetime-local value into a UTC ISO instant (the same UTC
 * convention as the booking request form — the provider's slot
 * windows and the consumer's stay windows speak the same instant
 * space, which is what the exact-slot gate compares).
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

/**
 * Publish one availability slot — POST
 * /providers/{me.id}/availability/slots?startsAt&endsAt (the window
 * [startsAt, endsAt) becomes bookable EXACTLY: the consumer's stay
 * window must match it, measured in BookingService.create). The
 * provider id derives from the session (the me chain inside the
 * channel); the client sends the window alone.
 */
export async function publishSlotAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const starts = parseUtcInstant(text(formData, "startsAt"), "بداية الفتحة");
  if (!starts.ok) return { status: "error", message: starts.message };
  const ends = parseUtcInstant(text(formData, "endsAt"), "نهاية الفتحة");
  if (!ends.ok) return { status: "error", message: ends.message };

  if (new Date(starts.iso).getTime() >= new Date(ends.iso).getTime()) {
    return { status: "error", message: "نهاية الفتحة يجب أن تكون بعد بدايتها." };
  }

  const result = await publishAvailabilitySlot(starts.iso, ends.iso);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر نشر الفتحة (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "نُشرت الفتحة — صارت قابلة للحجز بدقة." };
}

/**
 * Parse an HH:mm time-of-day (the LocalTime wire form the backend's
 * @RequestParam binds — "09:00").
 */
function parseTimeOfDay(
  raw: string,
  label: string,
): { ok: true; time: string } | { ok: false; message: string } {
  if (!/^\d{2}:\d{2}$/.test(raw)) {
    return { ok: false, message: `${label}: أدخل وقتًا بصيغة HH:mm.` };
  }
  return { ok: true, time: raw };
}

/**
 * Create a WEEKLY availability rule (batch-2 spec §5) — POST
 * /providers/{me.id}/availability/rules?dayOfWeek&startTime&endTime.
 * The recurring window the backend's slot generator expands into
 * concrete slots — the effect lands in the refreshed slots read, and
 * the created entity's own echo is the success surface (the contract
 * exposes no rules read — measured). Same MEASURED query-string
 * contract and ownsProvider gate as the slot publish.
 */
export async function createRuleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const dayOfWeek = text(formData, "dayOfWeek");
  if (!WEEK_DAYS.includes(dayOfWeek as WeekDay)) {
    return { status: "error", message: "اختر يومًا صحيحًا." };
  }
  const start = parseTimeOfDay(text(formData, "startTime"), "بداية القاعدة");
  if (!start.ok) return { status: "error", message: start.message };
  const end = parseTimeOfDay(text(formData, "endTime"), "نهاية القاعدة");
  if (!end.ok) return { status: "error", message: end.message };
  if (start.time >= end.time) {
    return { status: "error", message: "نهاية القاعدة يجب أن تكون بعد بدايتها." };
  }

  const result = await createAvailabilityRule(dayOfWeek, start.time, end.time);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر إنشاء القاعدة (رمز ${result.status}).`),
    };
  }

  refresh();
  return {
    status: "success",
    message: `أُنشئت قاعدة ${result.data.dayOfWeek} ${result.data.startTime}–${result.data.endTime} — يوسّعها مولّد الفتحات في دورته اليومية (حدث DayHasPassed المقيس) إلى فتحات ملموسة.`,
  };
}

/**
 * Block a time-off window (batch-2 spec §5) — POST
 * /providers/{me.id}/time-off?startsAt&endsAt (ISO instants on the
 * query string, the slot publish's own convention). The window becomes
 * unavailable (conflicts with booking and search availability — the
 * backend's own words); the created entity echoes back (no read/delete
 * in the contract — measured).
 */
export async function createTimeOffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const starts = parseUtcInstant(text(formData, "startsAt"), "بداية التعطيل");
  if (!starts.ok) return { status: "error", message: starts.message };
  const ends = parseUtcInstant(text(formData, "endsAt"), "نهاية التعطيل");
  if (!ends.ok) return { status: "error", message: ends.message };
  if (new Date(starts.iso).getTime() >= new Date(ends.iso).getTime()) {
    return { status: "error", message: "نهاية التعطيل يجب أن تكون بعد بدايته." };
  }

  const result = await createTimeOff(starts.iso, ends.iso);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر تعطيل النافذة (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "عُطّلت النافذة — لم تعد متاحة للحجز أو البحث." };
}
