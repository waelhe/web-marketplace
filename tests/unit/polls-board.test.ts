import { describe, expect, test, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PollCard } from "@/app/neighborhood/poll-card";
import { PollCreateChip, PollCreateDialog } from "@/app/neighborhood/poll-create";
import { voteAction, createPollAction } from "@/app/neighborhood/actions";
import { votePoll, createNeighborhoodPoll } from "@/lib/api/community";
import { getSession } from "@/lib/dal";

/**
 * N12 — the L52 polls wave's ISLAND net (the review-surface/groups
 * pattern: the client islands render under mocked channels; the
 * server actions run against mocked channels; the CONTRACT is
 * asserted literally):
 *
 * - the REAL poll card: the unvoted state (options as submit buttons
 *   carrying the chosen option's id — ONE form, one vote, no client
 *   state; the results hidden per the design's own «اختر خيارًا لعرض
 *   النتائج») and the voted state (the live percentages, the per-option
 *   counts, the mine mark, the total footer);
 * - the composer's poll chip went REAL (the gated «قريبًا» retired
 *   with the L52 contract): the chip opens a dialog whose option slots
 *   carry the registered 2–5 bounds;
 * - the actions' gates: the session gate, the UUID gate, the channel
 *   call, the honest failure path surfaces the backend's own words.
 */

vi.mock("@/lib/api/community", () => ({
  votePoll: vi.fn(),
  createNeighborhoodPoll: vi.fn(),
}));

vi.mock("@/lib/dal", () => ({
  getSession: vi.fn(async () => ({ userId: "11111111-1111-4111-8111-111111111001" })),
}));

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const POLL_ID = "48484848-4848-4484-8484-484848480001";
const OPTION_FAJR = "49494949-4949-4494-9494-494949490001";
const OPTION_EVENING = "49494949-4949-4494-9494-494949490002";
const OPTION_BOTH = "49494949-4949-4494-9494-494949490003";
const LOCATION_ID = "11111111-1111-4111-8111-111111111104";

/** The served board row's own shape (NeighborhoodPollView) — the seeded mamsha poll. */
const servedPoll = {
  id: POLL_ID,
  question: "ما المواعيد الأنسب لفتح الممشى المظلل خلال الصيف؟",
  author: "لجنة تطوير الحي",
  options: [
    { id: OPTION_FAJR, label: "الفجر — ٥:٣٠ إلى ٨:٠٠", position: 0, votes: 1 },
    { id: OPTION_EVENING, label: "المساء — ٥:٠٠ إلى ٨:٣٠", position: 1, votes: 2 },
    { id: OPTION_BOTH, label: "كلا الفترتين", position: 2, votes: 0 },
  ],
  createdAt: "2026-09-27T18:00:00Z",
};

/** Strip React's text-node separators so composite text can be compared. */
function textOf(markup: string): string {
  return markup.replace(/<!--.*?-->/g, "");
}

describe("the REAL poll card — the unvoted state", () => {
  test("every option is a submit button carrying its own optionId (ONE form, one vote)", () => {
    const markup = textOf(
      renderToStaticMarkup(createElement(PollCard, { poll: servedPoll })),
    );
    // The card's real header facts: the committee label, the one-vote rule.
    expect(markup).toContain("استطلاع رأي الحي");
    expect(markup).toContain("لجنة تطوير الحي");
    expect(markup).toContain("صوت واحد لكل عضو");
    // The poll's own question renders as the card's title.
    expect(markup).toContain(servedPoll.question);
    // ONE form carries the poll id; every option submits its own id.
    expect(markup).toContain(`value="${POLL_ID}"`);
    expect(markup).toContain(`value="${OPTION_FAJR}"`);
    expect(markup).toContain(`value="${OPTION_EVENING}"`);
    expect(markup).toContain(`value="${OPTION_BOTH}"`);
    // The design's own honest gate: the results stay hidden until the
    // member votes («اختر خيارًا لعرض النتائج») — no percentage, no
    // per-option count in the unvoted markup.
    expect(markup).toContain("اختر خيارًا لعرض النتائج");
    expect(markup).not.toContain("صوت</span>");
    expect(markup).not.toContain("%");
    // The retired display badges never return.
    expect(markup).not.toContain("بيانات عرض");
    expect(markup).not.toContain("جلسة عرض");
  });
});

describe("the REAL poll card — the voted state", () => {
  test("the live percentages, counts, and the mine mark render from votedByMe", () => {
    const markup = textOf(
      renderToStaticMarkup(
        createElement(PollCard, {
          poll: { ...servedPoll, votedByMe: OPTION_EVENING },
        }),
      ),
    );
    // The percentages render (3 votes total: 1/3, 2/3, 0/3) with the
    // design's own Latin-digit percent rendering, and the per-option counts.
    expect(markup).toContain("33%");
    expect(markup).toContain("67%");
    expect(markup).toContain("1 صوت");
    expect(markup).toContain("2 صوت");
    // The total footer: the live sum, and the design's thank-you note.
    expect(markup).toContain("3 صوتًا حتى الآن");
    expect(markup).toContain("شكرًا لمشاركتك — صوتك محسوب");
    // The mine mark rides the caller's own chosen option.
    expect(markup).toContain(`data-mine="true"`);
    // The voted options are disabled (the one-vote rule, server-side).
    expect(markup).toContain("disabled");
    // The honest zero-count option renders its own truth.
    expect(markup).toContain("كلا الفترتين");
  });
});

describe("the composer's poll chip — the gated «قريبًا» retired with the L52 contract", () => {
  test("the chip is a REAL launcher button with the dialog semantics", () => {
    const markup = textOf(
      renderToStaticMarkup(
        createElement(PollCreateChip, { expanded: false, onOpen: () => {} }),
      ),
    );
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("استطلاع رأي");
    // The gated state never returns.
    expect(markup).not.toContain("قريبًا");
    expect(markup).not.toContain("data-gated");
  });

  test("the dialog carries the question, the label, and the registered 2–5 option slots", () => {
    const ref = { current: null };
    const markup = textOf(
      renderToStaticMarkup(
        createElement(PollCreateDialog, {
          dialogRef: ref,
          locationId: LOCATION_ID,
          open: false,
          onClose: () => {},
        }),
      ),
    );
    expect(markup).toContain("استطلع رأي جيرانك");
    expect(markup).toContain("سؤال واحد ومن خيارين إلى خمسة — صوت واحد لكل عضو");
    expect(markup).toContain(`value="${LOCATION_ID}"`);
    // The five option slots with the first two required (the
    // registered cardinality's own floor).
    expect(markup).toContain('name="option1"');
    expect(markup).toContain('name="option5"');
    expect((markup.match(/required/g) ?? []).length).toBeGreaterThanOrEqual(4);
    // The committee label defaults to the design's own.
    expect(markup).toContain('value="لجنة تطوير الحي"');
  });
});

describe("voteAction — the gates", () => {
  test("the session gate answers the re-auth note before any channel call", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(null as never);
    const state = await voteAction({ status: "idle" }, new FormData());
    expect(state).toEqual({
      status: "error",
      message: "جلستك انتهت — سجّل الدخول من جديد ثم أعد المحاولة.",
    } as never);
    expect(votePoll).not.toHaveBeenCalled();
  });

  test("the UUID gate answers before any channel call", async () => {
    const form = new FormData();
    form.set("pollId", "not-a-uuid");
    form.set("optionId", OPTION_FAJR);
    const state = await voteAction({ status: "idle" }, form);
    expect(state.status).toBe("error");
    expect(votePoll).not.toHaveBeenCalled();
  });

  test("the happy path calls the channel with the poll and option ids", async () => {
    vi.mocked(votePoll).mockResolvedValueOnce({
      ok: true,
      status: 201,
      data: {
        id: "50505050-5050-4505-8505-505050500004",
        pollId: POLL_ID,
        optionId: OPTION_FAJR,
        memberId: "11111111-1111-4111-8111-111111111001",
        createdAt: "2026-10-03T10:00:00Z",
      },
    } as never);
    const form = new FormData();
    form.set("pollId", POLL_ID);
    form.set("optionId", OPTION_FAJR);
    const state = await voteAction({ status: "idle" }, form);
    expect(votePoll).toHaveBeenCalledWith(POLL_ID, OPTION_FAJR);
    expect(state).toEqual({
      status: "success",
      message: "شكرًا لمشاركتك — صوتك محسوب.",
    });
  });

  test("the honest failure path surfaces the backend's own words", async () => {
    vi.mocked(votePoll).mockResolvedValueOnce({
      ok: false,
      status: 409,
      problem: { detail: "One vote per member per poll — withdraw it before voting again" },
    } as never);
    const form = new FormData();
    form.set("pollId", POLL_ID);
    form.set("optionId", OPTION_FAJR);
    const state = await voteAction({ status: "idle" }, form);
    expect(state.status).toBe("error");
    if (state.status !== "error") throw new Error("unreachable");
    expect(state.message).toContain("One vote per member per poll");
  });
});

describe("createPollAction — the gates", () => {
  const validForm = () => {
    const form = new FormData();
    form.set("locationId", LOCATION_ID);
    form.set("question", "ما المواعيد الأنسب لفتح الممشى المظلل خلال الصيف؟");
    form.set("authorLabel", "لجنة تطوير الحي");
    form.set("option1", "الفجر — ٥:٣٠ إلى ٨:٠٠");
    form.set("option2", "المساء — ٥:٠٠ إلى ٨:٣٠");
    return form;
  };

  test("the cardinality gate answers with the registered contract's own words", async () => {
    const form = new FormData();
    form.set("locationId", LOCATION_ID);
    form.set("question", "س");
    form.set("authorLabel", "لجنة تطوير الحي");
    form.set("option1", "خيار وحيد");
    const state = await createPollAction({ status: "idle" }, form);
    expect(state.status).toBe("error");
    if (state.status !== "error") throw new Error("unreachable");
    expect(state.message).toContain("من ٢ إلى ٥ خيارات");
    expect(createNeighborhoodPoll).not.toHaveBeenCalled();
  });

  test("the happy path sends the ONE-unit authoring body", async () => {
    vi.mocked(createNeighborhoodPoll).mockResolvedValueOnce({
      ok: true,
      status: 201,
      data: { ...servedPoll, votedByMe: undefined },
    } as never);
    const state = await createPollAction({ status: "idle" }, validForm());
    expect(createNeighborhoodPoll).toHaveBeenCalledWith({
      locationId: LOCATION_ID,
      question: "ما المواعيد الأنسب لفتح الممشى المظلل خلال الصيف؟",
      authorLabel: "لجنة تطوير الحي",
      options: ["الفجر — ٥:٣٠ إلى ٨:٠٠", "المساء — ٥:٠٠ إلى ٨:٣٠"],
    });
    expect(state).toEqual({
      status: "success",
      message: "نُشر استطلاعك — ظهر في منطقة المختارات.",
    });
  });

  test("the honest failure path surfaces the backend's cardinality words", async () => {
    vi.mocked(createNeighborhoodPoll).mockResolvedValueOnce({
      ok: false,
      status: 400,
      problem: { detail: "A poll carries one question and 2 to 5 options — got 6" },
    } as never);
    const state = await createPollAction({ status: "idle" }, validForm());
    expect(state.status).toBe("error");
    if (state.status !== "error") throw new Error("unreachable");
    expect(state.message).toContain("2 to 5 options");
  });
});
