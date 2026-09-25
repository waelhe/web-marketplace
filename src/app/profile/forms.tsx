"use client";

/**
 * Profile action forms (batch-2 spec §3) — the my-reviews edit form,
 * the repo's literal useActionState family. One per review row the
 * caller WROTE (the reviewer/{me.id} list is that id space by
 * definition — the backend's update gate remains the authority for
 * anything the display might get wrong).
 */

import { useActionState } from "react";
import { updateReviewAction, type ActionState } from "./actions";
import { REVIEW_RATING_MAX, REVIEW_RATING_MIN } from "@/lib/api/booking-contract";

const IDLE: ActionState = { status: "idle" };

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
        <label htmlFor={`review-edit-rating-${reviewId}`}>التقييم الجديد</label>
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
