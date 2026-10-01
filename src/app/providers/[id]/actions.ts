"use server";

/**
 * The provider public page's W1 server actions (yelp-level plan §4.1/
 * §4.5, PR #487): the organic review write and the helpful vote — the
 * same official mutating-data path as every house action (POST-only,
 * Origin/Host CSRF check, the session re-checked here, the backend's
 * own gates teach the caller). The public page itself renders with NO
 * session read (crawler parity — the anonymous and the logged-in page
 * are the same HTML); these actions are where the session enters, and
 * an anonymous caller gets the honest re-auth message.
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import { createOrganicReview, unvoteReviewHelpful, voteReviewHelpful } from "@/lib/api/reputation";
import { isUuid } from "@/lib/api/geo";

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const REAUTH_MESSAGE = "سجّل الدخول أولًا — المراجعات العامة والأصوات لعملاء المنصة المسجّلين.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The organic review write — `POST /api/v1/reviews/organic`. The
 * provider id rides the form (the PUBLIC PROFILE id — the page's own
 * key); the backend's gates are the teacher (the client mirrors only
 * the rating bounds @Min(1)/@Max(5) and the required provider id).
 */
export async function organicReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const providerId = text(formData, "providerId");
  if (!isUuid(providerId)) {
    return { status: "error", message: "معرّف المزوّد غير صالح." };
  }

  const ratingRaw = text(formData, "rating");
  const rating = Number.parseInt(ratingRaw, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { status: "error", message: "التقييم من ١ إلى ٥." };
  }

  const comment = text(formData, "comment");

  const result = await createOrganicReview(providerId, rating, comment || null);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(
        result.problem,
        `تعذّرت كتابة المراجعة (رمز ${result.status}).`,
      ),
    };
  }

  // refresh(): the page's server render IS the reviews block's source
  // of truth — the re-read carries the new row (or stays without it
  // while the account's first organic reviews await moderation).
  refresh();
  // The served moderationStatus is the truth: the first-N organic
  // reviews of an account queue for review BEFORE they publish — the
  // message must not claim a publication the visibility gate holds back.
  const moderation = result.data?.moderationStatus;
  return {
    status: "success",
    message:
      moderation === "PENDING_REVIEW"
        ? "وصلت مراجعتك إلى طابور الإشراف — تنشر بعد قبولها."
        : "نُشرت مراجعتك العامة — شكرًا لمشاركة تجربتك مع الجيران.",
  };
}

/**
 * The helpful vote — one toggle, the ReactButton pattern verbatim: the
 * form carries the locally-known vote state, the action flips it. The
 * read carries no votedByMe (the public read is anonymous by design —
 * crawler parity), so a fresh page's first click may meet the backend's
 * honest 409; its own words teach, and refresh() re-syncs the row.
 */
export async function voteReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const reviewId = text(formData, "reviewId");
  const currentlyVoted = text(formData, "votedByMe") === "true";
  if (!isUuid(reviewId)) {
    return { status: "error", message: "معرّف المراجعة غير صالح." };
  }

  const result = currentlyVoted
    ? await unvoteReviewHelpful(reviewId)
    : await voteReviewHelpful(reviewId);
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر تحديث صوتك (رمز ${result.status}).`),
    };
  }

  refresh();
  return {
    status: "success",
    message: currentlyVoted ? "سُحب صوتك." : "اعتُبر صوتك — ساعد جيرانك.",
  };
}
