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
  deletePostAction,
  joinAction,
  leaveAction,
  messageNeighborAction,
  reactAction,
} from "./actions";
import type { ActionState } from "./actions";
import { POST_CATEGORIES } from "@/lib/api/community-contract";

function StateMessage({ state }: { state: ActionState }) {
  if (state.status === "error") {
    return (
      <p className="hy-state" role="alert">
        {state.message}
      </p>
    );
  }
  if (state.status === "success") {
    return (
      <p className="hy-state" role="status">
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
 * chips + a publishing-scope selector in one share box, the S10
 * skin). The chips select the SAME four-value category vocabulary the
 * backend gates (title ≤ 200, body ≤ 2000, defense in depth behind
 * the backend's own 400s); the scope offers the one REAL scope (the
 * direct neighborhood — the membership's location) and marks the
 * adjacent-neighborhoods option «قريبًا» — a product-defined contract
 * the backend does not serve yet, honestly gated, never a fake
 * promise.
 */
const COMPOSER_TYPES: ReadonlyArray<{
  value: (typeof POST_CATEGORIES)[number];
  label: string;
  hint: string;
  icon: string;
}> = [
  {
    value: "RECOMMENDATION",
    label: "توصية خدمة",
    hint: "جرّبت حرفيًا وتوصي به؟",
    icon: "recommend",
  },
  {
    value: "LOST_FOUND",
    label: "مفقودات",
    hint: "ضاع شيء أو وجدتَ واحدًا؟",
    icon: "search",
  },
  {
    value: "CLASSIFIED",
    label: "بيع ومقايضة",
    hint: "أغراضك المستعملة لجيرانك",
    icon: "storefront",
  },
  {
    value: "GENERAL",
    label: "إعلان عام",
    hint: "خبر أو فكرة لكل الجيران",
    icon: "campaign",
  },
];

/** The composer's share prompt (the design's conversational opener). */
const COMPOSER_PROMPT = "ما الجديد في حارتك، يا جار؟";

export function CreatePostForm({ locationId }: { locationId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createPostAction, {
    status: "idle",
  });

  return (
    <form action={action} className="hy-composer">
      <span className="hy-avatar" data-tone="primary" aria-hidden="true">
        <span className="material-symbols-outlined">edit_square</span>
      </span>
      <div className="hy-composer-body">
        <input type="hidden" name="locationId" value={locationId} />
        <fieldset className="hy-composer-types">
          <legend>نوع المشاركة</legend>
          {COMPOSER_TYPES.map((type) => (
            <label key={type.value} className="hy-composer-type">
              <input
                type="radio"
                name="category"
                value={type.value}
                defaultChecked={type.value === "GENERAL"}
                required
              />
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.9375rem" }}>
                {type.icon}
              </span>
              <span>{type.label}</span>
            </label>
          ))}
          {/* The poll quick-option the design specifies — honestly gated:
              the NeighborhoodPoll creation contract is registered (§7/7)
              but the backend write does not exist yet. A disabled chip with
              its reason, never a fake enabled control. */}
          <span className="hy-composer-type" data-gated="true" aria-disabled="true" title="قريبًا — بانتظار عقد الإنشاء لدى الباك اند">
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.9375rem" }}>
              ballot
            </span>
            <span>استطلاع رأي — قريبًا</span>
          </span>
        </fieldset>
        <label htmlFor="post-body" className="visually-hidden">
          {COMPOSER_PROMPT}
        </label>
        <textarea
          id="post-body"
          name="body"
          required
          minLength={1}
          maxLength={2000}
          rows={3}
          placeholder={COMPOSER_PROMPT}
        />
        <label htmlFor="post-title">العنوان</label>
        <input
          id="post-title"
          name="title"
          type="text"
          required
          minLength={1}
          maxLength={200}
          placeholder="عنوان موجز يجذب جيرانك…"
        />
        <div className="hy-composer-foot">
          <label className="hy-composer-scope">
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.875rem" }}>
              share_location
            </span>
            <span>نطاق النشر</span>
            <select name="scope" defaultValue="direct" aria-label="نطاق النشر">
              <option value="direct">الحي المباشر</option>
              <option value="adjacent" disabled>
                الأحياء المجاورة — قريبًا
              </option>
            </select>
          </label>
          <button type="submit" className="hy-btn hy-btn-primary" disabled={pending}>
            <span className="material-symbols-outlined" aria-hidden="true">
              send
            </span>
            {pending ? "جارٍ النشر…" : "انشر في الحارة"}
          </button>
        </div>
        <StateMessage state={state} />
      </div>
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
 * «شكرًا» — L47's reaction toggle (the Nextdoor-2026 gap #1 surface):
 * ONE form carrying the post id plus the caller's own live voice
 * (reactedByMe — the feed read's own field, never client-invented
 * state); the action sends the backend the OPPOSITE direction. The
 * count rides the button itself (the feed's own reactionsCount, in the
 * owner design's own Latin-digit convention — the «832 عائلة» rule),
 * the heart fills when the caller's voice is live (data-reacted), and
 * the backend's own words (409 on a double thank, 403 non-member, the
 * honest 404) surface verbatim on failure.
 */
export function ReactButton({
  postId,
  reactionsCount,
  reactedByMe,
}: {
  postId: string;
  reactionsCount: number;
  reactedByMe: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    reactAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="reactedByMe" value={reactedByMe ? "true" : "false"} />
      <button
        type="submit"
        className="hy-react-btn"
        data-reacted={reactedByMe || undefined}
        disabled={pending}
        aria-pressed={reactedByMe}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {reactedByMe ? "favorite" : "favorite_border"}
        </span>
        <span>
          {pending
            ? "جارٍ التحديث…"
            : reactionsCount > 0
              ? `${reactionsCount} شكرًا`
              : "شكرًا"}
        </span>
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
