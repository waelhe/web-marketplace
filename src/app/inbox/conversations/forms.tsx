"use client";

/**
 * Conversation client forms — useActionState for the composer (pending +
 * returned state in one roundtrip), and MarkReadOnView for the
 * view-marks-read behavior: the official event/effect Server Function
 * invocation path. The effect fires once per mount (the backend's POST
 * is idempotent — it clears the caller's unread counter — so a StrictMode
 * double-invoke in development is harmless by contract, not by luck).
 */

import { useEffect, useActionState } from "react";
import {
  markConversationReadAction,
  sendMessageAction,
  type ActionState,
} from "./actions";

function StateMessage({ state }: { state: ActionState }) {
  if (state.status === "error") {
    return (
      <p className="page-note" role="alert">
        {state.message}
      </p>
    );
  }
  if (state.status === "success") {
    return (
      <p className="page-note" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

/** Fire the idempotent mark-read once the conversation is on screen. */
export function MarkReadOnView({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    void markConversationReadAction(conversationId);
  }, [conversationId]);
  return null;
}

/** The message composer. */
export function SendMessageForm({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendMessageAction, {
    status: "idle",
  });

  return (
    <form action={action} className="stack-form message-composer">
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor="message-content">رسالتك</label>
      <textarea
        id="message-content"
        name="content"
        rows={3}
        maxLength={2000}
        placeholder="اكتب رسالتك للجار…"
        required
      />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الإرسال…" : "أرسل"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}
