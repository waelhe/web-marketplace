"use client";

/**
 * The create-event launcher — the design's prominent «تنظيم فعالية
 * جديدة +» button and its modal form. N6 (gap #4 served, 2026-10-01):
 * the submission went REAL — the form rides organizeAction (the
 * backend's own POST /api/v1/neighborhood/events contract): the
 * Arabic gates mirror the backend's type gates (the vocabulary, the
 * bounds, the future-time rule), the backend re-validates and owns
 * the authorization, and success closes the modal after the board's
 * refresh() re-render carries the new event.
 *
 * A11y: the modal rides <dialog>, focus stays trapped by the native
 * element, Escape closes, the launcher owns the aria-haspopup/expanded
 * pair. The submit button rides the action's pending state.
 */

import { useActionState, useEffect, useRef, useState } from "react";
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
} from "@/lib/neighborhood-events";
import { organizeAction, type EventsActionState } from "./actions";

/** The inline state note (the house forms' own shape). */
function StateMessage({ state }: { state: EventsActionState }) {
  if (state.status === "idle") return null;
  return (
    <p className={state.status === "error" ? "form-error" : "page-note"} role="status">
      {state.message}
    </p>
  );
}

export function EventCreateLauncher({ locationId }: { locationId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [state, action, pending] = useActionState<EventsActionState, FormData>(
    organizeAction,
    { status: "idle" },
  );

  const open = () => {
    setExpanded(true);
    dialogRef.current?.showModal();
  };

  const close = () => {
    setExpanded(false);
    dialogRef.current?.close();
  };

  // Success closes the modal one render after the note paints — the
  // board's refresh() already carries the new event underneath (the
  // official effect seam, no render-phase side effects).
  useEffect(() => {
    if (state.status === "success" && dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [state.status]);

  return (
    <>
      <button
        type="button"
        className="button event-create-btn"
        aria-haspopup="dialog"
        aria-expanded={expanded}
        onClick={open}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z" />
        </svg>
        تنظيم فعالية جديدة
      </button>
      <dialog
        ref={dialogRef}
        className="event-create-modal"
        aria-labelledby="event-create-heading"
        onClose={close}
      >
        <form action={action} className="event-create-form">
          <h3 id="event-create-heading">نظّم تجمّعًا لجيرانك</h3>
          <p className="listing-meta">تُنشأ الفعالية داخل حارتك الحالية — الهامة</p>
          <input type="hidden" name="locationId" value={locationId} />
          <label className="composer-field-label" htmlFor="event-title">
            اسم الفعالية
          </label>
          <input
            id="event-title"
            name="title"
            required
            maxLength={200}
            placeholder="مثال: دورة إسعاف أولي للجيران"
          />
          <label className="composer-field-label" htmlFor="event-category">
            النوع
          </label>
          <select id="event-category" name="category" defaultValue="SOCIAL">
            {EVENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {EVENT_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
          <div className="event-create-row">
            <div>
              <label className="composer-field-label" htmlFor="event-date">
                التاريخ
              </label>
              <input id="event-date" name="date" type="date" required />
            </div>
            <div>
              <label className="composer-field-label" htmlFor="event-time">
                الوقت
              </label>
              <input id="event-time" name="time" type="time" required defaultValue="17:00" />
            </div>
          </div>
          <label className="composer-field-label" htmlFor="event-location">
            الموقع داخل الحي
          </label>
          <input
            id="event-location"
            name="location"
            required
            maxLength={200}
            placeholder="مثال: ساحة المسجد — الظل الشمالي"
          />
          <label className="composer-field-label" htmlFor="event-description">
            الوصف
          </label>
          <textarea
            id="event-description"
            name="description"
            required
            maxLength={2000}
            rows={4}
            placeholder="ماذا سيحدث؟ ماذا يحضر الجار معه؟"
          />
          <label className="composer-field-label" htmlFor="event-capacity">
            عدد المقاعد (اختياري — اتركه فارغًا إن كان مفتوحًا للجميع)
          </label>
          <input
            id="event-capacity"
            name="capacity"
            type="number"
            min={1}
            max={500}
            placeholder="مثال: 20"
          />
          <div className="event-create-actions">
            <button type="button" className="button" onClick={close}>
              إلغاء
            </button>
            <button type="submit" className="button" data-variant="primary" disabled={pending}>
              {pending ? "جارٍ التسجيل…" : "سجّل الفعالية"}
            </button>
          </div>
          <StateMessage state={state} />
        </form>
      </dialog>
    </>
  );
}
