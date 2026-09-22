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
import { publishAvailabilitySlot } from "@/lib/api/booking";

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
