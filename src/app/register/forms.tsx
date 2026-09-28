"use client";

/**
 * The public registration form (charter J1, slice S1) — the house
 * useActionState + Field pattern (bookings family): every input mirrors
 * the backend's own RegisterRequest bounds in HTML validation, local
 * validation errors bind to their control through aria-invalid +
 * aria-describedby, and the backend's problem+json words surface
 * honestly. The success state swaps the form for the activation note:
 * the account exists, and the NEXT step of the journey is the OAuth
 * sign-in round trip — so the sign-in entry renders right there.
 */

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type RegisterActionState } from "./actions";
import { Field } from "@/components/ui/field";
import { SignInButton } from "@/app/auth-buttons";

const IDLE: RegisterActionState = { status: "idle" };

export function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterActionState, FormData>(
    registerAction,
    IDLE,
  );

  if (state.status === "success") {
    return (
      <div className="stack-form" role="status">
        <p className="page-note">{state.message}</p>
        <SignInButton callbackURL="/profile" />
        <p className="field-hint">
          لديك حساب آخر؟ <Link href="/">سجّل الدخول</Link>
        </p>
      </div>
    );
  }

  const displayNameError =
    state.status === "error" && state.field === "displayName"
      ? state.message
      : undefined;
  const emailError =
    state.status === "error" && state.field === "email" ? state.message : undefined;
  const passwordError =
    state.status === "error" && state.field === "password"
      ? state.message
      : undefined;

  return (
    <form action={action} className="stack-form">
      <Field label="الاسم الظاهر (اختياري)" error={displayNameError} hint="سيظهر لأصحاب الإعلانات عند تواصلك معهم">
        <input
          name="displayName"
          type="text"
          maxLength={100}
          autoComplete="name"
          placeholder="مثال: أحمد أبو خالد"
        />
      </Field>
      <Field label="البريد الإلكتروني" error={emailError}>
        <input
          name="email"
          type="email"
          required
          maxLength={50}
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          placeholder="name@example.com"
        />
      </Field>
      <Field
        label="كلمة المرور"
        error={passwordError}
        hint="٨ حرفاً على الأقل — ستحتاجها لتسجيل الدخول"
      >
        <input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          dir="ltr"
        />
      </Field>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ إنشاء الحساب…" : "أنشئ الحساب"}
      </button>
      {state.status === "error" && !state.field ? (
        <p className="page-note" role="alert">
          {state.message}
        </p>
      ) : null}
      <p className="field-hint">
        لديك حساب بالفعل؟ <Link href="/">سجّل الدخول</Link>
      </p>
    </form>
  );
}
