"use server";

/**
 * Conversation server actions (roadmap stage 4) — the stage-2/3
 * discipline: in-action session re-check, the backend as authorization
 * authority (participant-scoped 404s), expected failures as data, and
 * refresh() so the message stream re-renders in the same roundtrip.
 *
 * markConversationReadAction is also invoked from the conversation
 * page's MarkReadOnView effect (event/effect invocation is an official
 * Server Function call path) — the POST is idempotent on the backend
 * (clears the caller's unread counter), so a double-fired effect is
 * harmless by contract.
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { markConversationRead, sendMessage } from "@/lib/api/inbox";

/** The form state contract shared by the conversation forms. */
export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const REAUTH_MESSAGE = "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.";

/** Clear the caller's unread counter for one conversation. */
export async function markConversationReadAction(
  conversationId: string,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const result = await markConversationRead(conversationId);
  if (!result.ok) {
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر تحديث حالة القراءة (رمز ${result.status}).`,
      ),
    };
  }
  return { status: "success", message: "تمّ اعتبار المحادثة مقروءة." };
}

/** Send one chat message — the backend notifies the other participant. */
export async function sendMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const conversationId = formData.get("conversationId");
  const content = formData.get("content");
  if (typeof conversationId !== "string" || conversationId.length === 0) {
    return { status: "error", message: "معرّف المحادثة مفقود." };
  }
  if (typeof content !== "string" || content.trim().length === 0) {
    return { status: "error", message: "اكتب رسالتك أولاً." };
  }

  const result = await sendMessage(conversationId, content.trim());
  if (!result.ok) {
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر إرسال الرسالة (رمز ${result.status}).`),
    };
  }

  await refresh();
  return { status: "success", message: "أُرسلت." };
}
