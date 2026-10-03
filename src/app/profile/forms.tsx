"use client";

/**
 * Profile action forms (batch-2 spec §3) — the my-reviews edit form,
 * the repo's literal useActionState family. One per review row the
 * caller WROTE (the reviewer/{me.id} list is that id space by
 * definition — the backend's update gate remains the authority for
 * anything the display might get wrong).
 */

import { useActionState } from "react";
import {
  unfollowProviderAction,
  unsaveFavoriteAction,
  updateReviewAction,
  type ActionState,
} from "./actions";
import { REVIEW_RATING_MAX, REVIEW_RATING_MIN } from "@/lib/api/booking-contract";
import { Field } from "@/components/ui/field";

const IDLE: ActionState = { status: "idle" };

function StateMessage({ state }: { state: ActionState }) {
  if (state.status === "error" && !state.field) {
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

/** «حرّر مراجعتك» — a per-review disclosure with rating + comment. */
export function ReviewEditForm({
  reviewId,
  rating,
  comment,
}: {
  reviewId: string;
  rating: number;
  comment: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateReviewAction,
    IDLE,
  );

  return (
    <details className="review-edit-details">
      <summary className="link-like">حرّر مراجعتك</summary>
      <form action={action} className="stack-form">
        <input type="hidden" name="reviewId" value={reviewId} />
        <Field
          label="التقييم الجديد"
          error={state.status === "error" && state.field === "rating" ? state.message : undefined}
        >
          <select
            id={`review-edit-rating-${reviewId}`}
            name="rating"
            defaultValue={String(rating)}
            required
          >
            {Array.from({ length: REVIEW_RATING_MAX - REVIEW_RATING_MIN + 1 }, (_, index) => {
              const value = REVIEW_RATING_MIN + index;
              return (
                <option key={value} value={value}>
                  {new Intl.NumberFormat("ar").format(value)}
                </option>
              );
            })}
          </select>
        </Field>
        <label htmlFor={`review-edit-comment-${reviewId}`}>التعليق الجديد</label>
        <textarea
          id={`review-edit-comment-${reviewId}`}
          name="comment"
          rows={3}
          defaultValue={comment ?? ""}
          placeholder="حدّث رأيك…"
        />
        <button type="submit" className="button" data-variant="primary" disabled={pending}>
          {pending ? "جارٍ الحفظ…" : "احفظ التعديل"}
        </button>
        <StateMessage state={state} />
      </form>
    </details>
  );
}

/**
 * W4 (yelp plan §5 — G21): «إلغاء المتابعة» — one per follow row in
 * «متابعاتي» (the row's OWN id — the /me/follows read's key, never the
 * provider id). The backend's own gate teaches: a foreign id answers
 * 404 ("it is not in your list"); the pair is freed, so re-following
 * the same provider from its page is legal.
 */
export function UnfollowForm({ followId }: { followId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    unfollowProviderAction,
    IDLE,
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="followId" value={followId} />
      <button type="submit" className="hy-react-btn" disabled={pending}>
        <span className="material-symbols-outlined" aria-hidden="true">
          notifications_off
        </span>
        <span>{pending ? "جارٍ الإلغاء…" : "ألغِ المتابعة"}</span>
      </button>
      {state.status !== "idle" ? <StateMessage state={state} /> : null}
    </form>
  );
}

/**
 * W3 (yelp plan §5 — G19, #492): «سحب من المفضلات» — the per-row small
 * form (the UnfollowForm's own shape). The withdraw carries the LISTING
 * id (the pair's own key — the favorites surface's own contract, not
 * the follows surface's row id).
 */
export function UnsaveFavoriteForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    unsaveFavoriteAction,
    IDLE,
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="listingId" value={listingId} />
      <button type="submit" className="button" data-variant="danger" disabled={pending}>
        {pending ? "جارٍ السحب…" : "اسحبه من مفضلاتك"}
      </button>
      {state.status !== "idle" ? <StateMessage state={state} /> : null}
    </form>
  );
}
