"use server";

/**
 * Community server actions — the official mutating-data path (packaged
 * guides: mutating-data + server-actions). The framework enforces the
 * boundary (POST-only, Origin/Host CSRF check); every action re-checks
 * the session itself — "render-time gating is not a security boundary,
 * because requests can be sent without going through the UI" — and the
 * backend's resource-server chain remains the authorization authority
 * (401/403/404 gates measured on the live API).
 *
 * Expected failures come back as ActionState data (the repo's
 * error-handling philosophy: expected errors are handled in code; only
 * bugs crash boundaries). Writes ride backendSend — the same direct
 * BACKEND_URL channel as the reads, session Bearer included.
 */

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import {
  createNeighborhoodPost,
  joinNeighborhood,
  leaveNeighborhood,
} from "@/lib/api/community";
import { openDirectConversation } from "@/lib/api/inbox";
import { POST_CATEGORIES, type PostCategory } from "@/lib/api/community-contract";
import { isUuid } from "@/lib/api/geo";

/**
 * The form state contract shared by every community action form
 * (type-only export — a `use server` module's runtime exports are the
 * async functions alone; forms inline `{ status: "idle" }`).
 */
export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

/** The backend's own authored-text bounds (NeighborhoodPostController). */
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 2000;

const REAUTH_MESSAGE = "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Join (or switch to) a neighborhood. On success the member lands on
 * their feed — the membership IS the scope, so /neighborhood is the
 * only surface that can render the result.
 */
export async function joinAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const locationId = text(formData, "locationId");
  if (!isUuid(locationId)) {
    return { status: "error", message: "معرّف الموقع غير صالح." };
  }

  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً لتنضم إلى حارتك." };
  }

  const result = await joinNeighborhood(locationId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر الانضمام إلى الحارة (رمز ${result.status}).`,
      ),
    };
  }

  redirect("/neighborhood");
}

/** Leave the current neighborhood — the one-membership slot is released. */
export async function leaveAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً." };
  }

  const result = await leaveNeighborhood();
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر مغادرة الحارة (رمز ${result.status}).`,
      ),
    };
  }

  // Stay on /neighborhood — the page re-renders into its "join first"
  // state; refresh() reruns the server render (packaged guide).
  refresh();
  return { status: "success", message: "غادرت الحارة." };
}

/**
 * Publish a post into the caller's active neighborhood. The form bounds
 * mirror the backend's type gates (title ≤ 200, body ≤ 2000, the
 * four-value category vocabulary) — the backend re-validates and owns
 * the authorization (membership match, level-3, existence).
 */
export async function createPostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "سجّل الدخول أولاً لتنشر في حارتك." };
  }

  const locationId = text(formData, "locationId");
  const category = text(formData, "category");
  const title = text(formData, "title");
  const body = text(formData, "body");

  if (!isUuid(locationId)) {
    return { status: "error", message: "معرّف الحارة غير صالح — انضم إلى حارة أولاً." };
  }
  if (!POST_CATEGORIES.includes(category as PostCategory)) {
    return { status: "error", message: "اختر فئة صحيحة للمنشور." };
  }
  if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
    return { status: "error", message: "العنوان مطلوب (٢٠٠ حرفاً كحد أقصى)." };
  }
  if (body.length === 0 || body.length > MAX_BODY_LENGTH) {
    return { status: "error", message: "نص المنشور مطلوب (٢٠٠٠ حرف كحد أقصى)." };
  }

  const result = await createNeighborhoodPost({
    locationId,
    category: category as PostCategory,
    title,
    body,
  });
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر نشر المنشور (رمز ${result.status}).`),
    };
  }

  // redirect (not refresh): a fresh navigation remounts the form empty —
  // the new post at the top of the feed is itself the success feedback.
  redirect("/neighborhood");
}

/**
 * Open (or reuse) the direct conversation with a post's author — L44's
 * consumer entry (roadmap stage 4). The backend owns every gate: 400 on
 * self ("Cannot open a direct conversation with yourself" — its own
 * words), 404 on an unknown recipient, 429 on the conversationCreate
 * budget; the action only carries the session's token and lands the
 * caller on the conversation. Idempotent by the backend's design: the
 * pair's thread returns 200-existing exactly like 201-new — both land
 * on the same page.
 */
export async function messageNeighborAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const recipientId = text(formData, "recipientId");
  if (!isUuid(recipientId)) {
    return { status: "error", message: "معرّف الجار غير صالح." };
  }

  const result = await openDirectConversation(recipientId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر فتح المحادثة (رمز ${result.status}).`,
      ),
    };
  }

  // redirect (not refresh): the conversation is a new surface, not a
  // re-render of the feed — the router streams its RSC payload in the
  // same action response.
  redirect(`/inbox/conversations/${result.data.id}`);
}
