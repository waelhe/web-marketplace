"use client";

/**
 * The interactive poll card — the design's استطلاع رأي: options as
 * live percentage bars with the radio affordance, the voter count,
 * and one vote per member (the owner-supplied design, S10 skin).
 *
 * N12 (L52 — gap #7 served): the card went REAL on the served
 * contract. The vote is a REAL write (the registered contract's own
 * «الكتابة الحقيقية = صوت واحد لكل عضو»): ONE form, one submit
 * button per option (the clicked button's own name/value carries the
 * chosen option's id — no client state), the action sends the vote,
 * and refresh() re-renders the board's read — the live per-option
 * counts, the percentages, and the caller's own choice re-render
 * from the contract alone. Expected failures (the honest 404s, the
 * option-of-another-poll 400, the membership 403, the one-vote 409
 * with the backend's own words) surface as the inline note. The
 * «بيانات عرض» badge and the display-only voting retired with the
 * display dataset; the design's own rule — «اختر خيارًا لعرض
 * النتائج» — stays: the results render only for a member who has
 * voted (votedByMe), exactly the skin the design drew.
 */

import { useActionState } from "react";
import type { NeighborhoodPoll } from "@/lib/api/community-contract";
import { ownerCount, ownerPercent } from "@/lib/neighborhood-design";
import { voteAction, type ActionState } from "./actions";

export function PollCard({ poll }: { poll: NeighborhoodPoll }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    voteAction,
    { status: "idle" },
  );

  // The caller's own live vote — the served board's votedByMe (absent
  // when not voted: the card's own two states, no second read).
  const votedFor = poll.votedByMe ?? null;
  const voted = votedFor !== null;
  const total = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const leading = Math.max(...poll.options.map((option) => option.votes));

  return (
    <article className="hy-card" aria-labelledby={`poll-${poll.id}-q`}>
      <header className="hy-post-head">
        <div className="hy-post-id">
          <span className="hy-post-name-row">
            <span className="material-symbols-outlined" aria-hidden="true">
              ballot
            </span>
            <span className="hy-post-name">استطلاع رأي الحي</span>
            <span className="hy-post-chip" data-tone="primary">{poll.author}</span>
          </span>
          <span className="hy-post-meta">صوت واحد لكل عضو</span>
        </div>
      </header>
      <h3 id={`poll-${poll.id}-q`} className="hy-post-title">
        {poll.question}
      </h3>
      <form action={action} className="hy-poll-form">
        <input type="hidden" name="pollId" value={poll.id} />
        <ul className="hy-poll-options">
          {poll.options.map((option) => {
            const mine = votedFor === option.id;
            const share = total > 0 ? option.votes / total : 0;
            return (
              <li key={option.id}>
                <button
                  type="submit"
                  name="optionId"
                  value={option.id}
                  className="hy-poll-option"
                  data-leading={
                    voted && option.votes === leading && leading > 0 ? "true" : undefined
                  }
                  data-unvoted={voted ? undefined : "true"}
                  data-mine={mine ? "true" : undefined}
                  disabled={voted || pending}
                  aria-pressed={mine}
                >
                  <span
                    className="hy-poll-fill"
                    aria-hidden="true"
                    style={{ inlineSize: voted ? `${share * 100}%` : undefined }}
                  />
                  <span className="hy-poll-label-row">
                    <span className="hy-poll-radio" aria-hidden="true" />
                    <span className="hy-poll-label">{option.label}</span>
                  </span>
                  {voted ? (
                    <span className="hy-poll-count">
                      {ownerPercent(share)}
                      <span className="hy-poll-votes">{ownerCount(option.votes)} صوت</span>
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </form>
      <footer className="hy-poll-foot">
        <span className="hy-poll-foot-note">
          <span className="material-symbols-outlined" aria-hidden="true">
            how_to_vote
          </span>
          {ownerCount(total)} صوتًا حتى الآن
        </span>
        {voted ? (
          <span className="hy-poll-voted-note">
            <span className="material-symbols-outlined" aria-hidden="true">
              check_circle
            </span>
            شكرًا لمشاركتك — صوتك محسوب
          </span>
        ) : (
          <span className="hy-poll-foot-note">اختر خيارًا لعرض النتائج</span>
        )}
        {state.status === "error" ? (
          <p className="hy-state" role="alert">
            {state.message}
          </p>
        ) : null}
      </footer>
    </article>
  );
}
