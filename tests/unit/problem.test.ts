import { describe, expect, it } from "vitest";
import { decodeProblem, problemMessage } from "@/lib/problem";

describe("decodeProblem", () => {
  it("rejects non-records", () => {
    expect(decodeProblem(null)).toBeNull();
    expect(decodeProblem(undefined)).toBeNull();
    expect(decodeProblem("oops")).toBeNull();
    expect(decodeProblem(500)).toBeNull();
    expect(decodeProblem([{ title: "x" }])).toBeNull();
  });

  it("rejects records with zero known fields", () => {
    expect(decodeProblem({})).toBeNull();
    // The BFF relay 401 contract is NOT problem+json — it must decode null,
    // locking the two-contract design (plain 401 vs RFC7807 problem).
    expect(
      decodeProblem({ error: "unauthenticated", reauth: true }),
    ).toBeNull();
  });

  it("preserves a full problem body verbatim", () => {
    const body = {
      type: "https://marketplace.com/errors/validation",
      title: "Validation failed",
      status: 400,
      detail: "unsupported sort property",
      instance: "/api/v1/search",
      errorCode: "VAL-001",
      category: "validation",
      userMessage: "ترتيب غير مدعوم",
      fieldErrors: [{ field: "sort", message: "unsupported" }],
    };
    expect(decodeProblem(body)).toEqual(body);
  });

  it("drops empty-string fields and non-finite status", () => {
    expect(decodeProblem({ title: "", status: 200 })).toEqual({
      status: 200,
    });
    expect(decodeProblem({ status: NaN })).toBeNull();
    expect(decodeProblem({ status: "200" })).toBeNull();
  });

  it("normalizes fieldErrors defensively", () => {
    // Empty/non-array fieldErrors leave zero known fields → null (not {}).
    expect(decodeProblem({ fieldErrors: [] })).toBeNull();
    expect(decodeProblem({ fieldErrors: "nope" })).toBeNull();
    expect(
      decodeProblem({
        fieldErrors: [
          { field: "q", message: "bad" },
          { field: "", message: "" },
          { field: "x" },
        ],
      }),
    ).toEqual({
      fieldErrors: [
        { field: "q", message: "bad" },
        { field: "x", message: "" },
      ],
    });
  });
});

describe("problemMessage", () => {
  it("prefers userMessage, then detail, then title, then fallback", () => {
    expect(
      problemMessage(
        { userMessage: "u", detail: "d", title: "t" },
        "fb",
      ),
    ).toBe("u");
    expect(problemMessage({ detail: "d", title: "t" }, "fb")).toBe("d");
    expect(problemMessage({ title: "t" }, "fb")).toBe("t");
    expect(problemMessage(null, "fb")).toBe("fb");
    expect(problemMessage({}, "fb")).toBe("fb");
  });
});
