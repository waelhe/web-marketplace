"use client";

/**
 * The events board — the interactive heart of /neighborhood/events
 * (the owner-supplied design: filter chips, the featured initiative
 * with its attendance action, and the events grid with the three
 * registration states). N6 (gap #4 served, 2026-10-01): the board went
 * REAL — the attendance is a LIVE RSVP write through the backend's own
 * pair (POST/DELETE /api/v1/events/{id}/rsvp), the seat count is the
 * server's own grouped count (attending — refresh() re-renders it from
 * the board read, never client arithmetic), and the joined state is
 * the read's own rsvpedByMe flag (never client-invented state).
 *
 * The board's shape stays the S9 display shape verbatim (the page maps
 * the backend's locationLabel/organizerLabel into it — ONE adaptation
 * point at the seam): zero visual changes, real reads in the seats.
 * The design's «تطوّع مع التنظيم» action on the featured card retired
 * with the display layer: the backend contract has ONE seat kind (the
 * L49 javadoc documents «تطوّع» as a widening point) — a button with
 * no write behind it is a fake write, and this surface never fakes
 * one.
 */

import { useActionState, useMemo, useState } from "react";
import type { NeighborhoodEvent } from "@/lib/neighborhood-events";
import {
  EVENT_CATEGORY_LABELS,
  EVENT_FILTERS,
  EVENT_REGISTRATION_LABELS,
  filterEvents,
  formatEventTime,
  formatEventWhen,
  seatsRemaining,
  type EventFilter,
} from "@/lib/neighborhood-events";
import { rsvpAction, type EventsActionState } from "./actions";

const count = (n: number) => new Intl.NumberFormat("ar").format(n);

/** The inline failure note (every forms module's own — the house form). */
function StateMessage({ state }: { state: EventsActionState }) {
  if (state.status !== "error") return null;
  return (
    <p className="form-error" role="alert">
      {state.message}
    </p>
  );
}

/**
 * «أكّد حضورك» — the RSVP toggle (the ReactButton pattern verbatim):
 * ONE form carrying the event id plus the caller's own LIVE seat
 * (rsvpedByMe — the board read's own field, never client-invented
 * state); the action sends the backend the OPPOSITE direction. The
 * backend's own words (409 on a double seat, the capacity 409, 403
 * non-member, the honest 404) surface verbatim on failure.
 */
function RsvpButton({
  eventId,
  rsvpedByMe,
  seatsLeft,
}: {
  eventId: string;
  rsvpedByMe: boolean;
  seatsLeft: number | null;
}) {
  const [state, action, pending] = useActionState<EventsActionState, FormData>(
    rsvpAction,
    { status: "idle" },
  );
  const full = seatsLeft !== null && seatsLeft === 0 && !rsvpedByMe;

  return (
    <form action={action} className="inline-action">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="rsvpedByMe" value={rsvpedByMe ? "true" : "false"} />
      <button
        type="submit"
        className="button"
        data-variant={rsvpedByMe ? "primary" : undefined}
        disabled={pending || full}
      >
        {pending ? "جارٍ التحديث…" : rsvpedByMe ? "حضورك مؤكّد ✓" : full ? "مكتملة" : "أكّد حضورك"}
      </button>
      {state.status === "error" ? <StateMessage state={state} /> : null}
    </form>
  );
}

export function EventBoard({
  events,
  mine,
}: {
  events: readonly NeighborhoodEvent[];
  /** The LIVE seat flags from the board read (rsvpedByMe per row). */
  mine: ReadonlySet<string>;
}) {
  const [filter, setFilter] = useState<EventFilter>("ALL");

  const visible = useMemo(() => filterEvents(events, filter, mine), [events, filter, mine]);
  const featured = events.find((event) => event.featured) ?? null;
  const gridEvents = visible.filter((event) => !event.featured);

  return (
    <section aria-label="لوحة فعاليات الحي">
      {/* The quick filter chips (the design's row). */}
      <nav className="hood-filter" aria-label="تصفية الفعاليات">
        {EVENT_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className="hood-filter-tab"
            data-active={filter === value || undefined}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* THE FEATURED HIGHLIGHT — the weekly initiative. */}
      {featured ? (
        <article className="event-featured" aria-labelledby="event-featured-heading">
          <header className="event-featured-head">
            <span className="event-featured-badge">مبادرة الأسبوع</span>
          </header>
          <h3 id="event-featured-heading" className="event-featured-title">
            {featured.title}
          </h3>
          <p className="event-when listing-meta">
            <span>{formatEventWhen(featured.startsAt)}</span>
            {featured.endsAt ? <span>إلى {formatEventTime(featured.endsAt)}</span> : null}
            <span>· {featured.location}</span>
          </p>
          <p className="event-desc">{featured.description}</p>
          <p className="listing-meta event-org">تنظيم: {featured.organizer}</p>
          <div className="event-featured-foot">
            <span className="event-attending">
              <strong>{count(featured.attending)}</strong> جارًا أكّدوا الحضور
            </span>
            <div className="event-featured-actions">
              <RsvpButton
                eventId={featured.id}
                rsvpedByMe={mine.has(featured.id)}
                seatsLeft={seatsRemaining(featured)}
              />
            </div>
          </div>
        </article>
      ) : null}

      {/* THE EVENTS GRID — the design's cards with registration states. */}
      {gridEvents.length > 0 ? (
        <ul className="event-grid">
          {gridEvents.map((event) => {
            const remaining = seatsRemaining(event);
            const iAmIn = mine.has(event.id);
            return (
              <li key={event.id} className={`event-card event-cat-${event.category.toLowerCase()}`}>
                <header className="event-card-head">
                  <span className="event-cat-chip">{EVENT_CATEGORY_LABELS[event.category]}</span>
                  <span className={`event-reg event-reg-${event.registration.toLowerCase()}`}>
                    {EVENT_REGISTRATION_LABELS[event.registration]}
                  </span>
                </header>
                <h4 className="event-title">{event.title}</h4>
                <p className="event-when listing-meta">
                  <span>{formatEventWhen(event.startsAt)}</span>
                  <span>· {event.location}</span>
                </p>
                <p className="event-desc">{event.description}</p>
                <footer className="event-card-foot">
                  {remaining !== null ? (
                    <span className="event-seats" data-full={remaining === 0 || undefined}>
                      {remaining > 0
                        ? `${count(remaining)} مقعدًا متبقيًا من ${count(event.capacity ?? 0)}`
                        : "اكتملت المقاعد — قائمة الانتظار في الديوانية"}
                    </span>
                  ) : (
                    <span className="event-seats">{count(event.attending)} جارًا سيحضرون</span>
                  )}
                  <RsvpButton
                    eventId={event.id}
                    rsvpedByMe={iAmIn}
                    seatsLeft={remaining}
                  />
                </footer>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="page-note" role="status">
          لا فعاليات تحت هذا التصنيف الآن — اقترح فكرة تجمع من صندوق الاقتراحات.
        </p>
      )}
    </section>
  );
}
