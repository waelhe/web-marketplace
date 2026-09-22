"use client";

/**
 * Community action forms — the official useActionState pattern (packaged
 * mutating-data guide: form + action + pending + returned state in one
 * round trip). These are the app's first interactive forms; everything
 * else on the community surfaces stays server-rendered. Progressive
 * enhancement holds: the form's action attribute submits even before
 * hydration (queued, then prioritized).
 */

import { useActionState } from "react";
import {
  createPostAction,
  joinAction,
  leaveAction,
  messageNeighborAction,
} from "./actions";
import type { ActionState } from "./actions";
import { CATEGORY_LABELS, POST_CATEGORIES } from "@/lib/api/community-contract";

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

/** Join (or switch to) the labeled neighborhood — used by the picker. */
export function JoinForm({ locationId, label }: { locationId: string; label: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(joinAction, {
    status: "idle",
  });

  return (
    <form action={action}>
      <input type="hidden" name="locationId" value={locationId} />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الانضمام…" : `انضم إلى ${label}`}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** Leave the current neighborhood — shown on the membership card. */
export function LeaveForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(leaveAction, {
    status: "idle",
  });

  return (
    <form action={action}>
      <button type="submit" className="button" disabled={pending}>
        {pending ? "جارٍ المغادرة…" : "مغادرة الحارة"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * Publish a post into the caller's active neighborhood. The bounds on
 * the inputs mirror the backend's type gates (title ≤ 200, body ≤ 2000,
 * the four-value category vocabulary) — defense in depth behind the
 * backend's own 400s, never instead of them.
 */
export function CreatePostForm({ locationId }: { locationId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createPostAction, {
    status: "idle",
  });

  return (
    <form action={action} className="post-composer">
      <input type="hidden" name="locationId" value={locationId} />
      <label htmlFor="post-category">الفئة</label>
      <select id="post-category" name="category" defaultValue="GENERAL" required>
        {POST_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {CATEGORY_LABELS[category]}
          </option>
        ))}
      </select>
      <label htmlFor="post-title">العنوان</label>
      <input
        id="post-title"
        name="title"
        type="text"
        required
        minLength={1}
        maxLength={200}
        placeholder="عنوان المنشور"
      />
      <label htmlFor="post-body">النص</label>
      <textarea
        id="post-body"
        name="body"
        required
        minLength={1}
        maxLength={2000}
        rows={5}
        placeholder="اكتب لجيرانك…"
      />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ النشر…" : "انشر في الحارة"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * «راسل الجار» — L44's feed entry (roadmap stage 4). Opens (or reuses)
 * the direct conversation with the post's author; the backend's own
 * gates (400 self / 404 unknown / 429 budget) surface verbatim through
 * the action state. A per-post form: the author id rides a hidden field.
 */
export function MessageNeighborButton({ authorId }: { authorId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    messageNeighborAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="recipientId" value={authorId} />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "جارٍ الفتح…" : "راسل الجار"}
      </button>
      {state.status === "error" ? <StateMessage state={state} /> : null}
    </form>
  );
}
