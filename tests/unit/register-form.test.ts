import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { registerAction } from "@/app/register/actions";
import { RegisterForm } from "@/app/register/forms";
import { backendSendPublic } from "@/lib/api/server";

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

vi.mock("@/lib/api/server", () => ({
  backendSendPublic: vi.fn(),
  backendGet: vi.fn(),
  backendSend: vi.fn(),
}));

const sendPublic = vi.mocked(backendSendPublic);

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

function expectFieldError(markup: string, name: string, message: string) {
  const control = markup.match(new RegExp(`<[^>]+name="${name}"[^>]*>`))?.[0];
  expect(control).toBeDefined();
  expect(control).toContain('aria-invalid="true"');

  const describedBy = control?.match(/aria-describedby="([^"]+)"/)?.[1];
  expect(describedBy).toBeDefined();
  // A field can carry hint + error together — the error paragraph's id is
  // one of the described-by tokens and is the one carrying role="alert".
  const errorId = describedBy?.split(" ").find((id) => id.includes("field-error"));
  expect(errorId).toBeDefined();
  expect(markup).toContain(`id="${errorId}" role="alert"`);
  expect(markup).toContain(message);
}

const VALID = {
  displayName: "مستخدم اختبار",
  email: "qa-unit@example.com",
  password: "QaFlow-2026-Verify!",
};

test("register local validation errors bind to their controls", async () => {
  // Short password (field mirror of the 8–72 bean bound).
  const shortPassword = await registerAction(
    { status: "idle" },
    formData({ ...VALID, password: "short" }),
  );
  expect(shortPassword).toEqual({
    status: "error",
    field: "password",
    message: "كلمة المرور: ٨–٧٢ حرفاً.",
  });
  if (shortPassword.status !== "error") throw new Error("expected error");
  actionState.current = shortPassword;
  expectFieldError(
    renderToStaticMarkup(createElement(RegisterForm)),
    "password",
    shortPassword.message,
  );

  // Malformed email.
  const badEmail = await registerAction(
    { status: "idle" },
    formData({ ...VALID, email: "not-an-email" }),
  );
  expect(badEmail).toEqual({
    status: "error",
    field: "email",
    message: "أدخل بريداً إلكترونياً صحيحاً (مثل name@example.com).",
  });

  // Over-bound displayName (the only bound the optional field carries).
  const longName = "ا".repeat(101);
  const badName = await registerAction(
    { status: "idle" },
    formData({ ...VALID, displayName: longName }),
  );
  if (badName.status !== "error") throw new Error("expected error");
  expect(badName.field).toBe("displayName");
});

test("the 409 CONFLICT-001 duplicate carries the accurate Arabic words on the email field", async () => {
  sendPublic.mockResolvedValue({
    ok: false,
    status: 409,
    problem: {
      detail: "An account already exists for this email",
      errorCode: "CONFLICT-001",
      userMessage: "The resource changed while you were working on it. Please try again.",
    },
    unauthenticated: false,
  });
  const state = await registerAction({ status: "idle" }, formData(VALID));
  expect(state).toEqual({
    status: "error",
    field: "email",
    message: "هذا البريد مسجّل لدينا بالفعل — سجّل الدخول أو استخدم بريداً آخر.",
  });
  if (state.status !== "error") throw new Error("expected error");
  actionState.current = state;
  expectFieldError(
    renderToStaticMarkup(createElement(RegisterForm)),
    "email",
    state.message,
  );
});

test("other problems surface verbatim (userMessage first), form-level", async () => {
  sendPublic.mockResolvedValue({
    ok: false,
    status: 400,
    problem: { detail: "Invalid request content.", title: "Bad Request" },
    unauthenticated: false,
  });
  const state = await registerAction({ status: "idle" }, formData(VALID));
  expect(state).toEqual({
    status: "error",
    message: "Invalid request content.",
  });
  // Form-level error: the alert renders, no control goes aria-invalid.
  actionState.current = state;
  const markup = renderToStaticMarkup(createElement(RegisterForm));
  expect(markup).toContain('role="alert"');
  expect(markup).not.toContain('aria-invalid="true"');
});

test("the happy path posts the measured contract body and returns the activation note", async () => {
  sendPublic.mockResolvedValue({
    ok: true,
    status: 201,
    data: {
      id: "17b10f8f-5639-4e80-9533-1fe257662953",
      email: "qa-unit@example.com",
      displayName: "مستخدم اختبار",
    },
  });
  const state = await registerAction({ status: "idle" }, formData(VALID));
  expect(sendPublic).toHaveBeenCalledWith("POST", "/api/v1/auth/register", {
    email: "qa-unit@example.com",
    password: "QaFlow-2026-Verify!",
    displayName: "مستخدم اختبار",
  });
  expect(state).toEqual({
    status: "success",
    message:
      "أُنشئ حسابك. سجّل الدخول الآن بالبريد وكلمة المرور نفسها لتفعيل جلستك.",
  });
  // Empty displayName is omitted from the body entirely (optional field).
  await registerAction(
    { status: "idle" },
    formData({ email: "qa-unit@example.com", password: "QaFlow-2026-Verify!" }),
  );
  expect(sendPublic).toHaveBeenLastCalledWith("POST", "/api/v1/auth/register", {
    email: "qa-unit@example.com",
    password: "QaFlow-2026-Verify!",
  });
});

test("the anonymous form shell stays public and complete: three fields, no gate", () => {
  actionState.current = { status: "idle" };
  const markup = renderToStaticMarkup(createElement(RegisterForm));
  expect(markup).toContain('name="displayName"');
  expect(markup).toContain('name="email"');
  expect(markup).toContain('name="password"');
  expect(markup).toContain('autoComplete="new-password"');
  // The sign-in affordance rides the form footer (journey's next step).
  expect(markup).toContain("سجّل الدخول");
});
