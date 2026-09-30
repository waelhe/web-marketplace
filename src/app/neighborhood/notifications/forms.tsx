"use client";

/**
 * Wing-skinned notification forms (slice N1) — the same official
 * useActionState pattern the inbox rides, reusing the INBOX'S OWN
 * server actions verbatim (markReadAction / updatePreferencesAction:
 * same POST-only Server-Action boundary, same session re-check, same
 * backend authority). Only the PRESENTATION is the wing's (the .hy
 * design tokens) — one channel, a second surface, never a second
 * channel.
 */

import { useActionState } from "react";
import {
  markReadAction,
  updatePreferencesAction,
  type ActionState,
} from "@/app/inbox/actions";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPES,
  type NotificationChannel,
  type NotificationType,
  type PreferenceView,
} from "@/lib/api/inbox-contract";

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

/** Mark one notification read — a per-row form (the deletePost pattern). */
export function MarkReadForm({ notificationId }: { notificationId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(markReadAction, {
    status: "idle",
  });

  return (
    <form action={action}>
      <input type="hidden" name="id" value={notificationId} />
      <button type="submit" className="hy-btn hy-btn-soft" disabled={pending}>
        {pending ? "…" : "وضع علامة المقروء"}
      </button>
      {state.status === "error" ? <StateMessage state={state} /> : null}
    </form>
  );
}

/**
 * The L22 preference matrix in the wing's skin. Only EMAIL/WS are
 * switchable (DB is always on — rendered disabled); on submit the
 * component diffs its checkboxes against the effective matrix it was
 * rendered from and posts just those switches, matching the backend's
 * sparse upsert contract (the same serialization the inbox's matrix
 * rides).
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
      <div className="hy-matrix-wrap">
        <table className="hy-matrix">
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
                        disabled={pending}
                        aria-label={`${NOTIFICATION_TYPE_LABELS[type]} — ${NOTIFICATION_CHANNEL_LABELS[channel]}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="hy-real-actions">
        <button type="submit" className="hy-btn hy-btn-soft" disabled={pending}>
          {pending ? "…" : "حفظ التفضيلات"}
        </button>
        <StateMessage state={state} />
      </div>
    </form>
  );
}
