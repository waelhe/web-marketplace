"use client";

/**
 * The business-page editor forms (W2 — yelp-level plan §5, #489): the
 * hours replacement, the services menu (add/edit/move/remove), the
 * area declaration, and the verification claim. The house discipline
 * verbatim — useActionState forms whose expected failures arrive as
 * data (StateMessage), the backend's own gates teach, and refresh()
 * re-renders the page's server read (the public page read IS the
 * editors' source of truth) in place.
 */

import { useActionState } from "react";
import {
  addServiceAreaAction,
  addServiceAction,
  moveServiceAction,
  removeServiceAction,
  replaceBusinessHoursAction,
  submitVerificationAction,
  updateServiceAction,
  type ActionState,
} from "./actions";
import {
  SERVICE_CURRENCY_MAX_LENGTH,
  SERVICE_DESCRIPTION_MAX_LENGTH,
  SERVICE_TITLE_MAX_LENGTH,
  type OfferedServiceView,
} from "@/lib/api/reputation-contract";
import { Field } from "@/components/ui/field";

const IDLE: ActionState = { status: "idle" };

function StateMessage({ state }: { state: ActionState }) {
  if (state.status === "error") {
    return (
      <p className="hy-state" role="alert">
        {state.message}
      </p>
    );
  }
  if (state.status === "success") {
    return (
      <p className="hy-state" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

/** One weekday row of the hours editor's initial state. */
export interface HoursRowInit {
  dayOfWeek: string;
  dayLabel: string;
  declared: boolean;
  opensAt: string;
  closesAt: string;
}

/**
 * The hours editor — the PUT replacement semantics made visible: each
 * weekday row is a checkbox (declared) + the day's window; the request
 * IS the declared week (the checked days alone ride the submit). The
 * time inputs are `type="time"` ("HH:MM" — the LocalTime partial the
 * backend parses); the hidden day key rides each checked row.
 */
export function BusinessHoursForm({
  profileId,
  initial,
}: {
  profileId: string;
  initial: HoursRowInit[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    replaceBusinessHoursAction,
    IDLE,
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="profileId" value={profileId} />
      <ul className="biz-hours-editor">
        {initial.map((row) => {
          const fieldId = `hours-${row.dayOfWeek}`;
          return (
            <li key={row.dayOfWeek} className="biz-hours-row">
              <label className="biz-day-toggle">
                <input type="checkbox" name={`declared-${row.dayOfWeek}`} defaultChecked={row.declared} />
                <span>{row.dayLabel}</span>
              </label>
              <label className="page-note" htmlFor={`${fieldId}-opens`}>
                من
              </label>
              <input
                id={`${fieldId}-opens`}
                name={`opens-${row.dayOfWeek}`}
                type="time"
                dir="ltr"
                defaultValue={row.opensAt}
              />
              <label className="page-note" htmlFor={`${fieldId}-closes`}>
                إلى
              </label>
              <input
                id={`${fieldId}-closes`}
                name={`closes-${row.dayOfWeek}`}
                type="time"
                dir="ltr"
                defaultValue={row.closesAt}
              />
            </li>
          );
        })}
      </ul>
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "احفظ أسبوع العمل"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * The service fields block shared by the add and edit forms — the
 * entity's own authored bounds mirrored (title ≤200 required,
 * description ≤1000, positive duration, the money pair together or not
 * at all, ISO 4217). The price rides MAJOR units (the ledger display
 * convention — the action converts to cents).
 */
function ServiceFields({ prefix, service }: { prefix: string; service?: OfferedServiceView }) {
  return (
    <>
      <Field label="اسم الخدمة">
        <input
          id={`${prefix}-title`}
          name="title"
          type="text"
          required
          maxLength={SERVICE_TITLE_MAX_LENGTH}
          defaultValue={service?.title}
        />
      </Field>
      <Field label="الوصف (اختياري)">
        <textarea
          id={`${prefix}-description`}
          name="description"
          rows={2}
          maxLength={SERVICE_DESCRIPTION_MAX_LENGTH}
          defaultValue={service?.description ?? ""}
        />
      </Field>
      <Field label="المدة بالدقائق (اختياري)">
        <input
          id={`${prefix}-duration`}
          name="durationMinutes"
          type="number"
          min={1}
          dir="ltr"
          defaultValue={service?.durationMinutes ?? ""}
        />
      </Field>
      <Field label="السعر (ريال — اختياري)">
        <input
          id={`${prefix}-price`}
          name="price"
          type="number"
          min={0}
          step="0.01"
          dir="ltr"
          defaultValue={
            service?.priceCents !== null && service?.priceCents !== undefined
              ? String(service.priceCents / 100)
              : ""
          }
        />
      </Field>
      <Field label="العملة (ISO 4217)">
        <input
          id={`${prefix}-currency`}
          name="currency"
          type="text"
          maxLength={SERVICE_CURRENCY_MAX_LENGTH}
          placeholder="SAR"
          dir="ltr"
          defaultValue={service?.currency ?? ""}
        />
      </Field>
    </>
  );
}

/** The add form — appends one row (the position auto-allocates). */
export function ServiceAddForm({ profileId }: { profileId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addServiceAction,
    IDLE,
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="profileId" value={profileId} />
      <ServiceFields prefix="service-add" />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ الإضافة…" : "أضف الخدمة"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/** The edit form — PUT replacement of the row's display fields. */
export function ServiceEditForm({
  profileId,
  service,
  positionLabel,
}: {
  profileId: string;
  service: OfferedServiceView;
  positionLabel: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateServiceAction,
    IDLE,
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="serviceId" value={service.id} />
      <p className="page-note">الخدمة {new Intl.NumberFormat("ar").format(positionLabel)} (الترتيب {new Intl.NumberFormat("ar").format(service.position + 1)})</p>
      <ServiceFields prefix={`service-${service.id}`} service={service} />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "احفظ الخدمة"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * The move pair — ▲/▼ one step each (the swap semantics: the target's
 * occupant takes the mover's old position). Disabled at the menu's own
 * bounds (the first row's up and the last row's down are no-ops the
 * contract would still charge — the honest disabled state).
 */
export function ServiceMoveForms({
  profileId,
  serviceId,
  position,
  min,
  max,
}: {
  profileId: string;
  serviceId: string;
  position: number;
  min: number;
  max: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    moveServiceAction,
    IDLE,
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <button
        type="submit"
        name="position"
        value={String(position - 1)}
        className="hy-react-btn"
        disabled={pending || position <= min}
        aria-label="حرّك الخدمة لأعلى"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          keyboard_arrow_up
        </span>
        <span>أعلى</span>
      </button>
      <button
        type="submit"
        name="position"
        value={String(position + 1)}
        className="hy-react-btn"
        disabled={pending || position >= max}
        aria-label="حرّك الخدمة لأسفل"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          keyboard_arrow_down
        </span>
        <span>أسفل</span>
      </button>
      {state.status !== "idle" ? <StateMessage state={state} /> : null}
    </form>
  );
}

/** The withdraw form — soft delete (204). */
export function ServiceRemoveForm({
  profileId,
  serviceId,
}: {
  profileId: string;
  serviceId: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    removeServiceAction,
    IDLE,
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <button
        type="submit"
        className="hy-react-btn"
        disabled={pending}
        aria-label="اسحب الخدمة من القائمة"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          delete
        </span>
        <span>{pending ? "جارٍ السحب…" : "اسحب الخدمة"}</span>
      </button>
      {state.status !== "idle" ? <StateMessage state={state} /> : null}
    </form>
  );
}

/**
 * The area declaration — one geo node (`?areaParent=`'s own key or a
 * child's row button). The backend's gates teach: a node already
 * declared answers 409, an unknown node 404 (the FK's own law).
 */
export function ServiceAreaAddForm({
  profileId,
  locationId,
}: {
  profileId: string;
  locationId: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addServiceAreaAction,
    IDLE,
  );

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="locationId" value={locationId} />
      <button
        type="submit"
        className="hy-react-btn"
        disabled={pending}
        aria-label="أعلن نطاق خدمة"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          add_location_alt
        </span>
        <span>{pending ? "جارٍ الإعلان…" : "أعلنها نطاق خدمة"}</span>
      </button>
      {state.status !== "idle" ? <StateMessage state={state} /> : null}
    </form>
  );
}

/**
 * The verification claim — queues the claim for administrative
 * resolution (UNVERIFIED/REJECTED → PENDING; the Envers trail is the
 * record). No body: the claim is the provider's own standing.
 */
export function VerificationSubmitForm({ profileId }: { profileId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    submitVerificationAction,
    IDLE,
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="profileId" value={profileId} />
      <button type="submit" className="button" data-variant="primary" disabled={pending}>
        {pending ? "جارٍ التقديم…" : "قدّم طلب توثيق الملكية"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}
