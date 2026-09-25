# Visual Skin & Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the verified marketplace shell into a designed product surface: motion-on-action, one bold accent (featured ribbon), designed navigation, and form-level accessibility — frontend only, zero backend/contract changes.

**Architecture:** Four independent, sequential tasks. Each is CSS/markup-only on the existing component/page files, gated by the existing verification loop (typegen + lint + tsc + build) plus the installed safety net (`test:unit`, `test:e2e`). No new dependencies, no contract edits, no imagery.

**Tech Stack:** Next.js 16.3.5 App Router + React 19.3 + TypeScript 5 + pure CSS custom properties (existing warm token layer). Playwright (Chrome channel) for the responsive/no-overflow check.

**Spec:** `docs/superpowers/specs/2026-09-25-visual-skin-and-accessibility-spec.md` (binding). Predecessor spec (already implemented): `docs/superpowers/specs/2026-09-23-browse-platform-design.md`.

## Global Constraints

- Pinned toolchain ONLY: `C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64` (`npm.cmd`, `node.exe`). Ambient node (v22) is forbidden (enforced by `engines` + `.npmrc engine-strict`).
- Zero new dependencies. Zero contract/channel changes. Zero imagery.
- Warm light palette only (approved spec §1): `--bg #FDFBF7`, `--surface #FFFFFF`, `--border #EDE6DA`, `--ink #1C1917`, `--primary #0F766E`, `--accent #D97706`.
- Contrast law: body text uses `--ink`/`--primary` only; `--primary-strong` for large/bold/graphics only; `--accent` is a background/edge accent, NEVER body text (3.19 measured).
- NO drop shadows (project already has zero — the hairline card is the look). NO entrance/scroll animations. NO emoji as icons. Motion only on user action.
- `prefers-reduced-motion: reduce` must disable all new motion (the rule already exists in `globals.css`).
- Tokens only in components (no raw hex outside `globals.css`; the measured `var(--x, fallback)` pattern in `global-error.tsx` is the only exception).
- Every task ends: `npm run lint` + `tsc --noEmit` + `npm run build` + `npm run test:unit` + `npm run test:e2e` all exit 0. Local commits only, explicit paths, never push.
- Shell is Windows PowerShell 5.1 (no `&&`, no `grep`/`head`; use `Select-Object`, `Select-String`).

---

### Task 1: Motion-on-action (transitions under reduced-motion guard)

**Files:**
- Modify: `src/app/globals.css` (append transition tokens + apply to interactive selectors; extend the existing `@media (prefers-color-scheme… )`/`prefers-reduced-motion` block)

**Interfaces:**
- Consumes: existing tokens (`--border`, `--primary`, `--radius-md`, etc.).
- Produces: `--transition-fast: 120ms`, `--transition-base: 180ms`, `--ease-standard: ease-out` custom properties; `.btn`, `.listing-card`, `a`, `input/select/textarea` gain `transition` on `background-color, border-color, color, box-shadow(色 only)`. A single `transition: none !important` guard inside the EXISTING `@media (prefers-color-scheme: dark)` sibling — specifically inside the existing `@media (prefers-reduced-motion: reduce)` block, set `transition: none` on the same selectors.

- [ ] **Step 1: Add transition tokens to `:root`**

Append inside the existing `:root` (near `--focus-ring`):
```css
  /* Motion — action-only, disabled under reduced-motion (see guard) */
  --transition-fast: 120ms;
  --transition-base: 180ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
```

- [ ] **Step 2: Apply transitions to interactive selectors (append at end of file, after existing rules so they win)**

```css
.btn,
.listing-card,
a,
input,
select,
textarea {
  transition:
    background-color var(--transition-fast) var(--ease-standard),
    border-color var(--transition-fast) var(--ease-standard),
    color var(--transition-fast) var(--ease-standard),
    opacity var(--transition-fast) var(--ease-standard);
}
```

- [ ] **Step 3: Extend the existing reduced-motion guard**

The file already contains:
```css
@media (prefers-reduced-motion: reduce) {
  .skeleton-line { animation: none; }
}
```
Extend that SAME block (do not add a second one):
```css
@media (prefers-reduced-motion: reduce) {
  .skeleton-line { animation: none; }
  .btn, .listing-card, a, input, select, textarea { transition: none; }
}
```

- [ ] **Step 4: Verify + commit**

```bash
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\npm.cmd" run lint 2>&1 | Select-Object -Last 2
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\node.exe" node_modules/typescript/bin/tsc --noEmit 2>&1 | Select-Object -First 3
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\npm.cmd" run test:unit 2>&1 | Select-Object -Last 3
Select-String -Path src/app/globals.css -Pattern "transition" | Measure-Object | Select-Object Count   # expect >= 8
git add src/app/globals.css
git commit -m "style(web): motion-on-action transitions, disabled under reduced-motion"
```

Expected: lint/tsc/unit exit 0; `transition` count ≥ 8; one commit; no push.

---

### Task 2: Featured ribbon (the single amber gesture)

**Files:**
- Modify: `src/app/page.tsx` (the featured `<section>` — add the ribbon class ONLY; do not touch data fetching or the latest strip)
- Modify: `src/app/globals.css` (append `.featured-ribbon` styling using `--accent` as an inline-start edge + warm surface)

**Interfaces:**
- Consumes: `--accent`, `--surface`, `--border`, `--space-*`.
- Produces: `.featured-ribbon` class on the featured section (inline-start 3px `--accent` edge, `--surface` bg, `--radius-lg`, `--space-6` padding). NOT a per-card badge; the ribbon is the section frame. If `featured.data.content.length === 0`, the section keeps its existing EmptyState and the ribbon class is NOT applied (no accent on empty data — no decoration without data).

- [ ] **Step 1: Add the ribbon class in `page.tsx`**

In the featured section's opening tag, add `className="featured-ribbon"` to the existing `<section aria-labelledby="featured-heading" className="home-section">` ONLY (the other sections stay untouched). In the empty-state branch (`content.length === 0`), the section still renders its EmptyState — do not add the ribbon there (conditional: ribbon class lives on the non-empty wrapper or is applied via the existing conditional structure you find; keep data logic byte-identical).

- [ ] **Step 2: Append ribbon CSS**

```css
.featured-ribbon {
  background: var(--surface);
  border: 1px solid var(--border);
  border-inline-start: 3px solid var(--accent);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}
```

- [ ] **Step 3: Verify + commit**

Trio (lint/tsc/build) + curl the home HTML and assert the ribbon class is present exactly once and `--accent` is used as a border (not text):
```bash
$h = curl.exe -s --noproxy "*" http://127.0.0.1:3000/
"ribbon=" + ($h -match 'featured-ribbon')
```
```bash
git add src/app/page.tsx src/app/globals.css
git commit -m "style(web): featured ribbon — one amber edge (the single bold gesture)"
```

Expected: ribbon present once; no data-logic diff; build green.

---

### Task 3: Designed navigation + first real breakpoints

**Files:**
- Modify: `src/app/globals.css` (append header/nav responsive rules — the project's FIRST `@media (min/max-width)`)
- Modify: `src/app/page.tsx` ONLY if a class is missing on the header/nav wrappers (add, never restructure)

**Interfaces:**
- Consumes: `--container-max`, `--space-*`, `--border`, `--primary`.
- Produces: `@media (max-width: 640px)` block that (a) makes `.site-header-inner` a single column, (b) makes `.site-header-nav` a horizontally scrollable strip (`overflow-x: auto; scroll-snap-type: x proximity`), (c) keeps `:focus-visible` rings visible. Desktop (>640px) unchanged.

- [ ] **Step 1: Append the mobile block at end of `globals.css`**

```css
@media (max-width: 640px) {
  .site-header-inner {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }
  .site-header-nav,
  .site-header-user-nav {
    overflow-x: auto;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
  }
  .site-header-nav > *,
  .site-header-user-nav > * {
    scroll-snap-align: start;
  }
}
```

- [ ] **Step 2: Add a no-overflow e2e assertion**

Append to `tests/e2e/smoke.spec.ts`:
```ts
test("no horizontal overflow at 375px (RTL shell)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
```

- [ ] **Step 3: Verify + commit**

Run `npm run test:e2e` (now 6 tests, all green — the new one runs at 375px). Then lint/tsc/build. Commit:
```bash
git add src/app/globals.css tests/e2e/smoke.spec.ts
git commit -m "style(web): designed mobile header/nav + 375px no-overflow e2e guard"
```

Expected: 6/6 e2e green; build green.

---

### Task 4: SVG icon set + form-error accessibility

**Files:**
- Create: `src/components/ui/icon.tsx` (server component; 4 inline SVGs: `share`, `star`, `message`, `heart`; all `aria-hidden="true"` unless an `label` prop is passed, then `role="img"` + `<title>`)
- Modify: `src/app/listings/[id]/share-button.tsx` (replace the text-only share affordance with the `share` icon + existing accessible name)
- Modify: the two main write forms (booking + profile) — add `aria-invalid` + `aria-describedby` + a visible field-error line for at least one validated field each (use the existing `Field` component; do NOT invent validation — wire only where the action already returns a field error)

**Interfaces:**
- Consumes: `Field` (label/error props already exist), `Button`.
- Produces: `Icon({ name: "share"|"star"|"message"|"heart", label?: string, size?: number })`. No dependency; raw `<svg>` with `currentColor` strokes (1.5px, round caps) so it themes via tokens.

- [ ] **Step 1: Write `icon.tsx`**

A single component with a `switch` over `name`, each branch a `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width={size} height={size} aria-hidden={label ? undefined : "true"} role={label ? "img" : undefined}>` with a simple geometric path per icon (share = three connected nodes; star = 5-point polyline; message = rounded rect + tail; heart = two arcs + point). When `label` is provided, render `<title>{label}</title>`.

- [ ] **Step 2: Use the share icon in `share-button.tsx`**

Keep the button's accessible name (visible text or `aria-label`) — the icon is decorative beside it. Do not change the Web Share / clipboard logic (R: client island unchanged).

- [ ] **Step 3: Add field-error wiring to the two write forms**

For one validated field in the booking form and one in the profile form: pass the existing error into `Field`'s `error` prop and ensure the control receives `aria-invalid` and `aria-describedby` pointing at the error node. If `Field` does not already wire `aria-describedby` to its error text, extend `Field` minimally to do so (single place, both forms benefit). No new validation logic.

- [ ] **Step 4: Verify + commit**

```bash
Select-String -Path src -Pattern "aria-invalid" -Recurse | Measure-Object | Select-Object Count   # expect >= 5
Select-String -Path src -Pattern "<svg" -Recurse | Measure-Object | Select-Object Count           # expect >= 1 (icon.tsx)
```
lint/tsc/build + test:unit + test:e2e all green, then:
```bash
git add src/components/ui/icon.tsx src/app/listings/[id]/share-button.tsx src/components/ui/field.tsx src/app/bookings src/app/profile
git commit -m "a11y(web): inline SVG icon set + field-level error wiring on write forms"
```

Expected: aria-invalid ≥ 5, svg ≥ 1, all gates green, no push.

---

## Self-Review

**1. Spec coverage:** ن1 motion → Task 1 · ن2 ribbon → Task 2 · ن3 nav+breakpoints → Task 3 · ن4 icons+form a11y → Task 4 · the two honesty corrections live in the spec, not code · out-of-scope (images/dark/admin) excluded everywhere.
**2. Placeholder scan:** every step names exact files, exact commands (pinned paths), exact expected counts. No TBD. The one judgment call (ribbon-on-empty) is resolved in-file (no accent without data).
**3. Type consistency:** `Icon` props defined once and consumed in Task 4 only; `Field` error wiring extended in ONE place; test file edited in Task 3 only (later task must not re-touch it). Token names match the existing warm layer (`--accent`, `--surface`, `--border`, `--space-*`, `--radius-lg`) — no new tokens invented beyond the three motion ones.

## Execution Handoff

Two options (per the writing-plans skill): **1) Subagent-Driven (recommended)** — a fresh implementer + independent reviewer per task; **2) Inline Execution** — batched here with checkpoints. Local commits only; no push without the owner's explicit word.
