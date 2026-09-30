import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { ReactButton } from "@/app/neighborhood/forms";
import { reactAction } from "@/app/neighborhood/actions";
import { reactToPost, removePostReaction } from "@/lib/api/community";

/**
 * L47 — the reactions layer's own unit net (the register-form pattern:
 * the client island renders under a mocked useActionState; the server
 * action runs against mocked channels):
 *
 * - the BUTTON: one form carrying the post id plus the caller's own
 *   LIVE voice (reactedByMe — the feed read's own field, never
 *   client-invented state); the heart fills on the live voice, the
 *   count rides the label in Arabic numerals, aria-pressed carries the
 *   toggle semantics to assistive tech;
 * - the ACTION: ONE key, TWO directions — reactedByMe=true sends the
 *   backend the REMOVE, false sends the THANK; the backend's own words
 *   (the 409 one-voice guard) surface verbatim; a dead session answers
 *   the reauth words.
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

vi.mock("@/lib/api/community", () => ({
  reactToPost: vi.fn(),
  removePostReaction: vi.fn(),
}));

vi.mock("@/lib/api/inbox", () => ({
  openDirectConversation: vi.fn(),
}));

vi.mock("@/lib/api/server", () => ({
  backendGet: vi.fn(),
  backendSend: vi.fn(),
}));

const thank = vi.mocked(reactToPost);
const unthank = vi.mocked(removePostReaction);

const POST_ID = "55555555-5555-4555-8555-555555555501";

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

/* ── The button: the filled heart and the live count ride the feed read ── */

test("ReactButton renders the idle voice: the outline heart, the Arabic count, the false state", () => {
  const markup = renderToStaticMarkup(
    createElement(ReactButton, {
      postId: POST_ID,
      reactionsCount: 3,
      reactedByMe: false,
    }),
  );

  // The caller's own live voice rides the hidden field — the action's
  // one source of direction, never client-invented state.
  expect(markup).toContain(`name="postId" value="${POST_ID}"`);
  expect(markup).toContain('name="reactedByMe" value="false"');
  // The outline heart + the design's own pill + the count in the owner's Latin-digit convention.
  expect(markup).toContain("favorite_border");
  expect(markup).toContain('class="hy-react-btn"');
  expect(markup).toContain("3 شكرًا");
  expect(markup).not.toContain("data-reacted");
  // The toggle semantics reach assistive tech.
  expect(markup).toContain('aria-pressed="false"');
});

test("ReactButton renders the live voice: the filled heart, the reacted state", () => {
  const markup = renderToStaticMarkup(
    createElement(ReactButton, {
      postId: POST_ID,
      reactionsCount: 12,
      reactedByMe: true,
    }),
  );

  expect(markup).toContain('name="reactedByMe" value="true"');
  expect(markup).toContain("favorite</span>");
  expect(markup).toContain("data-reacted");
  expect(markup).toContain('aria-pressed="true"');
  expect(markup).toContain("12 شكرًا");
});

test("ReactButton hides the count word when nobody has thanked yet", () => {
  const markup = renderToStaticMarkup(
    createElement(ReactButton, {
      postId: POST_ID,
      reactionsCount: 0,
      reactedByMe: false,
    }),
  );

  // Zero thanks is the affordance itself — no «٠ شكرًا» noise.
  expect(markup).toContain(">شكرًا</span>");
  expect(markup).not.toContain("٠");
});

/* ── The action: ONE key, TWO directions ── */

test("reactAction on an unthanked post sends the THANK and speaks it", async () => {
  thank.mockResolvedValue({
    ok: true,
    status: 201,
    data: {
      id: "66666666-6666-4666-8666-666666666601",
      postId: POST_ID,
      memberId: "u",
      createdAt: "2026-09-30T12:00:00Z",
      updatedAt: "2026-09-30T12:00:00Z",
    },
  });

  const state = await reactAction({ status: "idle" }, formData({
    postId: POST_ID,
    reactedByMe: "false",
  }));

  expect(thank).toHaveBeenCalledWith(POST_ID);
  expect(unthank).not.toHaveBeenCalled();
  expect(state).toEqual({ status: "success", message: "شكرت هذا المنشور." });
});

test("reactAction on my own live voice sends the REMOVE and speaks it", async () => {
  unthank.mockResolvedValue({ ok: true, status: 204, data: null });

  const state = await reactAction({ status: "idle" }, formData({
    postId: POST_ID,
    reactedByMe: "true",
  }));

  expect(unthank).toHaveBeenCalledWith(POST_ID);
  expect(thank).not.toHaveBeenCalled();
  expect(state).toEqual({ status: "success", message: "أُلغي شكرك." });
});

test("reactAction surfaces the backend's one-voice 409 verbatim", async () => {
  thank.mockResolvedValue({
    ok: false,
    status: 409,
    unauthenticated: false,
    problem: {
      title: "Conflict",
      detail: "One thank per member per post — remove yours before thanking again",
      userMessage: undefined,
    },
  });

  const state = await reactAction({ status: "idle" }, formData({
    postId: POST_ID,
    reactedByMe: "false",
  }));

  expect(state.status).toBe("error");
  if (state.status === "error") {
    // The backend's own words, verbatim — the one-voice guard's voice.
    expect(state.message).toContain("One thank per member per post");
  }
});

test("reactAction with a dead session answers the reauth words before any write", async () => {
  const { getSession } = await import("@/lib/dal");
  vi.mocked(getSession).mockResolvedValueOnce(null);

  const state = await reactAction({ status: "idle" }, formData({
    postId: POST_ID,
    reactedByMe: "false",
  }));

  expect(state.status).toBe("error");
  expect(thank).not.toHaveBeenCalled();
  expect(unthank).not.toHaveBeenCalled();
});

test("reactAction rejects a malformed post id before any write", async () => {
  const state = await reactAction({ status: "idle" }, formData({
    postId: "not-a-uuid",
    reactedByMe: "false",
  }));

  expect(state.status).toBe("error");
  expect(thank).not.toHaveBeenCalled();
  expect(unthank).not.toHaveBeenCalled();
});
