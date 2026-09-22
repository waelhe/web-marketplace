"use client";

/**
 * Inbox action forms — the official useActionState pattern on the
 * stage-2/3 conventions. The preferences matrix is the one interactive
 * grid: it renders the backend's effective matrix (type × channel), keeps
 * the in-app (DB) column visibly always-on, and submits only the DIFF
 * (the stored matrix stays sparse — the backend's own design), serialized
 * through a single hidden field so the whole thing stays a plain form
 * (progressive enhancement holds pre-hydration).
 */

import { useActionState } from "react";
import {
  markReadAction,
  moveLeadAction,
  updatePreferencesAction,
  type ActionState,
} from "./actions";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPES,
  type LeadStatus,
  type NotificationChannel,
  type NotificationType,
  type PreferenceView,
} from "@/lib/api/inbox-contract";

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

/** Mark one notification read — a per-row form (the deletePost pattern). */
export function MarkReadForm({ notificationId }: { notificationId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(markReadAction, {
    status: "idle",
  });

  return (
    <form action={action}>
      <input type="hidden" name="id" value={notificationId} />
      <button type="submit" className="button" disabled={pending}>
        {pending ? "…" : "وضع علامة المقروء"}
      </button>
      {state.status === "error" ? <StateMessage state={state} /> : null}
    </form>
  );
}

/**
 * The L22 preference matrix. Only EMAIL/WS are switchable (DB is always
 * on — rendered disabled); on submit the component diffs its checkboxes
 * against the effective matrix it was rendered from and posts just those
 * switches, matching the backend's sparse upsert contract.
 */
export function PreferencesMatrix({ initial }: { initial: PreferenceView[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updatePreferencesAction,
    { status: "idle" },
  );

  /** Diff the form's checkbox states against the rendered matrix. */
  function collectDiff(form: HTMLFormElement): string {
    const diff: { type: NotificationType; channel: NotificationChannel; enabled: boolean }[] = [];
    const initialMap = new Map(
      initial.map((entry) => [`${entry.type}:${entry.channel}`, entry.enabled]),
    );
    for (const type of NOTIFICATION_TYPES) {
      for (const channel of NOTIFICATION_CHANNELS) {
        if (channel === "DB") continue; // always-on: not a switch
        const field = form.elements.namedItem(`${type}:${channel}`);
        if (!(field instanceof HTMLInputElement) || field.type !== "checkbox") continue;
        const key = `${type}:${channel}`;
        if (initialMap.get(key) !== field.checked) {
          diff.push({ type, channel, enabled: field.checked });
        }
      }
    }
    return JSON.stringify(diff);
  }

  return (
    <form
      action={action}
      onSubmit={(event) => {
        // Serialize the diff BEFORE the framework serializes the form —
        // the hidden field carries it into the action's FormData.
        const form = event.currentTarget;
        const field = form.elements.namedItem("diff");
        if (field instanceof HTMLInputElement) field.value = collectDiff(form);
      }}
    >
      <input type="hidden" name="diff" value="[]" />
      <table className="pref-matrix">
        <thead>
          <tr>
            <th scope="col">النوع</th>
            {NOTIFICATION_CHANNELS.map((channel) => (
              <th key={channel} scope="col">
                {NOTIFICATION_CHANNEL_LABELS[channel]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NOTIFICATION_TYPES.map((type) => (
            <tr key={type}>
              <th scope="row">{NOTIFICATION_TYPE_LABELS[type]}</th>
              {NOTIFICATION_CHANNELS.map((channel) => {
                const entry = initial.find((e) => e.type === type && e.channel === channel);
                const enabled = entry?.enabled ?? channel === "DB";
                if (channel === "DB") {
                  // The backend's invariant rendered honestly: always on.
                  // defaultChecked + disabled = uncontrolled, no React warning.
                  return (
                    <td key={channel}>
                      <input
                        type="checkbox"
                        defaultChecked
                        disabled
                        aria-label={`${NOTIFICATION_TYPE_LABELS[type]} — داخل التطبيق (مفعّل دائماً)`}
                      />
                    </td>
                  );
                }
                return (
                  <td key={channel}>
                    <input
                      type="checkbox"
                      name={`${type}:${channel}`}
                      defaultChecked={enabled}
                      aria-label={`${NOTIFICATION_TYPE_LABELS[type]} — ${NOTIFICATION_CHANNEL_LABELS[channel]}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <button type="submit" className="button" data-variant="primary" disabled={pending}>
          {pending ? "جارٍ الحفظ…" : "حفظ التفضيلات"}
        </button>
      </p>
      <StateMessage state={state} />
    </form>
  );
}

/** The lead's one-way move buttons (only legal targets render). */
export function LeadMoveForm({
  leadId,
  currentStatus,
  targets,
}: {
  leadId: string;
  currentStatus: LeadStatus;
  targets: LeadStatus[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(moveLeadAction, {
    status: "idle",
  });

  if (targets.length === 0) return null; // ARCHIVED is terminal — no moves

  return (
    <form action={action}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="current" value={currentStatus} />
      {targets.map((target) => (
        <button
          key={target}
          type="submit"
          name="status"
          value={target}
          className="button"
          disabled={pending}
        >
          {target === "READ" ? "علّمه مقروءاً" : "أرشِف"}
        </button>
      ))}
      <StateMessage state={state} />
    </form>
  );
}
