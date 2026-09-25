<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project-specific rules — Marketplace Web (Next.js BFF)

Backend-for-Frontend for the marketplace backend (separate repo). The Next.js
server holds the OAuth2 client secret and performs the authorization-code +
PKCE flow; tokens stay server-side, the browser only holds the encrypted
session cookie.

## Stack (pinned, verified 2026-09-15)

- Next.js 16.3.5 + React 19.3.0 + Node v26.8.2
- Better Auth 1.7.5 + Generic OAuth (stateless — no database)
- TypeScript + ESLint; zero CSS framework — RTL-logical design tokens
  (`globals.css`) + Cairo variable font; data layer: DAL + direct server
  fetch + typed BFF-proxy client (see README "Frontend foundation")

## Routes

- `/` — sign in/out, session state + the public browse entry link (Arabic RTL UI)
- `/listings` — PUBLIC active-listing browse (paginated; anonymous GETs —
  the SEO-indexable surface, data via `src/lib/api/public.ts`)
- `/listings/[id]` — PUBLIC listing detail: `generateMetadata` (title
  template + canonical + OpenGraph via `metadataBase`) and the
  backend-composed schema.org JSON-LD embedded verbatim (the backend's
  L39 `listing-path` contract defaults to this exact route); unknown ids
  → not-found boundary + `noindex` (documented streamed-404)
- `/neighborhoods` — PUBLIC geo picker (roadmap stage 2): `?parent=`
  drill-down + `?q=` autocomplete (2-char floor) over the backend's
  administrative tree via `src/lib/api/geo.ts`; the `/geo/tree` read is
  NOT used (409 CONFLICT-001 on production — measured); level-3 leaves
  carry the join affordance (Server Action), anonymous visitors get the
  sign-in gate instead
- `/neighborhood` — AUTHENTICATED neighborhood home (L41 + L42):
  anonymous → sign-in gate (`noindex`; nothing community is public);
  member → membership card + feed + composer — data via
  `src/lib/api/community.ts` (the authenticated RSC channel), writes via
  Server Actions in `src/app/neighborhood/actions.ts` (`backendSend`)
- `/provider` — AUTHENTICATED provider home (roadmap stage 3,
  Nextdoor Business): anonymous → sign-in gate (`noindex`); no provider
  profile (the me-surfaces' 404 house answer) → the L36 onboarding
  form; provider → dashboard (L40 view analytics + L25 stats + the
  public ACTIVE inventory + the create entry) — data via
  `src/lib/api/provider.ts`, writes via Server Actions in
  `src/app/provider/actions.ts`
- `/provider/listings/new` — AUTHENTICATED create-listing form (born
  DRAFT; the backend's VERIFIED gate surfaces its own words on submit)
- `/provider/listings/[id]` — AUTHENTICATED listing manage: the L38
  completeness checklist, field editing + the L31 property block (geo
  location select) prefilled from the public detail read (ACTIVE-only —
  the measured read model), the lifecycle actions whose ACTIVATION is
  the L46 bridge trigger (`ListingActivatedEvent`), and the L28/L34
  photo surface (presigned declare → PUT → confirm + gallery + delete;
  S3-unconfigured answers 503 and renders honestly — the whole media
  channel is storage-gated on the backend)
- `/inbox` — AUTHENTICATED inbox (roadmap stage 4): the in-app
  notification feed (mark-read) + the L22 preference matrix (7 types ×
  3 channels; the in-app column always on, diffs only are upserted) +
  the L34 provider lead inbox (status tabs + one-way moves) — data via
  `src/lib/api/inbox.ts`
- `/inbox/conversations/[id]` — AUTHENTICATED conversation view (L44
  direct + booking threads): messages oldest-first, composer, and the
  view-marks-read effect; message ownership rides the measured
  `GET /users/me` identity chain (senderId === me.id)
- `/listings/[id]` now also carries the L34 PUBLIC lead form (the
  mediated-contact model — name/phone/message, no account required;
  the app's first public write via `backendSendPublic`, attribution
  when a session exists)
- `/neighborhood` feed posts carry «راسل الجار» — the L44 entry
  (idempotent `POST /messages/conversations/direct`; hidden on own
  posts via the /me chain; the backend's 400-self guard is the
  authority)
- `/profile` — DAL session + direct backend `/me` fetch (server data layer,
  NOT a self-fetch through the BFF route — packaged BFF guide forbids it)
- `/api/auth/[...all]` — Better Auth handler (OAuth callback included)
- `/api/backend/[...path]` — Bearer relay to `BACKEND_URL` (401 = re-auth;
  client-side use ONLY — server components use `src/lib/api/server.ts`
  for authenticated data, `src/lib/api/public.ts` for public data)

## Rules

- Never commit secrets: `.env*` is gitignored; `.env.example` holds placeholders only; real dev values live in local `.env.local`; production values live only in Railway service variables.
- Backend for live verification: the Railway production service
  https://app-java-v3-production.up.railway.app (service `app-java-v3`).
  Local `.env.local` and the deployed service both point `BACKEND_URL` at
  it. Full login/consent/session flows additionally need a real backend
  user account.
- This repo deploys as Railway service `web-marketplace` (GitHub-connected,
  branch `main`, auto-deploy): https://web-marketplace-production-5cc1.up.railway.app.
- Add no dependency unless measured-needed against the pinned stack; Next.js builds must stay green (`npm run build`).
- Safety net: `npm run test:unit` (vitest: problem decoder + formatters) and `npm run test:e2e` (Playwright smoke via installed Chrome: hero form, sanitize-200s, relay 401, noindex, POST-only) must stay green; e2e boots its own dev on :3101 and asserts structure/contracts only (never data rows).
- Run everything with the pinned toolchain `../.tools/node-v26.8.2-win-x64` (Node
  v26.8.2, enforced by `engines` + `.npmrc engine-strict`) — ambient `node`
  on this machine is older and must not be used.
- After every edit, verify the page still works at runtime using the next-dev-loop Skill (guide Step 4).
