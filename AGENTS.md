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
  public ACTIVE inventory + the create entry + the stage-5 reviews
  section: reviews about me newest-first via `GET
  /reviews/provider/{userId}` on the session's own backend user id
  (the A1 contract), each unreplied review carrying the L21 reply
  form `POST /reviews/{id}/reply`) — data via `src/lib/api/provider.ts`
  + `src/lib/api/reputation.ts`, writes via Server Actions in
  `src/app/provider/actions.ts`
- `/providers/[id]` — PUBLIC provider page (roadmap stage 5,
  السمعة — the second SEO surface, L36): one anonymous read
  `GET /providers/{profileId}/public` (measured: NO auth gate — unknown
  ids answer 404 NF-001) carrying the profile + status badge + the
  aggregate rating block + the VERIFIED-gated ACTIVE listings page;
  `generateMetadata` (title template + canonical + OG — indexable);
  unknown ids → not-found boundary + `noindex` (the documented
  streamed-404); the full reviews LIST is not renderable here (reviews
  are keyed by the provider user id no public read exposes — declared
  backend gap) — data via `src/lib/api/reputation.ts`
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
- `/bookings` — AUTHENTICATED consumer bookings home (roadmap stage 6,
  الحجز والدفع): anonymous → sign-in gate (`noindex`); the caller's
  own bookings self-scoped through the ME chain (`GET
  /bookings/consumer/{me.id}` — the id resolves from the backend's
  /me projection, never from the client) — data via
  `src/lib/api/booking.ts`, `?page=` pagination
- `/bookings/[id]` — AUTHENTICATED participant-scoped booking detail
  (stage 6): the backend refuses non-participants with its own words
  (rendered verbatim); the caller's ROLE joins through their own
  consumer/provider first pages (BookingResponse carries NO
  participant ids — measured); role-classified sections: consumer
  cancel/payment/review, provider confirm/complete/cancel/reverse
  review; the payment block resolves the intent through the
  deterministic idempotency key (read-or-create — no "intent by
  booking" read exists) and renders amountCents (the booking's only
  readable total) with the honest PROCESSING/no-Stripe state; the
  disputes section (L24 — النزاعات): the booking's disputes via
  `GET /bookings/{id}/disputes` (participant or ADMIN — the backend's
  own gate; its refusal words rendered verbatim) + the open form for
  KNOWN roles on the measured query-string contract (`POST
  /bookings/{id}/disputes?reason` — `@RequestParam`, never a JSON
  body; NO booking-status gate exists on the backend's open — none
  invented); the resolve outcome (decision + refund total) renders as
  a measured fact when present — the decision itself is the
  administration's (ADMIN-only, roles not carried by /me — measured)
  — data via `src/lib/api/disputes.ts` + its pure contract
  `disputes-contract.ts`
- `/listings/[id]/book` — AUTHENTICATED booking request (stage 6):
  the gate renders BEFORE any listing read (the measured privacy
  contract); the stay window [startsAt, endsAt) as UTC instants
  (datetime-local interpreted as UTC — the stated convention), the
  total DERIVED server-side, the exact-slot gate's 400 words surface
  verbatim; success redirects to the new booking
- `/provider/bookings` — AUTHENTICATED provider bookings + availability
  (stage 6): incoming bookings self-scoped via the ME chain (`GET
  /bookings/provider/{me.id}`) + the provider's published slots (the
  exact-slot gate's source; authenticated read, window computed inside
  the channel) + the slot publish form on the MEASURED query-string
  contract (`@RequestParam startsAt/endsAt` — never a JSON body)
- `/listings/[id]` now also carries the L34 PUBLIC lead form (the
  mediated-contact model — name/phone/message, no account required;
  the app's first public write via `backendSendPublic`, attribution
  when a session exists) and the stage-6 booking entry LINK «احجز هذا
  المكان» (a link, never a form — the page's form count stays exactly
  1)
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
- Dev backend (since 2026-09-22): the backend team's shared **staging** service
  https://app-java-v3-staging-staging.up.railway.app (their runbook:
  `docs/frontend-dev-oauth-setup.md` @ `6b19a73` in app-java-v3 — never a
  local backend checkout, never production). Local `.env.local` points
  `BACKEND_URL` there with the dev client `marketplace-web-staging` (shareable
  staging secret — dev-only, never in production; the production secret
  never leaves Railway). The OAuth chain is measured live to the backend
  login page; completing a login additionally needs a backend account's
  credentials (the seeded `admin` password is not a known constant —
  README).
- Production verification of pushes still measures the Railway production
  service https://app-java-v3-production.up.railway.app (service
  `app-java-v3`) — the deployed `web-marketplace` service keeps pointing
  `BACKEND_URL` at it.
- This repo deploys as Railway service `web-marketplace` (GitHub-connected,
  branch `main`, auto-deploy): https://web-marketplace-production-5cc1.up.railway.app.
- Add no dependency unless measured-needed against the pinned stack; Next.js builds must stay green (`npm run build`).
- Safety net: `npm run test:unit` (vitest: problem decoder + formatters) and `npm run test:e2e` (Playwright smoke via installed Chrome: hero form, sanitize-200s, relay 401, noindex, POST-only) must stay green; e2e boots its own dev on :3101 and asserts structure/contracts only (never data rows).
- Run everything with the pinned toolchain `../.tools/node-v26.8.2-win-x64` (Node
  v26.8.2, enforced by `engines` + `.npmrc engine-strict`) — ambient `node`
  on this machine is older and must not be used.
- After every edit, verify the page still works at runtime using the next-dev-loop Skill (guide Step 4).
