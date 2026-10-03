"use server";

/**
 * Profile server actions (batch-2 spec §3) — the my-reviews edit on
 * the official mutating-data path, the repo's literal pattern: the
 * framework enforces the POST-only + Origin/Host boundary; the action
 * re-checks the session; the backend's resource-server chain remains
 * the authorization authority (ReviewsService.update — the original
 * reviewer alone; anyone else answers 403 with the backend's own
 * words, unknown ids 404). Expected failures return as ActionState
 * data, never crashes.
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { updateReview } from "@/lib/api/reputation";
import { unfollowProvider } from "@/lib/api/follows";
import { REVIEW_RATING_MAX, REVIEW_RATING_MIN } from "@/lib/api/booking-contract";
import { isUuid } from "@/lib/api/geo";

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: "rating" }
  | { status: "success"; message: string };

const REAUTH_MESSAGE = "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Edit MY review — PUT /api/v1/reviews/{id} {rating, comment}. The
 * rating bounds mirror the request's own @Min(1)/@Max(5); the provider
 * rating average recomputes server-side. refresh() reruns the server
 * render so the edited row shows the backend's canonical answer.
 */
export async function updateReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const reviewId = text(formData, "reviewId");
  const ratingRaw = text(formData, "rating");
  const rating = Number.parseInt(ratingRaw, 10);
  const comment = text(formData, "comment");

  if (!isUuid(reviewId)) {
    return { status: "error", message: "معرّف المراجعة غير صالح." };
  }
  if (!Number.isFinite(rating) || rating < REVIEW_RATING_MIN || rating > REVIEW_RATING_MAX) {
    return {
      status: "error",
      field: "rating",
      message: `التقييم رقم بين ${REVIEW_RATING_MIN} و${REVIEW_RATING_MAX}.`,
    };
  }

  const result = await updateReview(reviewId, rating, comment.length > 0 ? comment : null);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر تحرير المراجعة (رمز ${result.status}).`),
    };
  }

  refresh();
  return { status: "success", message: "حُدّثت مراجعتك." };
}

/**
 * W4 (yelp plan §5 — G21, #494): unfollow a provider — `DELETE
 * /api/v1/me/follows/{id}` (the follow ROW id — «متابعاتي»'s own key).
 * The backend's own gate teaches the caller: a foreign id answers 404
 * ("it is not in your list") with its own words. The pair is freed, so
 * re-following the same provider from its page is legal by construction.
 */
export async function unfollowProviderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const followId = text(formData, "followId");
  if (!isUuid(followId)) {
    return { status: "error", message: "معرّف المتابعة غير صالح." };
  }

  const result = await unfollowProvider(followId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّر إلغاء المتابعة (رمز ${result.status}).`,
      ),
    };
  }

  // refresh(): the /profile server read is «متابعاتي»'s source of truth
  // — the re-read drops the row (and its one-alert ledger stays: the
  // follow's history is the backend's own record).
  refresh();
  return { status: "success", message: "أُلغيت المتابعة." };
}
