import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { HelpfulVoteButton, ReviewFlagForm } from "@/app/providers/[id]/forms";
import {
  organicReviewAction,
  reportReviewAction,
  voteReviewAction,
} from "@/app/providers/[id]/actions";
import {
  createOrganicReview,
  requestReviewMediaUpload,
  confirmReviewMediaUpload,
  voteReviewHelpful,
  unvoteReviewHelpful,
} from "@/lib/api/reputation";
import { createContentReport } from "@/lib/api/community";
import { putToPresignedUrl } from "@/lib/api/media";
import {
  REPORT_TARGET_TYPES,
  REPORT_REASONS,
} from "@/lib/api/community-contract";
import {
  REVIEW_MODERATION_LABELS,
  REVIEW_MEDIA_CONTENT_TYPES,
} from "@/lib/api/reputation-contract";

/**
 * N7-b — the W1 COMPLETION slice's own unit net (the post-reactions
 * pattern: the client island renders under a mocked useActionState; the
 * server actions run against mocked channels; the CONTRACT is asserted
 * literally):
 *
 * - the FLAG (V86): the report vocabulary gained REVIEW; the form renders
 *   the disclosure; the action pins targetType=REVIEW and rides the SAME
 *   L45 channel with the backend's own reason vocabulary;
 * - the MEDIA (§4.4): the organic write carries the photo round (declare
 *   → PUT → confirm — N4's discipline); a failed photo NEVER destroys
 *   the review — the failure count rides the success message;
 * - the author's honest MODERATION states: the label vocabulary the
 *   profile's «مراجعاتي» renders (PENDING_REVIEW / HIDDEN_BY_MODERATOR);
 * - the VOTE machine (N7's own): one key, two directions — the 409 and
 *   the reauth paths teach with the backend's own words.
 */

const actionState = vi.hoisted(() => ({
  current: { status: "idle" } as unknown,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: () => [actionState.current, () => undefined, false],
  };
});

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => ({ userId: "u", name: "n", email: "e" })),
}));

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
}));

vi.mock("@/lib/api/reputation", () => ({
  createOrganicReview: vi.fn(),
  voteReviewHelpful: vi.fn(),
  unvoteReviewHelpful: vi.fn(),
  requestReviewMediaUpload: vi.fn(),
  confirmReviewMediaUpload: vi.fn(),
}));

vi.mock("@/lib/api/community", () => ({
  createContentReport: vi.fn(),
}));

vi.mock("@/lib/api/media", () => ({
  putToPresignedUrl: vi.fn(),
}));

const organic = vi.mocked(createOrganicReview);
const vote = vi.mocked(voteReviewHelpful);
const unvote = vi.mocked(unvoteReviewHelpful);
const declare = vi.mocked(requestReviewMediaUpload);
const confirm = vi.mocked(confirmReviewMediaUpload);
const put = vi.mocked(putToPresignedUrl);
const report = vi.mocked(createContentReport);

const REVIEW_ID = "55555555-5555-4555-8555-555555555601";
const PROVIDER_ID = "77777777-7777-4777-8777-777777777701";

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

function fileOf(type: string, size: number) {
  return new File([new Uint8Array(size)], "photo.jpg", { type });
}

const ORGANIC_REVIEW = {
  id: REVIEW_ID,
  bookingId: null,
  rating: 5,
  comment: "تعامل ممتاز",
  reply: null,
  direction: "CONSUMER_TO_PROVIDER",
  repliedAt: null,
  createdAt: "2026-10-02T01:00:00Z",
  updatedAt: "2026-10-02T01:00:00Z",
  origin: "ORGANIC",
  moderationStatus: "PENDING_REVIEW",
  listingId: null,
  reviewerName: "رنا",
  reviewerReviewCount: 1,
  helpfulCount: 0,
};

/* ── The contract: the vocabularies the slice rides ── */

test("the report channel's target vocabulary gained REVIEW (the V86 widening)", () => {
  expect(REPORT_TARGET_TYPES).toContain("REVIEW");
  expect(REPORT_REASONS).toEqual(["SPAM", "HARASSMENT", "INAPPROPRIATE", "OTHER"]);
});

test("the author's honest moderation states carry the queue's own words", () => {
  expect(REVIEW_MODERATION_LABELS.PENDING_REVIEW).toBe("قيد المراجعة");
  expect(REVIEW_MODERATION_LABELS.HIDDEN_BY_MODERATOR).toBe("مخفية بالإشراف");
  expect(REVIEW_MODERATION_LABELS.PUBLISHED).toBe("منشورة");
});

test("the review-photo content types mirror the server allowlist's measured pair", () => {
  expect(REVIEW_MEDIA_CONTENT_TYPES).toEqual(["image/jpeg", "image/png"]);
});

/* ── The flag form: the disclosure renders closed with the vocabulary ── */

test("the flag form renders the closed disclosure with the reason select", () => {
  actionState.current = { status: "idle" };
  const markup = renderToStaticMarkup(createElement(ReviewFlagForm, { reviewId: REVIEW_ID }));
  expect(markup).toContain("أبلغ عن هذه المراجعة");
  expect(markup).toContain(`value="${REVIEW_ID}"`);
  expect(markup).toContain("محتوى مزعج/إعلاني");
  expect(markup).not.toContain("وصل الإبلاغ");
});

test("the vote button renders the count in Arabic numerals with the pressed pair", () => {
  actionState.current = { status: "idle" };
  const markup = renderToStaticMarkup(
    createElement(HelpfulVoteButton, { reviewId: REVIEW_ID, helpfulCount: 3, votedByMe: true }),
  );
  expect(markup).toContain("3 مفيد");
  expect(markup).toContain('aria-pressed="true"');
  expect(markup).toContain('name="votedByMe" value="true"');
});

/* ── The flag action: targetType=REVIEW pinned, the backend's vocabulary ── */

test("the flag action pins targetType=REVIEW on the SAME report channel", async () => {
  report.mockResolvedValue({
    ok: true,
    status: 201,
    data: { id: "r1", targetType: "REVIEW", targetId: REVIEW_ID, status: "OPEN" },
  } as unknown as Awaited<ReturnType<typeof report>>);

  const state = await reportReviewAction(
    { status: "idle" },
    formData({ reviewId: REVIEW_ID, reason: "SPAM" }),
  );
  expect(report).toHaveBeenCalledWith({
    targetType: "REVIEW",
    targetId: REVIEW_ID,
    reason: "SPAM",
  });
  expect(state.status).toBe("success");
});

test("an unknown flag reason answers the gate's own words before any channel call", async () => {
  report.mockClear();
  const state = await reportReviewAction(
    { status: "idle" },
    formData({ reviewId: REVIEW_ID, reason: "BOGUS" }),
  );
  expect(state.status).toBe("error");
  expect((state as { message: string }).message).toContain("سبباً");
  expect(report).not.toHaveBeenCalled();
});

/* ── The organic action's photo round: declare → PUT → confirm ── */

test("a photo rides the write: declare → PUT → confirm, and the message stays the queue's own words", async () => {
  organic.mockResolvedValue({
    ok: true,
    status: 201,
    data: ORGANIC_REVIEW,
  } as Awaited<ReturnType<typeof organic>>);
  declare.mockResolvedValue({
    ok: true,
    status: 201,
    data: {
      mediaId: "m1",
      objectKey: "review-media/x/y.jpg",
      uploadUrl: "https://storage.example/signed-put",
      urlLifetime: "PT15M",
    },
  } as Awaited<ReturnType<typeof declare>>);
  put.mockResolvedValue({ ok: true, status: 200 });
  confirm.mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      id: "m1",
      reviewId: REVIEW_ID,
      contentType: "image/jpeg",
      sizeBytes: 256,
      status: "UPLOADED",
      position: 1,
      downloadUrl: "https://storage.example/signed-get",
      createdAt: "2026-10-02T01:00:00Z",
    },
  } as Awaited<ReturnType<typeof confirm>>);

  const data = formData({ providerId: PROVIDER_ID, rating: "5", comment: "تعامل ممتاز" });
  data.append("photos", fileOf("image/jpeg", 256));

  const state = await organicReviewAction({ status: "idle" }, data);
  expect(organic).toHaveBeenCalledWith(PROVIDER_ID, 5, "تعامل ممتاز");
  expect(declare).toHaveBeenCalledWith({
    reviewId: REVIEW_ID,
    contentType: "image/jpeg",
    sizeBytes: 256,
  });
  expect(put).toHaveBeenCalledWith("https://storage.example/signed-put", "image/jpeg", expect.any(ArrayBuffer));
  expect(confirm).toHaveBeenCalledWith("m1");
  expect(state.status).toBe("success");
  expect((state as { message: string }).message).toContain("طابور الإشراف");
  expect((state as { message: string }).message).not.toContain("لم تكتمل");
});

test("a failed photo round NEVER destroys the review — the count rides the success message", async () => {
  organic.mockResolvedValue({
    ok: true,
    status: 201,
    data: ORGANIC_REVIEW,
  } as Awaited<ReturnType<typeof organic>>);
  declare.mockResolvedValue({
    ok: false,
    status: 403,
    problem: { title: "Forbidden", detail: "not the author", errorCode: "AUTHZ-001" },
    unauthenticated: false,
  } as unknown as Awaited<ReturnType<typeof declare>>);
  put.mockClear();
  confirm.mockClear();

  const data = formData({ providerId: PROVIDER_ID, rating: "5", comment: "تعامل ممتاز" });
  data.append("photos", fileOf("image/jpeg", 128));

  const state = await organicReviewAction({ status: "idle" }, data);
  expect(state.status).toBe("success");
  expect((state as { message: string }).message).toContain("1 من الصور لم تكتمل");
  expect(put).not.toHaveBeenCalled();
  expect(confirm).not.toHaveBeenCalled();
});

/* ── The vote machine (N7's own, the completion net re-pins it) ── */

test("votedByMe=false sends the POST — the first-vote direction", async () => {
  vote.mockResolvedValue({ ok: true, status: 201, data: undefined } as Awaited<ReturnType<typeof vote>>);
  unvote.mockClear();

  const state = await voteReviewAction(
    { status: "idle" },
    formData({ reviewId: REVIEW_ID, votedByMe: "false" }),
  );
  expect(vote).toHaveBeenCalledWith(REVIEW_ID);
  expect(unvote).not.toHaveBeenCalled();
  expect(state.status).toBe("success");
});

test("votedByMe=true sends the DELETE — the un-vote direction", async () => {
  unvote.mockResolvedValue({ ok: true, status: 204, data: undefined } as Awaited<ReturnType<typeof unvote>>);
  vote.mockClear();

  await voteReviewAction(
    { status: "idle" },
    formData({ reviewId: REVIEW_ID, votedByMe: "true" }),
  );
  expect(unvote).toHaveBeenCalledWith(REVIEW_ID);
  expect(vote).not.toHaveBeenCalled();
});

test("the duplicate 409 surfaces the backend's own words verbatim (the teacher)", async () => {
  vote.mockResolvedValue({
    ok: false,
    status: 409,
    problem: {
      title: "Conflict",
      detail: "You already marked this review as helpful",
      errorCode: "CF-001",
    },
    unauthenticated: false,
  } as unknown as Awaited<ReturnType<typeof vote>>);

  const state = await voteReviewAction(
    { status: "idle" },
    formData({ reviewId: REVIEW_ID, votedByMe: "false" }),
  );
  expect(state.status).toBe("error");
  expect((state as { message: string }).message).toContain(
    "You already marked this review as helpful",
  );
});

test("a dead session answers the reauth words before any channel call", async () => {
  const { getSession } = await import("@/lib/dal");
  vi.mocked(getSession).mockResolvedValueOnce(null);
  vote.mockClear();

  const state = await voteReviewAction(
    { status: "idle" },
    formData({ reviewId: REVIEW_ID, votedByMe: "false" }),
  );
  expect(state.status).toBe("error");
  expect((state as { message: string }).message).toContain("سجّل الدخول");
  expect(vote).not.toHaveBeenCalled();
});
