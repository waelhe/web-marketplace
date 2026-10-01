"use client";

/**
 * The provider public page's W1 client forms (yelp-level plan §4.1/
 * §4.5): the organic review write and the helpful vote. The house
 * discipline verbatim — useActionState forms whose expected failures
 * arrive as data (StateMessage), the backend's own gates teach, and
 * refresh() re-renders the page's server read in place.
 */

import { useActionState } from "react";
import { organicReviewAction, voteReviewAction, type ActionState } from "./actions";
import { REVIEWS_MODE_LABELS, type ReviewsMode } from "@/lib/api/reputation-contract";

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

/**
 * The organic review form — the OPEN/HYBRID-mode write (the page mounts
 * it only when the served mode admits organic reviews; the backend's
 * mode gate stays the authority). The rating select carries the
 * Arabic-numbered 1..5 bounds (the request's own @Min/@Max); the
 * comment is free text (the backend's TEXT column — no authored bound
 * to mirror).
 */
export function OrganicReviewForm({
  providerId,
  mode,
}: {
  providerId: string;
  mode: ReviewsMode;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    organicReviewAction,
    { status: "idle" },
  );
  const fieldId = (name: string) => `organic-${name}-${providerId}`;

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="providerId" value={providerId} />
      <p className="page-note">
        مراجعة عامة بلا حجز مكتمل — نمط «{REVIEWS_MODE_LABELS[mode]}». أول
        مراجعاتك العامة تمرّ على طابور الإشراف قبل النشر.
      </p>
      <label htmlFor={fieldId("rating")}>تقييمك من ١ إلى ٥</label>
      <select id={fieldId("rating")} name="rating" required defaultValue="5">
        <option value="5">٥ — ممتاز</option>
        <option value="4">٤ — جيد جدًا</option>
        <option value="3">٣ — جيد</option>
        <option value="2">٢ — مقبول</option>
        <option value="1">١ — ضعيف</option>
      </select>
      <label htmlFor={fieldId("comment")}>تجربتك بالكلمات</label>
      <textarea
        id={fieldId("comment")}
        name="comment"
        rows={3}
        placeholder="ما الذي يستحق أن يعرفه جيرانك عن هذا المزوّد؟"
      />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ النشر…" : "انشر مراجعتك العامة"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * The helpful vote button — the ReactButton pattern verbatim: the form
 * carries the locally-known vote state, the action flips it, refresh()
 * re-renders the row from the server read. The public read carries no
 * votedByMe (crawler parity — the anonymous and logged-in page are the
 * same HTML), so the first click on a fresh page may meet the
 * backend's honest 409; its own words teach.
 */
export function HelpfulVoteButton({
  reviewId,
  helpfulCount,
  votedByMe = false,
}: {
  reviewId: string;
  helpfulCount: number;
  votedByMe?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    voteReviewAction,
    { status: "idle" },
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="votedByMe" value={votedByMe ? "true" : "false"} />
      <button
        type="submit"
        className="hy-react-btn"
        data-reacted={votedByMe || undefined}
        disabled={pending}
        aria-pressed={votedByMe}
        aria-label={votedByMe ? "سحب صوتك عن هذه المراجعة" : "اعتبر هذه المراجعة مفيدة"}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {votedByMe ? "thumb_up" : "thumb_up_alt"}
        </span>
        <span>
          {pending
            ? "جارٍ التحديث…"
            : helpfulCount > 0
              ? `${new Intl.NumberFormat("ar").format(helpfulCount)} مفيد`
              : "مفيد؟"}
        </span>
      </button>
      {state.status !== "idle" ? <StateMessage state={state} /> : null}
    </form>
  );
}
