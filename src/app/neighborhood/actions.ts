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
  createContentReport,
  createNeighborhoodPost,
  createPostComment,
  deleteNeighborhoodPost,
  joinNeighborhood,
  leaveNeighborhood,
} from "@/lib/api/community";
import { openDirectConversation } from "@/lib/api/inbox";
import {
  MAX_REPORT_NOTE_LENGTH,
  POST_CATEGORIES,
  REPORT_REASONS,
  type PostCategory,
  type ReportReason,
} from "@/lib/api/community-contract";
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

/**
 * Comment on a feed post (batch-2 spec §1). The client-managed
 * comments disclosure refetches its own list on success — no refresh()
 * here: the server render of the feed is NOT the comment list's
 * source of truth (the on-demand read is the client's own; the
 * backend's POST_COMMENTED notification rides the commit).
 */
export async function commentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const postId = text(formData, "postId");
  const body = text(formData, "body");
  if (!isUuid(postId)) {
    return { status: "error", message: "معرّف المنشور غير صالح." };
  }
  if (body.length === 0 || body.length > MAX_BODY_LENGTH) {
    return { status: "error", message: "نص التعليق مطلوب (٢٠٠٠ حرف كحد أقصى)." };
  }

  const result = await createPostComment(postId, body);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر نشر التعليق (رمز ${result.status}).`),
    };
  }

  return { status: "success", message: "نُشر تعليقك." };
}

/**
 * Delete MY post (batch-2 spec §1) — the author's own soft delete.
 * Only the author's own posts render the button (the me chain), but
 * the backend's 403 remains the authority for anyone else. Success
 * redirects to the feed — a fresh navigation re-renders without the
 * post (its comments follow in the read path, by the backend's own
 * contract).
 */
export async function deletePostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const postId = text(formData, "postId");
  if (!isUuid(postId)) {
    return { status: "error", message: "معرّف المنشور غير صالح." };
  }

  const result = await deleteNeighborhoodPost(postId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر حذف المنشور (رمز ${result.status}).`),
    };
  }

  redirect("/neighborhood");
}

/**
 * Report a post or a comment (batch-2 spec §1, L45). The backend's
 * own type gates are the vocabulary: targetType POST|COMMENT, reason
 * SPAM|HARASSMENT|INAPPROPRIATE|OTHER (anything else answers the
 * house 400 BEFORE any service call). Reporting your own content
 * answers 409, a duplicate live report answers 409, an unknown or
 * hidden target answers 404 — the backend's words, verbatim.
 */
export async function reportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const targetType = text(formData, "targetType");
  const targetId = text(formData, "targetId");
  const reason = text(formData, "reason");
  const note = text(formData, "note");

  if (targetType !== "POST" && targetType !== "COMMENT") {
    return { status: "error", message: "نوع المحتوى المُبلَّغ عنه غير صالح." };
  }
  if (!isUuid(targetId)) {
    return { status: "error", message: "معرّف المحتوى غير صالح." };
  }
  if (!REPORT_REASONS.includes(reason as ReportReason)) {
    return { status: "error", message: "اختر سبباً صحيحاً للإبلاغ." };
  }
  if (note.length > MAX_REPORT_NOTE_LENGTH) {
    return { status: "error", message: "الملاحظة طويلة (٢٠٠٠ حرف كحد أقصى)." };
  }

  const result = await createContentReport({
    targetType,
    targetId,
    reason: reason as ReportReason,
    ...(note.length > 0 ? { note } : {}),
  });
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر إرسال الإبلاغ (رمز ${result.status}).`),
    };
  }

  return {
    status: "success",
    message: "وصل الإبلاغ — يفتحه فريق الإشراف.",
  };
}
