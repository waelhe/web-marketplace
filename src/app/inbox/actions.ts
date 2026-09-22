"use server";

/**
 * Inbox server actions (roadmap stage 4) — the official mutating-data
 * path on the stage-2/3 discipline: the framework's Server-Action
 * boundary (POST-only, Origin/Host CSRF check) + an in-action session
 * re-check (render-time gating is not a security boundary) + the
 * backend's resource-server chain as the authorization authority.
 *
 * Covers: mark-notification-read, the L22 preference-matrix upsert (the
 * client sends only the DIFF against the effective matrix — the backend
 * keeps the stored matrix sparse by design), and the L34 lead-inbox
 * one-way moves (PATCH — the measured verb).
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import {
  markNotificationRead,
  moveLead,
  updateMyPreferences,
} from "@/lib/api/inbox";
import {
  LEAD_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
  type LeadStatus,
  type NotificationChannel,
  type NotificationType,
  type PreferenceUpdate,
} from "@/lib/api/inbox-contract";

/** The form state contract shared by the inbox action forms. */
export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const REAUTH_MESSAGE = "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.";

/**
 * Mark one notification read. Owner-or-admin is the backend's own gate
 * (403/404 there); this action only carries the session's token. The
 * feed re-renders in the same roundtrip via refresh().
 */
export async function markReadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    return { status: "error", message: "معرّف الإشعار مفقود." };
  }

  const result = await markNotificationRead(id);
  if (!result.ok) {
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر وضع علامة المقروء (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "تمّ وضع علامة المقروء." };
}

/**
 * Apply the preference-matrix diff. The payload arrives as a JSON string
 * in one field (the client computed the diff against the matrix it
 * rendered — only changed switches are upserted, so the stored matrix
 * stays sparse; "back to default" is enabled=true per the backend's
 * contract). The DB channel's always-on invariant is the binding layer's
 * own 400 — this action re-checks it locally first so the user gets the
 * same words without a wasted roundtrip.
 */
export async function updatePreferencesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const raw = formData.get("diff");
  if (typeof raw !== "string" || raw.length === 0) {
    return { status: "success", message: "لا تغييرات لتفعيلها." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "error", message: "تعذّر قراءة التغييرات." };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { status: "success", message: "لا تغييرات لتفعيلها." };
  }

  const updates: PreferenceUpdate[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) {
      return { status: "error", message: "تعذّر قراءة التغييرات." };
    }
    const { type, channel, enabled } = entry as Record<string, unknown>;
    if (
      !NOTIFICATION_TYPES.includes(type as NotificationType) ||
      !NOTIFICATION_CHANNELS.includes(channel as NotificationChannel) ||
      typeof enabled !== "boolean"
    ) {
      return { status: "error", message: "تغيير غير معروف في مصفوفة التفضيلات." };
    }
    // The backend's own invariant, in its own words: the in-app (DB)
    // channel is always on — an opt-out is rejected (binding @AssertTrue
    // → 400). Mirrored here for the same-message, zero-roundtrip reject.
    if (channel === "DB" && !enabled) {
      return {
        status: "error",
        message: "قناة داخل التطبيق مفعّلة دائماً — تعطيلها غير مدعوم.",
      };
    }
    updates.push({
      type: type as NotificationType,
      channel: channel as NotificationChannel,
      enabled,
    });
  }

  const result = await updateMyPreferences(updates);
  if (!result.ok) {
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر حفظ التفضيلات (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "حُفظت التفضيلات." };
}

/**
 * One-way lead-inbox move (NEW→READ/ARCHIVED, READ→ARCHIVED). Foreign or
 * already-moved leads answer 404/400 with the backend's own words —
 * surfaced verbatim.
 */
export async function moveLeadAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const leadId = formData.get("leadId");
  const target = formData.get("status");
  if (typeof leadId !== "string" || leadId.length === 0) {
    return { status: "error", message: "معرّف طلب التواصل مفقود." };
  }
  if (typeof target !== "string" || !LEAD_STATUSES.includes(target as LeadStatus)) {
    return { status: "error", message: "حالة غير معروفة." };
  }

  const result = await moveLead(leadId, target as LeadStatus);
  if (!result.ok) {
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر نقل طلب التواصل (رمز ${result.status}).`,
      ),
    };
  }

  await refresh();
  return { status: "success", message: "تمّ نقل طلب التواصل." };
}
