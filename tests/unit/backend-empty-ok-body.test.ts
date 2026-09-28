import { beforeEach, expect, test, vi } from "vitest";

// The regression pin for the Task-65 seam: the server data channel's ok
// path parses text-first — an empty 200 body (the measured mark-read
// shape: MessagingController.markAsRead → ResponseEntity.ok().build())
// resolves to { ok: true, data: null } instead of throwing
// "Unexpected end of JSON input" out of json(), which surfaced as a 500
// from markConversationReadAction and an unhandled browser rejection.
// On the pre-fix code every empty-body assertion below FAILS by throwing
// — that is the pin.

// The real module under test; only its auth chain is mocked (the
// form-accessibility.test.ts pattern — the real @/lib/auth eagerly
// validates BETTER_AUTH_SECRET, and next/headers only feeds the token
// resolution, which never runs against a network here: global fetch is
// stubbed per test).
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getAccessToken: vi.fn(async () => ({ accessToken: "unit-access-token" })),
    },
  },
}));

import { backendGet, backendSend, backendSendPublic } from "@/lib/api/server";

function stubOk(body: BodyInit | null, status = 200): Response {
  return new Response(body, { status });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

test("backendSend: a 200 with an empty body resolves ok with null data (the mark-read seam)", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(stubOk(null, 200));
  const result = await backendSend<null>(
    "POST",
    "/api/v1/messages/conversations/00000000-0000-4000-8000-000000000001/read",
  );
  expect(result).toEqual({ ok: true, data: null, status: 200 });
});

test("backendSend: whitespace-only 200 body also resolves to null", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(stubOk("   ", 200));
  const result = await backendSend<null>("POST", "/api/v1/anything");
  expect(result).toEqual({ ok: true, data: null, status: 200 });
});

test("backendSend: 204 keeps the documented null contract", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(stubOk(null, 204));
  const result = await backendSend<null>("DELETE", "/api/v1/media/00000000-0000-4000-8000-000000000002");
  expect(result).toEqual({ ok: true, data: null, status: 204 });
});

test("backendSend: a JSON 200 body still parses verbatim", async () => {
  const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    stubOk('{"id":"abc","position":1}', 200),
  );
  const result = await backendSend<{ id: string; position: number }>("POST", "/api/v1/media/uploads");
  expect(result).toEqual({ ok: true, data: { id: "abc", position: 1 }, status: 200 });
  // The channel shape is unchanged: direct BACKEND_URL call, Bearer attached.
  expect(spy.mock.calls[0][0]).toContain("/api/v1/media/uploads");
});

test("backendGet: an empty 200 body resolves ok with null data", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(stubOk(null, 200));
  const result = await backendGet<null>("/api/v1/some-empty-read");
  expect(result).toEqual({ ok: true, data: null, status: 200 });
});

test("backendGet: a JSON 200 body still parses verbatim", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(stubOk("[]", 200));
  const result = await backendGet<unknown[]>("/api/v1/media/listings/00000000-0000-4000-8000-000000000003");
  expect(result).toEqual({ ok: true, data: [], status: 200 });
});

test("backendSendPublic: an empty 200 body resolves ok with null data", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(stubOk(null, 200));
  const result = await backendSendPublic<null>("POST", "/api/v1/listings/leads");
  expect(result).toEqual({ ok: true, data: null, status: 200 });
});
