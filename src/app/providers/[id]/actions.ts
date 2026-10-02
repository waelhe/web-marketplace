"use server";

/**
 * The provider public page's W1 server actions (yelp-level plan §4.1/
 * §4.5, PR #487): the organic review write, the helpful vote, and the
 * completion slice — the review flag (V86) and the review-photo upload
 * (§4.4) — the same official mutating-data path as every house action
 * (POST-only, Origin/Host CSRF check, the session re-checked here, the
 * backend's own gates teach the caller). The public page itself renders
 * with NO session read (crawler parity — the anonymous and the
 * logged-in page are the same HTML); these actions are where the session
 * enters, and an anonymous caller gets the honest re-auth message.
 */

import { refresh } from "next/cache";
import { getSession } from "@/lib/dal";
import { problemMessage } from "@/lib/problem";
import {
  confirmReviewMediaUpload,
  createOrganicReview,
  requestReviewMediaUpload,
  unvoteReviewHelpful,
  voteReviewHelpful,
} from "@/lib/api/reputation";
import { putToPresignedUrl } from "@/lib/api/media";
import { createContentReport } from "@/lib/api/community";
import {
  MAX_REPORT_NOTE_LENGTH,
  REPORT_REASONS,
  type ReportReason,
} from "@/lib/api/community-contract";
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
  // The completion slice (§4.4): the composer's photos ride the same
  // write — up to ٤, the N4 honest-degradation discipline verbatim (the
  // TEXT is live first; a photo failure never destroys the review, the
  // failure count rides the success message).
  const photos = formData
    .getAll("photos")
    .filter((p): p is File => p instanceof File && p.size > 0)
    .slice(0, 4);

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

  const reviewId = result.data?.id;
  let failedPhotos = 0;
  if (reviewId) {
    for (const photo of photos) {
      const uploaded = await uploadReviewPhoto(reviewId, photo);
      if (!uploaded) failedPhotos += 1;
    }
  }

  // refresh(): the page's server render IS the reviews block's source
  // of truth — the re-read carries the new row (or stays without it
  // while the account's first organic reviews await moderation).
  refresh();
  // The served moderationStatus is the truth: the first-N organic
  // reviews of an account queue for review BEFORE they publish — the
  // message must not claim a publication the visibility gate holds back.
  const moderation = result.data?.moderationStatus;
  const photoNote =
    failedPhotos > 0
      ? ` — ${failedPhotos} من الصور لم تكتمل (المراجعة نفسها سليمة).`
      : "";
  return {
    status: "success",
    message:
      moderation === "PENDING_REVIEW"
        ? `وصلت مراجعتك إلى طابور الإشراف — تنشر بعد قبولها${photoNote}.`
        : `نُشرت مراجعتك العامة — شكرًا لمشاركة تجربتك مع الجيران${photoNote}.`,
  };
}

/**
 * W1 §4.4: one review photo's full presigned round — declare (the
 * author gate + server-generated key live backend-side), PUT the bytes
 * with the signature-pinned Content-Type, then the server-side
 * HeadObject confirm. Returns false on ANY step's failure (N4's
 * uploadPostPhoto twin, the same counting discipline).
 */
async function uploadReviewPhoto(reviewId: string, photo: File): Promise<boolean> {
  const declared = await requestReviewMediaUpload({
    reviewId,
    contentType: photo.type,
    sizeBytes: photo.size,
  });
  if (!declared.ok || !declared.data) return false;

  const bytes = await photo.arrayBuffer();
  const put = await putToPresignedUrl(declared.data.uploadUrl, photo.type, bytes);
  if (!put.ok) return false;

  const confirmed = await confirmReviewMediaUpload(declared.data.mediaId);
  return confirmed.ok;
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

/**
 * W1 (V86 — the completion slice): flag a review — the SAME L45 report
 * channel with the REVIEW target (`POST /api/v1/reports`). The backend's
 * own type gates are the vocabulary; reporting your own content answers
 * 409, a duplicate live report answers 409, an unknown or hidden target
 * answers 404 — its words, verbatim.
 */
export async function reportReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { status: "error", message: REAUTH_MESSAGE };

  const reviewId = text(formData, "reviewId");
  if (!isUuid(reviewId)) {
    return { status: "error", message: "معرّف المراجعة غير صالح." };
  }

  const reason = text(formData, "reason");
  if (!REPORT_REASONS.includes(reason as ReportReason)) {
    return { status: "error", message: "اختر سبباً صحيحاً للإبلاغ." };
  }
  const note = text(formData, "note");
  if (note.length > MAX_REPORT_NOTE_LENGTH) {
    return { status: "error", message: "الملاحظة طويلة (٢٠٠٠ حرف كحد أقصى)." };
  }

  const result = await createContentReport({
    targetType: "REVIEW",
    targetId: reviewId,
    reason: reason as ReportReason,
    ...(note.length > 0 ? { note } : {}),
  });
  if (!result.ok) {
    if (result.unauthenticated) return { status: "error", message: REAUTH_MESSAGE };
    return {
      status: "error",
      message: problemMessage(result.problem, `تعذّر إرسال الإبلاغ (رمز ${result.status}).`),
    };
  }

  return { status: "success", message: "وصل الإبلاغ — يفتحه فريق الإشراف." };
}
