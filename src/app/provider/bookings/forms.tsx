"use client";

/**
 * The availability slot publish form (roadmap stage 6 — the
 * exact-slot gate's provider side). datetime-local inputs carry no
 * timezone (HTML spec), so the values are interpreted AS UTC — the
 * same instant space the consumer's booking request speaks (that is
 * what the backend's exact-slot gate compares, measured). The action
 * normalizes to ISO instants; the backend's own validation is the
 * authority.
 */

import { useActionState } from "react";
import { publishSlotAction, type ActionState } from "./actions";

const IDLE: ActionState = { status: "idle" };

export function SlotPublishForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    publishSlotAction,
    IDLE,
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="slot-starts">بداية الفتحة (بتوقيت UTC)</label>
      <input id="slot-starts" name="startsAt" type="datetime-local" required dir="ltr" />
      <label htmlFor="slot-ends">نهاية الفتحة (بتوقيت UTC)</label>
      <input id="slot-ends" name="endsAt" type="datetime-local" required dir="ltr" />
      <p className="field-hint">
        نافذة الفتحة نصف مفتوحة [البدء، النهاية) — طلب حجز الضيف يقبله الخادم
        فقط إذا طابق فتحة منشورة تمامًا.
      </p>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ النشر…" : "انشر الفتحة"}
      </button>
      {state.status === "error" ? (
        <p className="page-note" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p className="page-note" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
