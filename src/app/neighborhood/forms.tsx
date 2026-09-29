"use client";

/**
 * Community action forms — the official useActionState pattern (packaged
 * mutating-data guide: form + action + pending + returned state in one
 * round trip). These are the app's first interactive forms; everything
 * else on the community surfaces stays server-rendered. Progressive
 * enhancement holds: the form's action attribute submits even before
 * hydration (queued, then prioritized).
 */

import { useActionState, type ReactNode } from "react";
import {
  createPostAction,
  deletePostAction,
  joinAction,
  leaveAction,
  messageNeighborAction,
} from "./actions";
import type { ActionState } from "./actions";
import { POST_CATEGORIES } from "@/lib/api/community-contract";

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
 * Publish a post into the caller's active neighborhood — the RICH
 * product composer (the owner-supplied design 2026-09-29: quick-type
 * chips + a publishing-scope selector in one share box). The chips
 * select the SAME four-value category vocabulary the backend gates
 * (title ≤ 200, body ≤ 2000, defense in depth behind the backend's
 * own 400s); the scope offers the one REAL scope (the direct
 * neighborhood — the membership's location) and marks the adjacent-
 * neighborhoods option «قريبًا» — a product-defined contract the
 * backend does not serve yet, honestly gated, never a fake promise.
 */
const COMPOSER_TYPES: ReadonlyArray<{
  value: (typeof POST_CATEGORIES)[number];
  label: string;
  hint: string;
  icon: ReactNode;
}> = [
  {
    value: "RECOMMENDATION",
    label: "توصية خدمة",
    hint: "جرّبت حرفيًا وتوصي به؟",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15">
        <path fill="currentColor" d="m12 17.3-6.2 3.7 1.7-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.5 4.8 1.7 7L12 17.3Z" />
      </svg>
    ),
  },
  {
    value: "LOST_FOUND",
    label: "مفقودات",
    hint: "ضاع شيء أو وجدتَ واحدًا؟",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15">
        <path fill="currentColor" d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z" />
      </svg>
    ),
  },
  {
    value: "CLASSIFIED",
    label: "بيع ومقايضة",
    hint: "أغراضك المستعملة لجيرانك",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15">
        <path fill="currentColor" d="M7 18a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm10 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM7.1 14.3h.1l1.4-2.5h6.4c1.1 0 2.1-.6 2.6-1.6l2.9-5.3-1.7-1-2.9 5.3c-.2.4-.6.6-1 .6H8.5c-.4 0-.8.2-1 .6L4.3 16.9l-.3.6a2 2 0 0 0 1.8 2.5h11.7v-2H6.4l1.4-2.5-.7-1.2Z" />
      </svg>
    ),
  },
  {
    value: "GENERAL",
    label: "إعلان عام",
    hint: "خبر أو فكرة لكل الجيران",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15">
        <path fill="currentColor" d="M3 10v4h3l5 5V5L6 10H3Zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4ZM14 3.2v2.1a6.8 6.8 0 0 1 0 13.4v2.1a8.8 8.8 0 0 0 0-17.6Z" />
      </svg>
    ),
  },
];

/** The composer's share prompt (the design's conversational opener). */
const COMPOSER_PROMPT = "ما الجديد في حارتك، يا جار؟";

export function CreatePostForm({ locationId }: { locationId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createPostAction, {
    status: "idle",
  });

  return (
    <form action={action} className="post-composer">
      <p className="composer-prompt" aria-hidden="true">
        {COMPOSER_PROMPT}
      </p>
      <input type="hidden" name="locationId" value={locationId} />
      <fieldset className="composer-types">
        <legend className="composer-types-legend">نوع المشاركة</legend>
        {COMPOSER_TYPES.map((type) => (
          <label key={type.value} className="composer-type">
            <input
              type="radio"
              name="category"
              value={type.value}
              defaultChecked={type.value === "GENERAL"}
              required
            />
            <span className="composer-type-chip">
              {type.icon}
              <span className="composer-type-label">{type.label}</span>
              <span className="composer-type-hint">{type.hint}</span>
            </span>
          </label>
        ))}
        {/* The poll quick-option the design specifies — honestly gated:
            the NeighborhoodPoll creation contract is registered (§7/7)
            but the backend write does not exist yet. A disabled chip with
            its reason, never a fake enabled control. */}
        <span className="composer-type composer-type-soon" aria-disabled="true" title="قريبًا — بانتظار عقد الإنشاء لدى الباك اند">
          <span className="composer-type-chip">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15">
              <path fill="currentColor" d="M5 9h3V7H5v2Zm5 0h3V7h-3v2Zm5 0h3V7h-3v2ZM4 21a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1V5h2v2h10V5h2v2h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4Zm8-9.8a3 3 0 1 0 2 2.8 3 3 0 0 0-2-2.8Z" />
            </svg>
            <span className="composer-type-label">استطلاع رأي</span>
            <span className="composer-type-hint">قريبًا</span>
          </span>
        </span>
      </fieldset>
      <label htmlFor="post-title" className="composer-field-label">
        العنوان
      </label>
      <input
        id="post-title"
        name="title"
        type="text"
        required
        minLength={1}
        maxLength={200}
        placeholder="عنوان موجز يجذب جيرانك…"
      />
      <label htmlFor="post-body" className="composer-field-label">
        النص
      </label>
      <textarea
        id="post-body"
        name="body"
        required
        minLength={1}
        maxLength={2000}
        rows={4}
        placeholder="اكتب لجيرانك…"
      />
      <div className="composer-foot">
        <label className="composer-scope">
          <span className="composer-field-label">نطاق النشر</span>
          <select name="scope" defaultValue="direct" aria-label="نطاق النشر">
            <option value="direct">الحي المباشر</option>
            <option value="adjacent" disabled>
              الأحياء المجاورة — قريبًا
            </option>
          </select>
        </label>
        <button type="submit" className="button" data-variant="primary" disabled={pending}>
          {pending ? "جارٍ النشر…" : "انشر في الحارة"}
        </button>
      </div>
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

/**
 * «احذف منشورك» — the author's own soft delete (batch-2 spec §1).
 * Rendered only on the caller's OWN posts (the me chain decides in
 * the page), but the backend's 403-for-anyone-else remains the
 * authority. Success redirects to the feed re-rendered without the
 * post — its comments follow in the read path (the backend's own
 * contract).
 */
export function DeletePostButton({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    deletePostAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="postId" value={postId} />
      <button
        type="submit"
        className="button"
        data-variant="danger"
        disabled={pending}
      >
        {pending ? "جارٍ الحذف…" : "احذف منشورك"}
      </button>
      {state.status === "error" ? <StateMessage state={state} /> : null}
    </form>
  );
}
