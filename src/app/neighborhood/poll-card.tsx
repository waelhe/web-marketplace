"use client";

/**
 * The interactive poll card — the featured zone's استطلاع رأي (the
 * owner-supplied design: options with live percentage bars, the voter
 * count, and one vote per session). The voting is a DISPLAY
 * interaction by contract discipline: the demo poll carries the
 * «بيانات عرض» badge and the vote rides client state only — never a
 * fake write. When the backend serves the NeighborhoodPoll contract,
 * the same card goes real (one vote per member, server-counted) with
 * zero visual changes.
 */

import { useId, useState } from "react";
import type { NeighborhoodPoll } from "@/lib/neighborhood-product";
import { pollTotalVotes } from "@/lib/neighborhood-product";

const count = (n: number) => new Intl.NumberFormat("ar").format(n);
const percent = (n: number) =>
  new Intl.NumberFormat("ar", { style: "percent", maximumFractionDigits: 0 }).format(n);

export function PollCard({ poll }: { poll: NeighborhoodPoll }) {
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const id = useId();

  // The display vote: +1 to the chosen option, client state only.
  const votes = poll.options.map(
    (option, index) => option.votes + (votedIndex === index ? 1 : 0),
  );
  const total = pollTotalVotes(poll) + (votedIndex === null ? 0 : 1);

  return (
    <article className="poll-card" aria-labelledby={`${id}-q`}>
      <header className="poll-head">
        <span className="poll-badge">استطلاع رأي</span>
        <span className="badge badge-muted">بيانات عرض</span>
      </header>
      <h3 id={`${id}-q`} className="poll-question">
        {poll.question}
      </h3>
      <p className="poll-author listing-meta">{poll.author}</p>
      <ul className="poll-options">
        {poll.options.map((option, index) => {
          const optionVotes = votes[index];
          const share = total > 0 ? optionVotes / total : 0;
          const mine = votedIndex === index;
          return (
            <li key={option.label}>
              <button
                type="button"
                className="poll-option"
                data-mine={mine || undefined}
                data-voted={votedIndex !== null || undefined}
                onClick={() => setVotedIndex(index)}
                disabled={votedIndex !== null}
                aria-pressed={mine}
              >
                <span className="poll-option-fill" aria-hidden="true" style={{ inlineSize: `${share * 100}%` }} />
                <span className="poll-option-label">{option.label}</span>
                {votedIndex !== null ? (
                  <span className="poll-option-count">
                    {count(optionVotes)} · {percent(share)}
                    {mine ? <span className="poll-mine" aria-label="صوتك"> ✓</span> : null}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="poll-foot listing-meta">
        <span>{count(total)} صوتًا{votedIndex !== null ? " — شكرًا لمشاركتك" : ""}</span>
        <span>صوت واحد لكل جلسة عرض</span>
      </footer>
    </article>
  );
}
