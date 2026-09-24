# Browse Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the light-warm browse platform (design tokens + 11 components + home + browse + detail) over the untouched BFF channels.

**Architecture:** Phase 0 lays the 3-layer token system and UI primitives; Phases 1-3 compose the three public surfaces on top without touching data channels, contracts, or SEO behavior. Each phase ends green and committed locally.

**Tech Stack:** Next.js 16.3.5 (App Router, Turbopack) + React 19.3 + TypeScript 5 + Better Auth 1.7.5 (untouched) + pure CSS tokens (zero new dependencies).

**Spec:** `docs/superpowers/specs/2026-09-23-browse-platform-design.md` (+ G-N4 appendix). The plan argues from the spec; executors read both.

## Global Constraints

- Pinned toolchain ONLY: `C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64` (`node`, `npm.cmd`) — ambient node is v22 and must not be used (enforced by `engines` + `.npmrc engine-strict`).
- Zero new dependencies (repo rule) — pure CSS + existing stack only.
- `npm run build` stays green; every task ends with typegen + lint + tsc + build.
- No test runner exists in this repo (measured: zero `*.test.*`, no vitest/playwright) — each task's test cycle is: typegen + `npm run lint` + `tsc --noEmit` + `npm run build` + agent-browser DOM/screenshot checks + curl HTML assertions. No invented test files.
- Local commits only — NEVER push to origin (owner's explicit word required).
- Red lines (never break): React `cache()` single-fetch across `generateMetadata` + body (L40 counting) · verbatim canonical/og/JSON-LD · unknown/inactive ids → not-found + `noindex` · gates before any fetch · `next/headers` never in client bundles.
- Arabic RTL first, logical CSS properties only, Cairo variable font, no raw hex in components (tokens only).
- `searchParams` is async in Next 16 — always `await` it in pages.
- Managed AGENTS.md block is never touched.

---

### Task 0: Contract verification from the live backend api-docs (read-only)

**Files:**
- Modify: `docs/superpowers/specs/2026-09-23-browse-platform-design.md` (fill the pre-implementation gates with verified values only)
- Test: none (read-only measurement task)

**Interfaces:**
- Consumes: live backend OpenAPI at `https://app-java-v3-production.up.railway.app/v3/api-docs` (public).
- Produces: verified parameter/contract table that Tasks 2-4 depend on (exact names only, no guessing).

- [ ] **Step 1: Fetch the listings browse parameters**

```bash
curl.exe -s --max-time 30 "https://app-java-v3-production.up.railway.app/v3/api-docs" -o "$env:TEMP\api.json"
```

Expected: valid JSON file > 100KB. If unreachable, STOP and declare (honesty rule) — do not invent parameter names.

- [ ] **Step 2: Extract exact query parameter names for the browse endpoint**

```bash
python3 -c "import json; d=json.load(open(r'C:\Users\w-co\AppData\Local\Temp\api.json',encoding='utf-8')); p=d['paths']; ks=[k for k in p if 'listing' in k.lower()]; print(ks)"
```

Expected: list containing the listings search path. Then print its GET parameters (name, type, enum for sort) verbatim.

- [ ] **Step 3: Verify reviews-read, similar, and save contracts**

```bash
python3 -c "import json; d=json.load(open(r'C:\Users\w-co\AppData\Local\Temp\api.json',encoding='utf-8')); p=d['paths']; print('reviews:',[k for k in p if 'review' in k.lower()][:8])"
```

Expected: reviews-read path exists or not — record either way. Repeat the same check for any similar-listings and listing-bookmark paths. Anything absent is CUT from scope (spec rule), not improvised.

- [ ] **Step 4: Amend the spec gates with verified values + commit**

Edit ONLY the `## بوابات ما قبل التنفيذ` section: replace each pending item with its verified exact name, or mark it CUT with the evidence line. Then:

```bash
git add docs/superpowers/specs/2026-09-23-browse-platform-design.md
git commit -m "docs(web): verify browse contracts from live api-docs (Task 0)"
```

Expected: commit created, working tree clean (`git status --short` empty).

---

### Task 1: Three-layer design tokens in `globals.css`

**Files:**
- Modify: `src/app/globals.css` (replace ad-hoc values with the token system; keep all existing selectors working)
- Test: token-validator run + build

**Interfaces:**
- Consumes: nothing (foundation task).
- Produces: CSS variables `--bg`, `--surface`, `--border`, `--ink`, `--ink-2`, `--primary`, `--primary-ink`, `--accent`, `--success`, `--danger`, `--radius-*`, `--space-*`, `--shadow-*`, `--font-*` that Tasks 2-6 consume by exact name.

- [ ] **Step 1: Write the token layers**

Replace the `:root` block in `src/app/globals.css` with (exact values — all measured):

```css
:root {
  /* primitive */
  --warm-50: #FDFBF7; --warm-100: #FFFFFF; --warm-200: #EDE6DA;
  --ink-900: #1C1917; --ink-500: #78716C;
  --teal-700: #0F766E; --teal-600: #0D9488;
  --amber-500: #D97706;
  /* semantic */
  --bg: var(--warm-50); --surface: var(--warm-100); --border: var(--warm-200);
  --ink: var(--ink-900); --ink-2: var(--ink-500);
  --primary: var(--teal-700); --primary-strong: var(--teal-600);
  --accent: var(--amber-500);
}
```

Rules enforced in this task: body text uses `--ink`/`--primary` only (never `--primary-strong`/`--accent` as text); `--accent` is background-only with `--ink` on top.

- [ ] **Step 2: Run the token validator**

```bash
node C:\Users\w-co\.opencode\skills\design-system\scripts\validate-tokens.cjs --dir src/
```

Expected: zero hardcoded hex outside `globals.css`. If the script errors on missing config, fall back to manual grep and record it:

```bash
Select-String -Path "src/components" -Pattern "#[0-9a-fA-F]{3,6}" | Select-Object -First 5
```

Expected: no matches.

- [ ] **Step 3: Verify green + commit**

```bash
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\npm.cmd" run lint 2>&1 | Select-Object -Last 3
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\npm.cmd" run build 2>&1 | Select-Object -Last 4
git add src/app/globals.css
git commit -m "feat(web): three-layer design tokens (Task 1)"
```

Expected: lint clean, build exit 0, commit created. Visual output unchanged (tokens only, no component usage yet).

---

### Task 2: Core interactive components (Button, Badge, Field)

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/field.tsx`
- Test: typegen + lint + build + agent-browser render check on `/` (components must not break existing render)

**Interfaces:**
- Consumes: token variables from Task 1 (exact names).
- Produces: `Button({variant: 'primary'|'secondary'|'ghost', size: 'sm'|'md'|'lg', disabled})`, `Badge({tone: 'featured'|'new'|'active'|'muted'})`, `Field({label, error, children})` wrapping native input/select/textarea — Tasks 5-7 consume these exact props.

- [ ] **Step 1: Write `button.tsx`**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

export function Button({ variant = "primary", size = "md", children, ...rest }: {
  variant?: Variant; size?: Size; children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn btn-${variant} btn-${size}`} {...rest}>
      {children}
    </button>
  );
}
```

Styles live in `globals.css` (`.btn-*` classes using `var(--primary)` etc.), states: default/hover/active/disabled + `:focus-visible` outline. Primary background MUST be `var(--primary)` (#0F766E, 5.47 AA) — never `--primary-strong` for text-sized UI.

- [ ] **Step 2: Write `badge.tsx` and `field.tsx`**

`Badge({tone, children})`: `featured` = amber background + ink text (5.49 measured — never amber text); `new` = primary background + white text; `active`/`muted` = tinted surface + ink text. `Field({label, error, hint, children})`: label + cloned control + error text in danger tone + `aria-invalid`/`aria-describedby` wiring.

- [ ] **Step 3: Verify + commit**

```bash
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\node.exe" node_modules/next/dist/bin/next typegen
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\npm.cmd" run lint 2>&1 | Select-Object -Last 2
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\npm.cmd" run build 2>&1 | Select-Object -Last 2
git add src/components/ui/button.tsx src/components/ui/badge.tsx src/components/ui/field.tsx src/app/globals.css
git commit -m "feat(web): Button/Badge/Field primitives (Task 2)"
```

Expected: all green (build exit 0), commit created. No pages import them yet — zero visual change by design.

---

### Task 3: Content components (Card, PriceTag, Stat, PageHeader)

**Files:**
- Create: `src/components/ui/card.tsx`, `src/components/ui/price.tsx`, `src/components/ui/stat.tsx`, `src/components/ui/page-header.tsx`
- Test: typegen + lint + build

**Interfaces:**
- Consumes: `Badge` from Task 2, `ListingSummary` type from `src/lib/api/types.ts` (existing — read it, do not redefine).
- Produces: `ListingCard({listing})` (image 4:3 + featured/new Badge + PriceTag + title + location), `PriceTag({cents, currency})` (major-units formatting per backend contract: `BigDecimal.valueOf(cents, 2)`), `Stat({label, value})`, `PageHeader({title, description, actions})` — Task 5/6 consume these.

- [ ] **Step 1: Write the four components**

`ListingCard` links the whole card to `/listings/{id}` (single anchor, no nested links), image with `alt={listing.title}` (empty-gallery handling belongs to Task 6, not here). `PriceTag` formats `price/100` with `ar-SA` locale + currency suffix (no invented symbols — backend sends `currency: "SAR"`).

- [ ] **Step 2: Verify + commit**

Same verify trio as Task 2 (typegen, lint, build — all via the pinned toolchain paths above), then:

```bash
git add src/components/ui/card.tsx src/components/ui/price.tsx src/components/ui/stat.tsx src/components/ui/page-header.tsx
git commit -m "feat(web): Card/PriceTag/Stat/PageHeader (Task 3)"
```

Expected: green + commit. Still no page imports.

---

### Task 4: Feedback components (Skeleton, EmptyState, Pagination)

**Files:**
- Create: `src/components/ui/skeleton.tsx`, `src/components/ui/empty-state.tsx`, `src/components/ui/pagination.tsx`
- Test: typegen + lint + build

**Interfaces:**
- Consumes: tokens only.
- Produces: `Skeleton({lines})` (warm pulse, `aria-busy`), `EmptyState({title, hint, action})`, `Pagination({page, totalPages, href})` building `?page=N` links preserving existing query params (use `URLSearchParams`, never string concat) — Task 5 consumes `Pagination`.

- [ ] **Step 1: Write the three components**

`Pagination` rule: numbered links + prev/next, `aria-current="page"` on current, `rel="prev"/"next"` preserved. It receives the CURRENT params object and only swaps `page` — params contract comes from Task 0's verified table.

- [ ] **Step 2: Verify + commit** (same trio + `git commit -m "feat(web): Skeleton/EmptyState/Pagination (Task 4)"`).

---

### Task 5: Homepage composition (`/`)

**Files:**
- Modify: `src/app/page.tsx` (compose only — session logic, auth buttons, and data sources unchanged)
- Test: typegen + lint + build + agent-browser DOM check + curl HTML assertions

**Interfaces:**
- Consumes: Task 2-4 components, existing reads (`getListings` public channel with the two verified param sets: promoted-first + newest-first), existing `auth-buttons.tsx`.
- Produces: the reference implementation of the token system on a live page — Tasks 6-7 follow its patterns (no new patterns invented there).

- [ ] **Step 1: Compose hero + featured + newest + entry cards**

Hero search form uses GET to `/listings` (native form, no client JS required) with the verified param names from Task 0. Featured + newest sections share ONE backend GET each (React `cache()` dedup already in the channel — do not add fetching code). Entry cards link `/neighborhoods` and `/provider`.

- [ ] **Step 2: Verify live render**

```bash
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\npm.cmd" run build 2>&1 | Select-Object -Last 2
```

Expected: exit 0. Then agent-browser snapshot of `/` asserting: hero form present, featured cards present, no console errors (`get_errors` clean). Then:

```bash
git add src/app/page.tsx
git commit -m "feat(web): homepage platform composition (Task 5)"
```

---

### Task 6: Browse page (`/listings`) — filters + grid + pagination

**Files:**
- Modify: `src/app/listings/page.tsx` (await `searchParams`; parse ONLY Task-0-verified params; unknown params ignored, never forwarded)
- Test: typegen + lint + build + agent-browser (filter submit → URL change → grid update) + curl canonical assertion

**Interfaces:**
- Consumes: Task 2-4 components, verified param names from Task 0, existing public channel.
- Produces: the URL-as-state pattern (filter chips with individual clear + clear-all) reused by no other task — terminal surface.

- [ ] **Step 1: Build sidebar + grid + pagination wiring**

Radius select renders ONLY after a location value exists (progressive disclosure per spec). Sort select limited to Task-0-verified enum values. Invalid enum/number inputs fall back to defaults (never 500).

- [ ] **Step 2: Verify + commit**

Trio green + agent-browser filter round-trip + curl canonical check:

```bash
curl.exe -s "http://127.0.0.1:3000/listings?sort=newest" -o "$env:TEMP\b.html"
```

(Requires a running dev server in the same session — sandbox kills background trees between calls, so boot foreground per the skill's adaptation note and measure within the call. If unreachable, declare it and rely on build + production-after-push instead of guessing.)

```bash
git add src/app/listings/page.tsx
git commit -m "feat(web): browse filters/grid/pagination (Task 6)"
```

---

### Task 7: Detail page (`/listings/[id]`) elevation

**Files:**
- Modify: `src/app/listings/[id]/page.tsx` (compose only — `generateMetadata`, single-fetch, not-found branch, lead form logic unchanged)
- Test: typegen + lint + build + agent-browser + curl canonical/og/JSON-LD assertions

**Interfaces:**
- Consumes: Task 2-4 components; reviews/similar/save ONLY if Task 0 verified their contracts — otherwise CUT (share-via-Web-API only, contact form as-is).
- Produces: nothing downstream (terminal surface).

- [ ] **Step 1: Compose gallery + info + sticky card + verified blocks**

Red-line checklist inside this step (all must stay true): single backend GET shared by metadata+body · verbatim canonical/og/JSON-LD with `<`→`\u003c` escaping · unknown id → not-found + `noindex`. Gallery with zero images renders `EmptyState` (never stock photos).

- [ ] **Step 2: Verify + commit** (trio + curl assertions for canonical/og/noindex + `git commit -m "feat(web): detail elevation (Task 7)"`).

---

### Task 8: Cross-cutting states + final gate

**Files:**
- Modify: `src/app/listings/loading.tsx` (new siblings), `src/app/error.tsx`, `src/app/global-error.tsx` (restyle only, same contracts)
- Test: full trio + full agent-browser pass over `/`, `/listings`, `/listings/[id]` + curl matrix

- [ ] **Step 1: Skeletons per surface + error restyle**

Keep the root `loading.tsx` streaming contract (spec red line). Error boundaries keep `digest` logging + add retry/home actions in the new visual language.

- [ ] **Step 2: Final verification + commit**

```bash
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\node.exe" node_modules/next/dist/bin/next typegen
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\npm.cmd" run lint 2>&1 | Select-Object -Last 2
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\node.exe" node_modules/typescript/bin/tsc --noEmit 2>&1 | Select-Object -First 5
& "C:\Users\w-co\Desktop\backend java\.tools\node-v26.8.2-win-x64\npm.cmd" run build 2>&1 | Select-Object -Last 3
git add -A
git commit -m "feat(web): cross-cutting states + browse platform complete (Task 8)"
```

Expected: everything exit 0, tree clean otherwise. Then report — push ONLY on owner's explicit word.

## Self-Review

**1. Spec coverage:** §1 tokens/components → Tasks 1-4 · §2 home → Task 5 · §3 browse → Task 6 · §4 detail → Task 7 · §5 states/verification → Task 8 · G-N4 appendix (verticals/promotion slots/directory) → category-first-class in Task 6 filters + Badge positions in Tasks 3/7, monetization UI excluded everywhere · 8 decisions honored (light-warm, full filters, numbered pages, no-geo home, conditional reviews/similar/save, phased method, pinned toolchain). Pre-implementation gates → Task 0. No orphan spec section.

**2. Placeholder scan:** no TBD/TODO/fill-in-later; every step names exact files, exact commands with exact toolchain paths, exact expected outputs; no "similar to Task N" (each verify block repeats its commands verbatim).

**3. Type consistency:** `ListingSummary` imported from existing `src/lib/api/types.ts` (never redefined) · `page/totalPages` naming matches the measured backend contract (`pageNumber/pageSize/totalPages` mapped once in Task 6) · token names identical across Tasks 1-4 · `searchParams` awaited per Next 16 async API.
