"use client";

/**
 * The interactive monthly calendar — the events sidebar's widget (the
 * owner-supplied design: a month grid whose event days carry colored
 * dots, with month navigation). Pure client rendering over the
 * product-defined event dataset: the dots mark days that carry at
 * least one event; nothing is a link (no day surfaces exist — rule 4
 * of the display-data discipline).
 */

import { useMemo, useState } from "react";
import type { NeighborhoodEvent } from "@/lib/neighborhood-events";
import { eventDayParts } from "@/lib/neighborhood-events";

const count = (n: number) => new Intl.NumberFormat("ar").format(n);

/** The Arabic month + year heading (the calendar's own grid month —
 * timezone-independent: a month's days are the same everywhere). */
function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("ar", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1),
  );
}

/** Arabic weekday initials (RTL order — الأحد first). */
const WEEKDAYS = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

/** The month's day cells: leading blanks + the days, keyed by position. */
function monthDays(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const lead = first.getDay(); // 0 = الأحد, matching WEEKDAYS' order
  const length = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length }, (_, i) => i + 1),
  ];
}

export function EventCalendar({ events }: { events: readonly NeighborhoodEvent[] }) {
  // The calendar opens on the FIRST upcoming event's Damascus month
  // (the events live there, not necessarily in the current month).
  const initial = useMemo(() => {
    const first = events[0];
    if (!first) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    }
    const at = eventDayParts(first.startsAt);
    return { year: at.year, month: at.month - 1 };
  }, [events]);

  const [cursor, setCursor] = useState(initial);

  /** The event's Damascus y-m-d → its count on that day. */
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of events) {
      const at = eventDayParts(event.startsAt);
      const key = `${at.year}-${at.month}-${at.day}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const days = monthDays(cursor.year, cursor.month);
  const monthEventCount = [...byDay.entries()].filter(([key]) => {
    const [y, m] = key.split("-").map(Number);
    return y === cursor.year && m === cursor.month + 1;
  });
  const totalDots = monthEventCount.reduce((sum, [, n]) => sum + n, 0);

  const move = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <section className="card hood-widget" aria-labelledby="calendar-heading">
      <div className="hood-widget-head">
        <h2 id="calendar-heading">تقويم الحي</h2>
        <span className="badge badge-muted">بيانات عرض</span>
      </div>
      <div className="calendar-nav" role="group" aria-label="تنقّل الأشهر">
        <button type="button" className="calendar-nav-btn" onClick={() => move(-1)} aria-label="الشهر السابق">
          ›
        </button>
        <span className="calendar-month">{monthLabel(cursor.year, cursor.month)}</span>
        <button type="button" className="calendar-nav-btn" onClick={() => move(1)} aria-label="الشهر التالي">
          ‹
        </button>
      </div>
      <table className="calendar-grid">
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th key={day} scope="col">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(days.length / 7) }, (_, week) => (
            <tr key={week}>
              {days.slice(week * 7, week * 7 + 7).map((day, i) => {
                if (day === null) return <td key={i} aria-hidden="true" />;
                // The map's keys carry the 1-based month (eventDayParts);
                // the cursor's month is 0-based — align before the lookup.
                const dots = byDay.get(`${cursor.year}-${cursor.month + 1}-${day}`) ?? 0;
                return (
                  <td key={i} data-dots={dots > 0 || undefined} title={dots > 0 ? `${count(dots)} فعاليات` : undefined}>
                    <span className="calendar-day">{count(day)}</span>
                    {dots > 0 ? (
                      <span className="calendar-dots" aria-label={`${count(dots)} فعاليات`}>
                        {Array.from({ length: Math.min(dots, 3) }, (_, d) => (
                          <i key={d} />
                        ))}
                      </span>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="listing-meta calendar-hint">
        {totalDots > 0
          ? `${count(totalDots)} فعاليات هذا الشهر`
          : "لا فعاليات هذا الشهر — جرّب الشهر التالي"}
      </p>
    </section>
  );
}
