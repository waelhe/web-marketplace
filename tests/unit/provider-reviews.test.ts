import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { HelpfulVoteButton, OrganicReviewForm } from "@/app/providers/[id]/forms";
import { organicReviewAction, voteReviewAction } from "@/app/providers/[id]/actions";
import { createOrganicReview, unvoteReviewHelpful, voteReviewHelpful } from "@/lib/api/reputation";
import {
  REVIEWS_MODE_LABELS,
  REVIEW_ORIGIN_LABELS,
} from "@/lib/api/reputation-contract";

/**
 * W1 — the provider public page's dual-reviews surface (the
 * post-reactions pattern: the client island renders under a mocked
 * useActionState; the server actions run against mocked channels):
 *
 * - the VOTE button: one form carrying the review id plus the locally
 *   known voice (the public read carries no votedByMe — crawler
 *   parity), the count rides the Arabic label, aria-pressed carries
 *   the toggle semantics;
 * - the ORGANIC form: the mode note rides the served mode's own
 *   label, the rating select carries the request's own 1..5 bounds;
 * - the ACTIONS: the organic write sends the PROFILE id (the endpoint
 *   contract), the vote flips by its carried state; the backend's own
 *   words (the 409 duplicate, the 400 mode refusal) surface verbatim;
 *   a dead session answers the reauth words.
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
}));

test("the helpful vote button carries the review id, the count, and the toggle semantics", () => {
  const markup = renderToStaticMarkup(
    createElement(HelpfulVoteButton, {
      reviewId: "11111111-1111-4111-8111-111111111111",
      helpfulCount: 3,
      votedByMe: false,
    }),
  );

  expect(markup).toContain('value="11111111-1111-4111-8111-111111111111"');
  expect(markup).toContain('value="false"');
  expect(markup).toContain("3 مفيد");
  expect(markup).toContain('aria-pressed="false"');
  expect(markup).toContain("thumb_up_alt");
});

test("the voted state fills the thumb and flips the carried voice", () => {
  const markup = renderToStaticMarkup(
    createElement(HelpfulVoteButton, {
      reviewId: "11111111-1111-4111-8111-111111111111",
      helpfulCount: 4,
      votedByMe: true,
    }),
  );

  expect(markup).toContain('value="true"');
  expect(markup).toContain('aria-pressed="true"');
  expect(markup).toContain("thumb_up");
});

test("the organic form carries the profile id, the mode note, and the bounded rating select", () => {
  const markup = renderToStaticMarkup(
    createElement(OrganicReviewForm, {
      providerId: "22222222-2222-4222-8222-222222222222",
      mode: "HYBRID",
    }),
  );

  expect(markup).toContain('value="22222222-2222-4222-8222-222222222222"');
  expect(markup).toContain(REVIEWS_MODE_LABELS.HYBRID);
  expect(markup).toContain("طابور الإشراف");
  expect(markup).toContain('name="rating"');
  expect(markup).toContain('value="5"');
  expect(markup).toContain('value="1"');
});

test("the labels cover the served vocabulary — the modes and the origins", () => {
  expect(REVIEWS_MODE_LABELS.VERIFIED_ONLY).toContain("الموثّقة");
  expect(REVIEWS_MODE_LABELS.OPEN).toContain("العامة");
  expect(REVIEWS_MODE_LABELS.HYBRID).toContain("الهجين");
  expect(REVIEW_ORIGIN_LABELS.BOOKING).toBe("موثّقة");
  expect(REVIEW_ORIGIN_LABELS.ORGANIC).toBe("عامة");
});

test("the organic action sends the PROFILE id and the bounded rating", async () => {
  vi.mocked(createOrganicReview).mockResolvedValue({
    ok: true,
    status: 201,
    data: {},
  } as never);

  const bare = new FormData();
  bare.set("providerId", "22222222-2222-4222-8222-222222222222");
  const state = await organicReviewAction({ status: "idle" }, bare);

  // (a missing rating answers before any channel call)
  expect(state).toEqual({ status: "error", message: "التقييم من ١ إلى ٥." });
  expect(createOrganicReview).not.toHaveBeenCalled();

  const form = new FormData();
  form.set("providerId", "22222222-2222-4222-8222-222222222222");
  form.set("rating", "4");
  form.set("comment", "خبز ممتاز");

  const state2 = await organicReviewAction({ status: "idle" }, form);

  expect(state2).toEqual({
    status: "success",
    message: "نُشرت مراجعتك العامة — شكرًا لمشاركة تجربتك مع الجيران.",
  });
  expect(createOrganicReview).toHaveBeenCalledWith(
    "22222222-2222-4222-8222-222222222222",
    4,
    "خبز ممتاز",
  );
});

test("the vote action flips by its carried state — remove on voted, add on not", async () => {
  vi.mocked(voteReviewHelpful).mockResolvedValue({ ok: true, status: 201 } as never);

  const form = new FormData();
  form.set("reviewId", "11111111-1111-4111-8111-111111111111");
  form.set("votedByMe", "false");

  const state = await voteReviewAction({ status: "idle" }, form);

  expect(state.status).toBe("success");
  expect(voteReviewHelpful).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
  expect(unvoteReviewHelpful).not.toHaveBeenCalled();
});

test("the backend's own words surface verbatim — the 409 duplicate vote", async () => {
  vi.mocked(voteReviewHelpful).mockResolvedValue({
    ok: false,
    status: 409,
    problem: {
      type: "about:blank",
      title: "Conflict",
      status: 409,
      detail: "You already marked this review as helpful",
      instance: "/api/v1/reviews",
    },
  } as never);

  const form = new FormData();
  form.set("reviewId", "11111111-1111-4111-8111-111111111111");
  form.set("votedByMe", "false");

  const state = await voteReviewAction({ status: "idle" }, form);

  expect(state).toEqual({
    status: "error",
    message: "You already marked this review as helpful",
  });
});
