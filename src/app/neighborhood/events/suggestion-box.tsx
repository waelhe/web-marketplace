"use client";

/**
 * The suggestion box — the design's «صندوق اقتراح فكرة تجمع والتصويت
 * عليها بين الجيران». Votes and idea adds are display interactions
 * (client state only — never fake writes), the widget carries the
 * «بيانات عرض» badge, and the ideas are never links.
 */

import { useState } from "react";
import type { NeighborhoodIdea } from "@/lib/neighborhood-events";

const count = (n: number) => new Intl.NumberFormat("ar").format(n);

export function SuggestionBox({ ideas }: { ideas: readonly NeighborhoodIdea[] }) {
  const [votes, setVotes] = useState<ReadonlySet<string>>(new Set());
  const [added, setAdded] = useState<ReadonlyArray<{ text: string; votes: number }>>([]);
  const [draft, setDraft] = useState("");

  const vote = (id: string) =>
    setVotes((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  const add = () => {
    const text = draft.trim();
    if (text.length === 0) return;
    setAdded((prev) => [...prev, { text, votes: 0 }]);
    setDraft("");
  };

  return (
    <section className="card hood-widget" aria-labelledby="ideas-heading">
      <div className="hood-widget-head">
        <h2 id="ideas-heading">اقترح تجمّعًا</h2>
        <span className="badge badge-muted">بيانات عرض</span>
      </div>
      <ul className="ideas-list">
        {ideas.map((idea) => (
          <li key={idea.id} className="idea-row">
            <span className="idea-text">{idea.text}</span>
            <button
              type="button"
              className="idea-vote"
              data-voted={votes.has(idea.id) || undefined}
              onClick={() => vote(idea.id)}
              disabled={votes.has(idea.id)}
              aria-pressed={votes.has(idea.id)}
            >
              {count(idea.votes + (votes.has(idea.id) ? 1 : 0))} صوتًا
            </button>
          </li>
        ))}
        {added.map((idea, index) => (
          <li key={`added-${index}`} className="idea-row idea-row-mine">
            <span className="idea-text">{idea.text}</span>
            <span className="idea-vote idea-vote-mine">{count(idea.votes)} صوتًا</span>
          </li>
        ))}
      </ul>
      <div className="idea-add">
        <label htmlFor="idea-draft" className="composer-field-label">
          فكرتك لتجمع الجيران
        </label>
        <div className="idea-add-row">
          <input
            id="idea-draft"
            value={draft}
            maxLength={200}
            placeholder="مثال: مسابقة شطرنج أسبوعية"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="button" className="button" onClick={add} disabled={draft.trim().length === 0}>
            أضف
          </button>
        </div>
      </div>
    </section>
  );
}
