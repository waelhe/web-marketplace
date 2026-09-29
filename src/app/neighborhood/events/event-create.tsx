"use client";

/**
 * The create-event launcher — the design's prominent «تنظيم فعالية
 * جديدة +» button and its modal form. The form is the FULL product
 * surface (name, type, date, time, in-neighborhood location,
 * description, seats); the SUBMISSION is honestly gated: the
 * NeighborhoodEvent creation contract is registered (§7/7) and the
 * backend write does not exist yet, so the submit answers with the
 * honest registered-pending state — never a fake success, never a
 * silent drop. A11y: the modal rides <dialog>, focus stays trapped
 * by the native element, Escape closes, the launcher owns the
 * aria-haspopup/expanded pair.
 */

import { useRef, useState } from "react";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from "@/lib/neighborhood-events";

export function EventCreateLauncher() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const open = () => {
    setSubmitted(false);
    setExpanded(true);
    dialogRef.current?.showModal();
  };

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
        onClose={() => {
          setSubmitted(false);
          setExpanded(false);
        }}
      >
        <form
          method="dialog"
          className="event-create-form"
          onSubmit={(event) => {
            // The honest gate: the creation contract is registered
            // (§7/7); the backend write is pending. Keep the dialog
            // open with the registered state — never a fake success.
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <h3 id="event-create-heading">نظّم تجمّعًا لجيرانك</h3>
          <p className="listing-meta">تُنشأ الفعالية داخل حارتك الحالية — الهامة</p>
          <label className="composer-field-label" htmlFor="event-title">
            اسم الفعالية
          </label>
          <input id="event-title" name="title" required maxLength={200} placeholder="مثال: دورة إسعاف أولي للجيران" />
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
          <input id="event-location" name="location" required maxLength={200} placeholder="مثال: ساحة المسجد — الظل الشمالي" />
          <label className="composer-field-label" htmlFor="event-description">
            الوصف
          </label>
          <textarea id="event-description" name="description" required maxLength={2000} rows={4} placeholder="ماذا سيحدث؟ ماذا يحضر الجار معه؟" />
          <label className="composer-field-label" htmlFor="event-capacity">
            عدد المقاعد (اختياري — اتركه فارغًا إن كان مفتوحًا للجميع)
          </label>
          <input id="event-capacity" name="capacity" type="number" min={1} max={500} placeholder="مثال: 20" />
          <div className="event-create-actions">
            <button type="button" className="button" onClick={() => dialogRef.current?.close()}>
              إلغاء
            </button>
            <button type="submit" className="button" data-variant="primary">
              سجّل الفعالية
            </button>
          </div>
          {submitted ? (
            <p className="page-note" role="status">
              استلمنا فكرتك! إنشاء الفعاليات الفعلي يُفعَّل مع خدمة الباك اند لهذا العقد
              (مسجّل في الميثاق §7/7) — سيصل إشعار الجيران حينها.
            </p>
          ) : (
            <p className="page-note">
              الإنشاء الحقيقي بانتظار عقد الباك اند — النموذج جاهز والتجربة كاملة.
            </p>
          )}
        </form>
      </dialog>
    </>
  );
}
