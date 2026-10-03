"use client";

/**
 * The create-poll pair — the composer's «استطلاع رأي» chip went REAL
 * (N12, L52 — gap #7 served: the registered creation contract
 * `POST /api/v1/neighborhood/polls` is live). The modal is the
 * EventCreateLauncher's own pattern verbatim: <dialog> with native
 * focus trapping, Escape close, the launcher owning the
 * aria-haspopup/expanded pair; the form rides createPollAction (the
 * backend's own gates: the L41 publish gate, the 2–5 cardinality rule
 * with the registered contract's words — the backend re-validates and
 * owns the authorization), and success closes the modal after the
 * feed's refresh() re-render carries the fresh LATEST poll into the
 * featured zone.
 *
 * TWO pieces by HTML law (nested forms are invalid): the CHIP renders
 * inside the composer's type fieldset (the design's own skin — the
 * ballot chip, styled by the same .hy-composer-type class), and the
 * DIALOG renders as a SIBLING of the whole post form — the composer
 * owns the ref + expanded state and hands them to both pieces.
 */

import { useActionState, useEffect } from "react";
import { createPollAction, type ActionState } from "./actions";

/** The inline state note (the house forms' own shape). */
function StateMessage({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;
  return (
    <p className={state.status === "error" ? "form-error" : "page-note"} role="status">
      {state.message}
    </p>
  );
}

/** The option inputs' count bounds — the registered contract's own «ONE question, 2–5 options». */
const OPTION_SLOTS = 5;
const MIN_FILLED_OPTIONS = 2;

/**
 * The composer's launcher chip — the design's ballot chip, now a REAL
 * button (the gated «قريبًا» span retired with its reason when the
 * L52 contract landed). A poll is NOT a post category — the backend's
 * own vocabulary keeps them separate surfaces, and the chip never
 * fakes a category radio.
 */
export function PollCreateChip({
  expanded,
  onOpen,
}: {
  expanded: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="hy-composer-type"
      aria-haspopup="dialog"
      aria-expanded={expanded}
      onClick={onOpen}
      title="استطلاع رأي حيّ — سؤال واحد وخيارات يصوّت عليها الجيران"
    >
      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: "0.9375rem" }}>
        ballot
      </span>
      <span>استطلاع رأي</span>
    </button>
  );
}

/**
 * The modal itself — a SIBLING of the post form (never nested inside
 * it). Owns the action state; success closes after the feed's
 * refresh() carries the fresh poll.
 */
export function PollCreateDialog({
  dialogRef,
  locationId,
  onClose,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  locationId: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createPollAction,
    { status: "idle" },
  );

  // Success closes the modal one render after the note paints — the
  // feed's refresh() already carries the fresh poll underneath (the
  // EventCreateLauncher's own effect seam, no render-phase effects).
  useEffect(() => {
    if (state.status === "success" && dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [state.status, dialogRef]);

  return (
    <dialog
      ref={dialogRef}
      className="event-create-modal"
      aria-labelledby="poll-create-heading"
      onClose={onClose}
    >
      <form action={action} className="event-create-form">
        <h3 id="poll-create-heading">استطلع رأي جيرانك</h3>
        <p className="listing-meta">سؤال واحد ومن خيارين إلى خمسة — صوت واحد لكل عضو</p>
        <input type="hidden" name="locationId" value={locationId} />
        <label className="composer-field-label" htmlFor="poll-question">
          السؤال
        </label>
        <input
          id="poll-question"
          name="question"
          required
          minLength={1}
          maxLength={200}
          placeholder="مثال: ما المواعيد الأنسب لفتح الممشى المظلل خلال الصيف؟"
        />
        <label className="composer-field-label" htmlFor="poll-author">
          الجهة الطارحة للتسمية على البطاقة
        </label>
        <input
          id="poll-author"
          name="authorLabel"
          required
          minLength={1}
          maxLength={200}
          defaultValue="لجنة تطوير الحي"
          placeholder="مثال: لجنة تطوير الحي"
        />
        <label className="composer-field-label" htmlFor="poll-option1">
          الخيارات (خياران على الأقل — اترك الباقي فارغًا)
        </label>
        {Array.from({ length: OPTION_SLOTS }, (_, index) => (
          <input
            key={index}
            id={`poll-option${index + 1}`}
            name={`option${index + 1}`}
            // The first two slots carry the required pair; the rest
            // stay optional (the action collects the filled labels and
            // the backend's cardinality gate owns the 2–5 rule).
            required={index < MIN_FILLED_OPTIONS}
            maxLength={200}
            placeholder={
              index === 0
                ? "مثال: الفجر — ٥:٣٠ إلى ٨:٠٠"
                : index === 1
                  ? "مثال: المساء — ٥:٠٠ إلى ٨:٣٠"
                  : "خيار إضافي (اختياري)"
            }
          />
        ))}
        <div className="event-create-actions">
          <button type="button" className="button" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="button" data-variant="primary" disabled={pending}>
            {pending ? "جارٍ النشر…" : "انشر الاستطلاع"}
          </button>
        </div>
        <StateMessage state={state} />
      </form>
    </dialog>
  );
}
