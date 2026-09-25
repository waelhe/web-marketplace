"use client";

/**
 * The availability slot publish form (roadmap stage 6 — the
 * exact-slot gate's provider side) + the batch-2 spec §5 pair: the
 * weekly rule form and the time-off form. datetime-local inputs carry
 * no timezone (HTML spec), so the values are interpreted AS UTC — the
 * same instant space the consumer's booking request speaks (that is
 * what the backend's exact-slot gate compares, measured). The actions
 * normalize to the wire forms; the backend's own validation is the
 * authority.
 */

import { useActionState } from "react";
import {
  createRuleAction,
  createTimeOffAction,
  publishSlotAction,
  type ActionState,
} from "./actions";
import {
  WEEK_DAY_LABELS,
  WEEK_DAYS,
  type WeekDay,
} from "@/lib/api/booking-contract";

const IDLE: ActionState = { status: "idle" };

function StateMessage({ state }: { state: ActionState }) {
  if (state.status === "error") {
    return (
      <p className="page-note" role="alert">
        {state.message}
      </p>
    );
  }
  if (state.status === "success") {
    return (
      <p className="page-note" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

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
      <StateMessage state={state} />
    </form>
  );
}

/**
 * «قاعدة أسبوعية» — the recurring weekly window (batch-2 spec §5):
 * dayOfWeek + HH:mm times on the MEASURED query-string contract. The
 * backend's slot generator expands the rule into concrete slots — the
 * refreshed slots list above carries the effect. The contract exposes
 * no rules read/delete (measured): the created entity's echo in the
 * success state is the whole surface — stated honestly in the hint.
 */
export function AvailabilityRuleForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createRuleAction,
    IDLE,
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="rule-day">اليوم</label>
      <select id="rule-day" name="dayOfWeek" required defaultValue="FRIDAY" dir="ltr">
        {WEEK_DAYS.map((day) => (
          <option key={day} value={day}>
            {WEEK_DAY_LABELS[day as WeekDay]}
          </option>
        ))}
      </select>
      <label htmlFor="rule-start">بداية النافذة اليومية</label>
      <input id="rule-start" name="startTime" type="time" required dir="ltr" />
      <label htmlFor="rule-end">نهاية النافذة اليومية</label>
      <input id="rule-end" name="endTime" type="time" required dir="ltr" />
      <p className="field-hint">
        القاعدة تتكرر أسبوعياً ويوسّعها مولّد الفتحات في دورته اليومية إلى
        فتحات ملموسة (لا توليد لحظياً — حدث DayHasPassed المقيس). لا توجد
        قراءة أو حذف للقواعد في العقد بعد — الإنشاء هو السطح المتاح.
      </p>
      <button type="submit" className="button" disabled={pending}>
        {pending ? "جارٍ الإنشاء…" : "أنشئ القاعدة"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}

/**
 * «تعطيل نافذة» — block a time-off window (batch-2 spec §5): the
 * window becomes unavailable (conflicts with booking and search
 * availability — the backend's own words). Same UTC instant
 * convention as the slot publish; no read/delete in the contract
 * (measured) — stated honestly in the hint.
 */
export function TimeOffForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createTimeOffAction,
    IDLE,
  );

  return (
    <form action={action} className="stack-form">
      <label htmlFor="timeoff-starts">بداية التعطيل (بتوقيت UTC)</label>
      <input id="timeoff-starts" name="startsAt" type="datetime-local" required dir="ltr" />
      <label htmlFor="timeoff-ends">نهاية التعطيل (بتوقيت UTC)</label>
      <input id="timeoff-ends" name="endsAt" type="datetime-local" required dir="ltr" />
      <p className="field-hint">
        النافذة نصف مفتوحة [البدء، النهاية) — تُحجب عن الحجز والبحث. لا
        توجد قراءة أو حذف للتعطيل في العقد بعد — الإنشاء هو السطح المتاح.
      </p>
      <button type="submit" className="button" disabled={pending}>
        {pending ? "جارٍ التعطيل…" : "عطّل النافذة"}
      </button>
      <StateMessage state={state} />
    </form>
  );
}
