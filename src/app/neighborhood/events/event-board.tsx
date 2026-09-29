"use client";

/**
 * The events board — the interactive heart of /neighborhood/events
 * (the owner-supplied design: filter chips, the featured initiative
 * with its attendance/volunteer actions, and the events grid with the
 * three registration states). All interactions are DISPLAY
 * interactions by contract discipline: the zone carries the
 * «بيانات عرض» badge and the attendance rides client state only —
 * never a fake write. When the backend serves NeighborhoodEvent, the
 * same board goes real (RSVP writes, server counts) with zero visual
 * changes.
 */

import { useMemo, useState } from "react";
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

const count = (n: number) => new Intl.NumberFormat("ar").format(n);

export function EventBoard({ events }: { events: readonly NeighborhoodEvent[] }) {
  const [filter, setFilter] = useState<EventFilter>("ALL");
  const [mine, setMine] = useState<ReadonlySet<string>>(new Set());
  const [volunteering, setVolunteering] = useState<ReadonlySet<string>>(new Set());

  const visible = useMemo(() => filterEvents(events, filter, mine), [events, filter, mine]);
  const featured = events.find((event) => event.featured) ?? null;
  const gridEvents = visible.filter((event) => !event.featured);

  const attend = (id: string) =>
    setMine((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  const volunteer = (id: string) =>
    setVolunteering((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

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
            <span className="badge badge-muted">بيانات عرض</span>
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
              <strong>{count(featured.attending + (mine.has(featured.id) ? 1 : 0))}</strong> جارًا
              أكّدوا الحضور
            </span>
            <div className="event-featured-actions">
              <button
                type="button"
                className="button"
                data-variant={mine.has(featured.id) ? "primary" : undefined}
                onClick={() => attend(featured.id)}
                disabled={mine.has(featured.id)}
              >
                {mine.has(featured.id) ? "حضورك مؤكّد ✓" : "أكّد حضورك"}
              </button>
              <button
                type="button"
                className="button"
                data-variant={volunteering.has(featured.id) ? "primary" : undefined}
                onClick={() => volunteer(featured.id)}
                disabled={volunteering.has(featured.id)}
              >
                {volunteering.has(featured.id) ? "متطوّع ✓" : "تطوّع مع التنظيم"}
              </button>
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
                    <span className="event-seats">
                      {count(event.attending + (iAmIn ? 1 : 0))} جارًا سيحضرون
                    </span>
                  )}
                  <button
                    type="button"
                    className="button"
                    data-variant={iAmIn ? "primary" : undefined}
                    onClick={() => attend(event.id)}
                    disabled={iAmIn || remaining === 0}
                  >
                    {iAmIn ? "حضورك مؤكّد ✓" : remaining === 0 ? "مكتملة" : "أكّد حضورك"}
                  </button>
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
