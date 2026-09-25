# Neighborhood Nextdoor-grade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the community section the structure and personality of a Nextdoor-grade product — sidebar + feed two-column layout, post identity (category edge + initials avatar), neighborhood name as the page's voice — without touching any contract, channel, or the backend.

**Architecture:** Three sequential tasks on ONE page (`src/app/neighborhood/page.tsx`) + appended CSS. The data flow, privacy gate, membership state machine, comments, messaging, reporting and pagination are all untouched — this is presentation structure only.

**Tech Stack:** Next.js 16.3.5 App Router + React 19.3 + TypeScript 5 + pure CSS (existing warm token layer). Server Components; no client JS added.

**Spec:** `docs/superpowers/specs/2026-09-25-neighborhood-nextdoor-design.md` (binding).

## Global Constraints

- Pinned toolchain ONLY: `C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64`. Ambient node forbidden.
- **Contracts frozen**: `src/lib/api/community-contract.ts` and `src/lib/api/community.ts` are NOT modified. No new fields, no invented data.
- **Privacy red lines (do not break)**: anonymous → the sign-in gate (NO feed fetch); membership-404 → the picker entry; feed-403 → the rejoin message; the page keeps `robots: { index: false }`.
- `authorId` is an OPAQUE UUID — only `slice(0, 2)` may be shown (initials). **Never** invent a name.
- No shadows, no emoji, no raw hex outside `globals.css`, warm tokens only, `--accent` as a background/edge (never body text).
- `prefers-reduced-motion` respected; `:focus-visible` never removed.
- globals.css is APPEND-ONLY for this program.
- Every task ends: lint + tsc + build + test:unit + test:e2e exit 0. Local commits, explicit paths, never push.
- Shell is Windows PowerShell 5.1.

---

### Task 1: Two-column layout + neighborhood name as the page voice

**Files:**
- Modify: `src/app/neighborhood/page.tsx` (the MEMBER branch's `<main>` — wrap membership card + category nav + composer + feed in a `.hood-layout` grid; sidebar = membership + categories + composer, main column = feed)
- Modify: `src/app/globals.css` (append `.hood-layout`, `.hood-side`, `.hood-main`, `.hood-title`)

**Interfaces:**
- Consumes: nothing new (existing `membership`, `category`, `feed`, `neighborhoodName`).
- Produces: `.hood-layout` (CSS grid: `1fr` on mobile, `20rem 1fr` ≥900px), `.hood-side` (sticky ≥900px), `.hood-main`, `.hood-title` (2xl/800/accent-tinted).

- [ ] **Step 1: Wrap the member branch markup**

Inside the member render only (after the anonymous + membership-404 branches), restructure the existing sections — WITHOUT changing their content, order semantics, props, or handlers:
```tsx
<div className="hood-layout">
  <aside className="hood-side">
    {/* existing member-card section, category-filter nav, post-composer section — moved here, unchanged */}
  </aside>
  <section className="hood-main">
    {/* existing feed section + pager — moved here, unchanged */}
  </section>
</div>
```
Render the heading as `<h1 className="hood-title">حارتي{neighborhoodName ? ` — ${neighborhoodName}` : ""}</h1>`.

- [ ] **Step 2: Append the layout CSS**

```css
.hood-layout { display: grid; gap: var(--space-6); grid-template-columns: 1fr; }
.hood-title { font-size: var(--text-2xl); font-weight: 800; color: var(--ink); margin: 0 0 var(--space-4); }
.hood-title::first-line { color: var(--ink); }
@media (min-width: 900px) {
  .hood-layout { grid-template-columns: 20rem 1fr; align-items: start; }
  .hood-side { position: sticky; top: var(--space-4); }
}
```

- [ ] **Step 3: Verify + commit**

lint + tsc + build + test:unit + test:e2e (expect 7, unchanged — no new test yet), then:
```bash
git add src/app/neighborhood/page.tsx src/app/globals.css
git commit -m "feat(web): حارتي — two-column layout (sidebar + feed) and neighborhood name as the page voice"
```

---

### Task 2: Post identity — category edge + initials avatar

**Files:**
- Modify: `src/app/neighborhood/page.tsx` (post `<li>` markup only: class + avatar + meta order)
- Modify: `src/app/globals.css` (append `.hood-post`, `.hood-avatar`, `.hood-post-meta`, `.hood-cat-*`)

**Interfaces:**
- Consumes: `post.authorId` (opaque UUID), `post.category`, `CATEGORY_LABELS`, `formatDate`.
- Produces: `.hood-post` (hairline card, no shadow), `.hood-avatar` (initials circle), `.hood-cat` + `.hood-cat-general|classified|lost_found|recommendation` (inline-start edge color).

- [ ] **Step 1: Restructure the post `<li>`**

For each `feed.data.content.map((post) => ...)` item: change the `<li>` class from `card post-card` to `hood-post` and render a meta row: a `.hood-avatar` span showing `post.authorId.slice(0, 2)` (uppercased) with `aria-hidden="true"`, then the category chip (`.hood-cat hood-cat-<lowercased category>` carrying `CATEGORY_LABELS[post.category]`), then the date. Keep the title (`h3`), body, `CommentsSection`, and `post-actions` EXACTLY as they are.

- [ ] **Step 2: Append the post CSS**

```css
.hood-post { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4); display: grid; gap: var(--space-2); }
.hood-post-meta { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; font-size: var(--text-sm); color: var(--ink-2); }
.hood-avatar { inline-size: 2rem; block-size: 2rem; border-radius: 999px; background: var(--primary); color: var(--primary-ink); display: inline-flex; align-items: center; justify-content: center; font-size: var(--text-xs); font-weight: 700; }
.hood-post h3 { font-size: 1.125rem; font-weight: 800; color: var(--ink); margin: 0; }
.hood-cat { border-inline-start: 3px solid var(--accent); padding-inline-start: var(--space-2); }
.hood-cat-general { border-inline-start-color: var(--accent); }
.hood-cat-classified { border-inline-start-color: var(--primary); }
.hood-cat-lost_found { border-inline-start-color: var(--danger); }
.hood-cat-recommendation { border-inline-start-color: var(--ink-2); }
```

- [ ] **Step 3: Verify + commit**

Trio + test:unit + test:e2e, then:
```bash
git add src/app/neighborhood/page.tsx src/app/globals.css
git commit -m "feat(web): post identity — category edge + initials avatar (no invented names)"
```

---

### Task 3: States copy + layout e2e guard

**Files:**
- Modify: `src/app/neighborhood/page.tsx` (empty/403/error copy ONLY — wording, no logic)
- Modify: `tests/e2e/smoke.spec.ts` (append ONE test)

**Interfaces:**
- Consumes: existing state branches.
- Produces: one e2e assertion that the neighborhood gate renders for an anonymous visitor (no feed fetch, no 500).

- [ ] **Step 1: Improve the empty-feed copy**

In the member branch's empty feed (`content.length === 0`, page 0 case), keep the existing honest meaning but make it an invitation with the composer adjacent: `لا منشورات في حارتك بعد — كن أول من يكتب لجيرانه من النموذج بالأعلى.` (one sentence; no logic change).

- [ ] **Step 2: Append the e2e guard**

```ts
test("neighborhood renders the anonymous gate without a feed fetch", async ({ page }) => {
  const res = await page.goto("/neighborhood");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "حارتي" })).toBeVisible();
  const robots = await page.locator('meta[name="robots"]').first().getAttribute("content");
  expect(robots).toContain("noindex");
});
```

- [ ] **Step 3: Verify + commit**

Trio + test:unit + `npm run test:e2e` (expect 8), then:
```bash
git add src/app/neighborhood/page.tsx tests/e2e/smoke.spec.ts
git commit -m "feat(web): neighborhood states copy + anonymous-gate e2e guard"
```

## Self-Review

**1. Spec coverage:** ن1 layout+voice → Task 1 · ن2 post identity → Task 2 · ن3 states+a11y guard → Task 3 · decisions 1-6 honored (no Nextdoor clone: warm ledger not pink bubbles; two columns; accent = حارة; initials-only; category edges; zero shadows) · out-of-scope (images/comments/payment/backend) untouched.
**2. Placeholder scan:** every step has exact files, exact CSS/JSX, exact commands, exact expected e2e count. No TBD.
**3. Type consistency:** `.hood-*` class names defined in Task 1/2 CSS and used only there; `hood-cat-<lowercased category>` maps exactly to the 4 measured enum values (GENERAL/CLASSIFIED/LOST_FOUND/RECOMMENDATION); contracts untouched so no type drift is possible.
