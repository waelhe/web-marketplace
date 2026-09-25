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
  the SEO-indexable surface, data via `src/lib/api/public.ts`) + the
  L35 session-aware saved-searches strip (batch-1 spec §2): chips that
  restore the stored criteria through the URL (the measured name map
  query/latitude/longitude ↔ q/lat/lng; the stay window rides ISO
  instants on the wire — a plain date answers the measured 400 — while
  the URL keeps the date form), the per-chip delete and the save form
  (`alertEnabled` FALSE by default — alerts are the backend matcher's
  alone) — data via `src/lib/api/saved-searches.ts`, writes via Server
  Actions in `src/app/listings/actions.ts`
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
  Server Actions in `src/app/neighborhood/actions.ts` (`backendSend`);
  the batch-2 §1 conversational layer: a per-post comments disclosure
  (`comments.tsx` — an ON-DEMAND client read through the BFF relay
  `apiGet`, the documented client channel for client-side data needs;
  comment writes ride the Server Action) + the author's own-post
  delete (`DELETE /posts/{id}`) + L45 report affordances on posts and
  comments (`POST /reports` — POST|COMMENT targets, the backend's own
  four-value reason vocabulary; own-content/duplicate 409 and unknown
  404 surface verbatim)
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
- `/provider/listings/[id]/pricing` — AUTHENTICATED listing price
  calendar (L26 host tools, batch-1 spec §1): the weekend multiplier
  upsert/remove ((0,10] scale 3 — the backend's Bean Validation + V41)
  and the seasonal ranges [fromDate, toDate) with absolute nightly
  prices (a real overlap answers 409 in the backend's own words);
  the calendar read doubles as the ownership probe (403 foreign / 404
  unknown) and carries NO status gate (measured 200 on an archived
  listing); RULES-ONLY display — the effective nightly price of any
  stay is the backend's PricingService, never recomputed client-side
  — data via `src/lib/api/pricing.ts`, writes via Server Actions in
  `src/app/provider/listings/[id]/pricing/actions.ts`
- `/inbox` — AUTHENTICATED inbox (roadmap stage 4): the in-app
  notification feed (mark-read) + the L22 preference matrix (7 types ×
  3 channels; the in-app column always on, diffs only are upserted) +
  the L34 provider lead inbox (status tabs + one-way moves) — data via
  `src/lib/api/inbox.ts`
- `/inbox/conversations/[id]` — AUTHENTICATED conversation view (L44
  direct + booking threads): messages oldest-first, composer, and the
  view-marks-read effect; message ownership rides the measured
  `GET /users/me` identity chain (senderId === me.id); the batch-2 §4
  unread badge (`GET /messages/conversations/{id}/unread` — the
  backend's own badge endpoint, read at render; the mark-read effect
  clears it server-side)
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
  batch-2 §2 consumer cancel (`POST /payments/intents/{id}/cancel` —
  CREATED-only per the backend's state machine; the transition 409
  words surface verbatim) joins the process form, and the batch-2 §4
  booking-thread entry («محادثة هذا الحجز» — `POST
  /messages/conversations {bookingId}`) lands participants on the
  conversation; the disputes section (L24 — النزاعات): the booking's disputes via
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
  contract (`@RequestParam startsAt/endsAt` — never a JSON body) + the
  batch-2 §5 pair on the same query-string discipline: the weekly
  availability rule (`POST …/availability/rules?dayOfWeek&startTime&endTime`
  — expanded by the backend's DAILY DayHasPassed generator, never
  client-side) and the time-off block (`POST …/time-off?startsAt&endsAt`);
  the contract exposes NO read/delete for rules/time-off (measured) —
  the created entity's echo is the whole surface, stated honestly
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
  NOT a self-fetch through the BFF route — packaged BFF guide forbids it);
  the batch-2 §3 surfaces: «مراجعاتي» (reviews the caller WROTE — `GET
  /reviews/reviewer/{me.id}` — with the per-review edit form `PUT
  /reviews/{id}`, the backend's original-reviewer gate surfacing its own
  403 words) + «ما قاله المزوّدون عني» (`GET /reviews/consumer/{me.id}`
  — the I8 trust view; both keyed by the /me-resolved user id, never
  client-sent) + «صدّر بياناتي» — the GDPR Art. 20 export download link
  (the `/api/account/export` route below)
- `/admin` — AUTHENTICATED administration console (batch-3 spec + the
  batch-4 spec — the console II: the remaining 21 admin operations; the
  whole `/api/v1/admin/**` contract now has a console home): the
  moderation report queue (L45's administrative counterpart — `GET
  /admin/reports?status=` FIFO on the complete sort key with the
  OPEN/RESOLVED/DISMISSED axis + per-open-report resolve `POST
  /admin/reports/{id}/resolve {action: DISMISS|HIDE_CONTENT, note?}`,
  a second resolve answering 409 in the backend's own words), the
  pricing-rules manager (the ×5 admin ops: list/create/activate/
  deactivate/delete on `PricingRuleController`'s class-level ADMIN
  gate) and the payments administration (`GET /admin/payments` intent
  summaries whose id IS the intent id + confirm
  `POST /payments/intents/{id}/confirm {externalId}` + full refund
  `POST /payments/{paymentId}/refund` — the payment-row id appears in
  no contract read, stated honestly on the form) — plus the batch-4
  surfaces: the users administration (list + role PUT on the
  `UserRole` source enum + status PUT (`@Pattern` DISABLED|ENABLED +
  audited reason) + the I7 pseudonymize/purge-content/purge-audit-
  history trio with its measured 503-SU-001 capability note), the
  all-bookings read (`GET /admin/bookings?status=` — the status filter
  passes through verbatim, no client-side vocabulary), the
  all-listings inventory (rows carry `providerId` — the only contract
  read that does) + archive + the L37 promotion PUT (empty `until`
  CLEARS the boost — the backend's own semantics), the single-intent
  read `GET /admin/payments/{id}`, provider verify/suspend (the
  profile-id space), the administrative ledger (balance read +
  `POST …/credit?paymentIntentId&amountCents` — a QUERY-STRING
  contract), the dispute resolve (OPTIONAL body — absent = NO_ACTION)
  and the geo admin trio (create/rename/delete with the source slug
  `@Pattern`); the three input-driven reads (single intent, provider
  balance, entity revisions) ride the URL as state through plain GET
  forms (`?intentId=`, `?balanceProviderId=`, `?revisionEntity=&
  revisionId=` — the `/neighborhoods?parent=` discipline, no
  client-side fetch) — data via `src/lib/api/admin.ts`, writes via
  Server Actions in `src/app/admin/actions.ts`. The whole surface sits
  behind the backend's three-layer hasRole('ADMIN') gates and `/me`
  carries no roles (measured) — a non-admin caller sees the backend's
  own 403 AUTHZ-001 words rendered verbatim (the honest-failure
  pattern; the admin happy paths are unverifiable with the test
  account — no ADMIN credentials exist on our side, declared in the
  spec); `noindex`, no public nav link (the administration knows the
  address)
- `/api/auth/[...all]` — Better Auth handler (OAuth callback included)
- `/api/account/export` — AUTHENTICATED download route (batch-2 spec §3,
  GDPR Art. 20): resolves the session Bearer with the relay's own
  `getAccessToken({useAccountCookie})` discipline, fetches
  `GET /users/me/export` directly, and returns the backend's document
  verbatim with `Content-Disposition: attachment` — a native browser
  download, no data recomposed or stored
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
- Run everything with the pinned toolchain `../.tools/node-v26.8.2-win-x64` (Node
  v26.8.2, enforced by `engines` + `.npmrc engine-strict`) — ambient `node`
  on this machine is older and must not be used.
- After every edit, verify the page still works at runtime using the next-dev-loop Skill (guide Step 4).
