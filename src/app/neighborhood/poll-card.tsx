"use client";

/**
 * The interactive poll card — the design's استطلاع رأي: options as
 * live percentage bars with the radio affordance, the voter count,
 * and one vote per session (the owner-supplied design, S10 skin).
 *
 * The voting stays a DISPLAY interaction by contract discipline
 * (inherited from S8): the demo poll carries the «بيانات عرض» badge
 * and the vote rides client state only — never a fake write. When the
 * backend serves the NeighborhoodPoll contract, the same card goes
 * real (one vote per member, server-counted) with zero visual
 * changes.
 */

import { useId, useState } from "react";
import type { NeighborhoodPoll } from "@/lib/neighborhood-product";
import { pollTotalVotes } from "@/lib/neighborhood-product";
import { ownerCount, ownerPercent } from "@/lib/neighborhood-design";

export function PollCard({ poll }: { poll: NeighborhoodPoll }) {
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const id = useId();

  // The display vote: +1 to the chosen option, client state only.
  const votes = poll.options.map(
    (option, index) => option.votes + (votedIndex === index ? 1 : 0),
  );
  const total = pollTotalVotes(poll) + (votedIndex === null ? 0 : 1);
  const leading = Math.max(...votes);

  return (
    <article className="hy-card" aria-labelledby={`${id}-q`}>
      <header className="hy-post-head">
        <div className="hy-post-id">
          <span className="hy-post-name-row">
            <span className="material-symbols-outlined" aria-hidden="true">
              ballot
            </span>
            <span className="hy-post-name">استطلاع رأي معتمد</span>
            <span className="hy-post-chip" data-tone="primary">{poll.author}</span>
          </span>
          <span className="hy-post-meta">صوت واحد لكل جلسة عرض</span>
        </div>
        <span className="hy-badge-demo">بيانات عرض</span>
      </header>
      <h3 id={`${id}-q`} className="hy-post-title">
        {poll.question}
      </h3>
      <ul className="hy-poll-options">
        {poll.options.map((option, index) => {
          const optionVotes = votes[index];
          const share = total > 0 ? optionVotes / total : 0;
          const mine = votedIndex === index;
          return (
            <li key={option.label}>
              <button
                type="button"
                className="hy-poll-option"
                data-leading={optionVotes === leading && leading > 0 ? "true" : undefined}
                data-unvoted={votedIndex === null ? "true" : undefined}
                data-mine={mine ? "true" : undefined}
                onClick={() => setVotedIndex(index)}
                disabled={votedIndex !== null}
                aria-pressed={mine}
              >
                <span className="hy-poll-fill" aria-hidden="true" style={{ inlineSize: `${share * 100}%` }} />
                <span className="hy-poll-label-row">
                  <span className="hy-poll-radio" aria-hidden="true" />
                  <span className="hy-poll-label">{option.label}</span>
                </span>
                {votedIndex !== null ? (
                  <span className="hy-poll-count">
                    {ownerPercent(share)}
                    <span className="hy-poll-votes">{ownerCount(optionVotes)} صوت</span>
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="hy-poll-foot">
        <span className="hy-poll-foot-note">
          <span className="material-symbols-outlined" aria-hidden="true">
            how_to_vote
          </span>
          {ownerCount(total)} صوتًا حتى الآن
        </span>
        {votedIndex !== null ? (
          <span className="hy-poll-voted-note">
            <span className="material-symbols-outlined" aria-hidden="true">
              check_circle
            </span>
            شكرًا لمشاركتك — صوتك محسوب في العرض
          </span>
        ) : (
          <span className="hy-poll-foot-note">اختر خيارًا لعرض النتائج</span>
        )}
      </footer>
    </article>
  );
}
