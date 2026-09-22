"use client";

/**
 * The public contact form (L34) on the listing detail page — the
 * mediated-contact model: a guest leaves name, phone and a message; no
 * account is required (the backend's own "بلا مصادقة إلزامية"). A signed
 * visitor's token, when present, attributes the lead server-side — the
 * form itself never differs by session.
 *
 * useActionState on the house pattern; the inputs mirror the backend's
 * bean bounds (LeadRequest) so HTML validation and the action's checks
 * speak the same contract.
 */

import { useActionState } from "react";
import { submitLeadAction, type ActionState } from "./actions";

export function LeadForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitLeadAction, {
    status: "idle",
  });

  if (state.status === "success") {
    return (
      <p className="page-note" role="status">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="listingId" value={listingId} />
      <label htmlFor="lead-name">الاسم</label>
      <input
        id="lead-name"
        name="contactName"
        type="text"
        required
        minLength={1}
        maxLength={120}
        autoComplete="name"
        placeholder="اسمك"
      />
      <label htmlFor="lead-phone">رقم الهاتف</label>
      <input
        id="lead-phone"
        name="contactPhone"
        type="tel"
        required
        pattern="\+?[0-9]{7,15}"
        inputMode="tel"
        autoComplete="tel"
        dir="ltr"
        placeholder="+963991234567"
      />
      <p className="field-hint">٧–١٥ رقماً، مع «+» اختياري في البداية.</p>
      <label htmlFor="lead-message">رسالتك</label>
      <textarea
        id="lead-message"
        name="message"
        required
        minLength={1}
        maxLength={2000}
        rows={4}
        placeholder="اسأل عن الإعلان…"
      />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الإرسال…" : "أرسل طلب التواصل"}
      </button>
      {state.status === "error" ? (
        <p className="page-note" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
