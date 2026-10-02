"use client";

/**
 * The provider public page's W1 client forms (yelp-level plan §4.1/
 * §4.5): the organic review write and the helpful vote. The house
 * discipline verbatim — useActionState forms whose expected failures
 * arrive as data (StateMessage), the backend's own gates teach, and
 * refresh() re-renders the page's server read in place.
 */

import { useActionState } from "react";
import {
  organicReviewAction,
  reportReviewAction,
  voteReviewAction,
  type ActionState,
} from "./actions";
import {
  MAX_REPORT_NOTE_LENGTH,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
} from "@/lib/api/community-contract";
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
      {/* The completion slice (§4.4): the composer's photo picker — the
          SAME accept list and per-photo bound as the neighborhood
          composer (the backend's allowlist), up to ٤ photos, optional; a
          photo-less submit stays the pure text review (no fake
          requirement). A failed photo never destroys the review (the
          N4 discipline — the failure count rides the success message). */}
      <label className="page-note" htmlFor={fieldId("photos")}>
        أضف صورًا (حتى ٤ — JPEG/PNG/WebP/GIF، ١٠ ميغابايت للصورة)
      </label>
      <input
        id={fieldId("photos")}
        name="photos"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
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

/**
 * «أبلغ عن هذه المراجعة» — the completion slice (V86): the SAME L45
 * report channel with the REVIEW target, the same disclosure pattern
 * as the neighborhood's ReportContentForm (details/summary — the
 * affordance stays closed until asked for; the backend's own gates
 * surface verbatim: own-content 409, duplicate 409, unknown 404).
 */
export function ReviewFlagForm({ reviewId }: { reviewId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    reportReviewAction,
    { status: "idle" },
  );

  return (
    <details className="report-details">
      <summary className="link-like">أبلغ عن هذه المراجعة</summary>
      <form action={action} className="report-form">
        <input type="hidden" name="reviewId" value={reviewId} />
        <label htmlFor={`review-flag-reason-${reviewId}`}>السبب</label>
        <select id={`review-flag-reason-${reviewId}`} name="reason" required defaultValue="SPAM">
          {REPORT_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {REPORT_REASON_LABELS[reason]}
            </option>
          ))}
        </select>
        <label htmlFor={`review-flag-note-${reviewId}`}>ملاحظة (اختياري)</label>
        <input
          id={`review-flag-note-${reviewId}`}
          name="note"
          type="text"
          maxLength={MAX_REPORT_NOTE_LENGTH}
          placeholder="تفاصيل تساعد فريق الإشراف"
        />
        <button type="submit" className="button" disabled={pending}>
          {pending ? "جارٍ الإرسال…" : "أرسل الإبلاغ"}
        </button>
        <StateMessage state={state} />
      </form>
    </details>
  );
}
