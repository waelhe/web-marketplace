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

- `/` — sign in/out, session state + the public browse entry link (Arabic
  RTL UI); the two listing strips (featured + latest) carry the **بيانات
  عرض** showcase below the storefront floor (the same engagement rule as
  `/listings` — the strip's own SUCCESS read only; honest failure
  branches untouched)
- `/search` — PUBLIC flat text search (slice S4, charter J2): ONE text
  field + the live category rail (S2's registry read; codes as the link
  values), native GET, no client JS — URL is the state. S5 SEO decision:
  `noindex, follow` (the category state duplicates `/listings?category=`
  byte-identically — measured in S4; `?q=` URLs are user-generated thin
  pages) — the page stays CRAWLABLE in robots.txt so the directive is
  seen, and `follow` passes the rail's link equity to the listings. The
  wire routing mirrors the backend's MEASURED flat-search dispatch: text
  present → `GET /search?q` ALONE (a non-blank q silently drops every
  other flat criterion backend-side — the composition gap recorded in the
  charter); category only → the dedicated `GET /search/category/{c}`;
  idle → no backend read. Unknown categories answer 200 empty envelopes
  (reads never 400) — data via `src/lib/api/public.ts`
- `/listings` — PUBLIC active-listing browse (paginated; anonymous GETs —
  the SEO-indexable surface, data via `src/lib/api/public.ts`; the
  category-ONLY state — no other criterion, no sort — rides the
  backend's dedicated `GET /listings/category/{c}` op: measured
  byte-identical to the criteria op's category branch, and the category
  path ops answer 500 INT-001 on sort — a sort keeps the criteria op);
  the **بيانات عرض showcase** (the seed-content decision,
  `src/lib/demo-listings.ts`, 2026-09-29): when the unfiltered
  first-page browse read answers 200 with fewer real ACTIVE listings
  than the storefront floor (4), a clearly-labeled demo grid (8 stay
  rows, `demo-`-prefixed ids that never parse as UUIDs, ZERO detail
  links — the public detail read would 404 and faking detail pages
  would poison the S5 SEO layer) renders ABOVE the honest real-results
  section (nothing real hidden); it rides the SUCCESS path only (an
  outage keeps its honest failure — display data never masks it), never
  engages on any filtered/sorted/later page (the search/filter contract
  is real data only), self-retires the moment real content reaches the
  floor, and `DEMO_LISTINGS=0|false` kills the whole layer (unset = ON —
  the owner's directive is the default) + the
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
- `/neighborhood` — AUTHENTICATED neighborhood home, the INTEGRATED
  community+business product surface (slice S7, the methodology
  reversal's first embodiment — owner directive 2026-09-29: product
  first, the frontend defines and the backend will serve; REBUILT as
  the rich feed product in slice S8 per the owner-supplied design spec
  2026-09-29 — «خلاصة الحي ومنشورات الجيران», the warm-emerald
  sanctuary): anonymous →
  sign-in gate (`noindex`; nothing community is public); member → the
  product view under the scoped `.hood-app` design system (emerald
  tokens layered OVER the platform's warm tokens — never replacing
  them): the hero band (`hood-hero`, the emerald gradient) with the
  neighborhood identity + the pulse chips
  (members / posts-this-week / local businesses — the
  product-defined `NeighborhoodPulse` contract, display-labeled
  «بيانات عرض» until the backend serves the aggregate; `DEMO_
  NEIGHBORHOOD=0` kills the layer, unset = ON) + the product
  sub-navigation (`hood-tabs`: الخلاصة active, سوق الحي → the REAL
  /listings, أعمال الحي → the rail anchor); the main column (FIRST in
  the DOM — the feed leads, the sidebar auxes): (1) THE SHARE
  COMPOSER: quick-type chips over the SAME measured four-value
  category vocabulary (`composer-types` radios — the chips ARE the
  category input) + the publishing-scope selector (الحي المباشر real;
  الأحياء المجاورة an honest disabled «قريبًا» — the `scope=adjacent`
  contract is registered, §7/7) + the poll quick-option honestly
  gated («قريبًا» — the NeighborhoodPoll creation contract is
  registered); (2) THE FILTER TABS (`hood-filter`): the REAL
  `?category=` reads as the product's tab row (invalid values drop to
  null — never an invented filter); (3) THE FEATURED ZONE
  (`hood-featured`): the pinned urgent alert (`alert-card` — the
  `NeighborhoodAlert` contract, «أكّد علمك» as a display
  interaction) + the interactive poll (`poll-card` — the
  `NeighborhoodPoll` contract, ONE display vote per session with live
  percentage bars; both display-labeled, never fake writes); (4) THE
  FEED (L42, the heart): rich post cards (avatar + category pill +
  time head, comments disclosure, own-post delete, L45 reports,
  «راسل الجار»); (5) THE BUSINESS LAYER: «أعمال حارتك» — the
  business rail (`biz-rail`, the product-defined
  `NeighborhoodBusiness` contract: name/trade/tagline/
  rating/verified/offerings) — display cards ONLY, never links (demo
  `demo-` ids are not UUIDs; rule 4 of the display-data discipline);
  (6) THE MARKETPLACE BRIDGE: «إعلانات في حارتك» — REAL live data:
  the location-scoped public search read (`GET /search?locationId=`
  through `searchListings` — the same criteria op every public browse
  rides; geo self+descendants resolution; measured live 2026-09-29 on
  staging: real rows + real detail links) — the community and the
  marketplace in one screen; the smart sidebar (`hood-side`): the
  membership card + the weather widget (`NeighborhoodWeather`
  contract, display-labeled) + the groups chips
  (`NeighborhoodGroup` contract, display-only) + the static safety
  guidance card (real copy, no data rows) — data via
  `src/lib/api/community.ts` + the public channel,
  display layers via `src/lib/neighborhood-product.ts`, writes via
  Server Actions in `src/app/neighborhood/actions.ts` (`backendSend`);
  the batch-2 §1 conversational layer: a per-post comments disclosure
  (`comments.tsx` — an ON-DEMAND client read through the BFF relay
  `apiGet`, the documented client channel for client-side data needs;
  comment writes ride the Server Action) + the author's own-post
  delete (`DELETE /posts/{id}`) + L45 report affordances on posts and
  comments (`POST /reports` — POST|COMMENT targets, the backend's own
  four-value reason vocabulary; own-content/duplicate 409 and unknown
  404 surface verbatim)
- `/neighborhood/events` — AUTHENTICATED events management surface
  (slice S9, the owner-supplied design spec 2026-09-29 «إدارة
  الفعاليات وتجمعات الحي»): anonymous → sign-in gate; no membership
  → the picker invitation (the feed's own honest branches,
  `noindex`); member → the product view in the same `.hood-app`
  sanctuary: the prominent «تنظيم فعالية جديدة +» launcher riding
  the hero band (its modal = the FULL product form — name/type/date/
  time/location/description/seats — whose submission answers with
  the honest registered-pending state: the `NeighborhoodEvent`
  creation contract is registered §7/7 and the backend write does
  not exist yet; native `<dialog>` for focus/Escape semantics); the
  events board (`event-board.tsx`, client): the five filter chips
  (الكل/هذا الأسبوع/رياضية وعائلية/تطوعية/فعالياتي — `filterEvents`,
  the THIS_WEEK window = 7 days from today; MINE = the attendance
  set), the featured weekly initiative (`event-featured`: organizer,
  when/where, attendance + volunteer DISPLAY interactions), and the
  events grid with the three registration states (LIMITED_SEATS with
  `seatsRemaining` counter, OPEN, TABLE_RESERVATION — the design's
  vocabulary); the interactive monthly calendar (`event-calendar.tsx`:
  month nav, event-day dots from Damascus calendar parts); the
  sidebar: activity summary + badge, the suggestion box
  (`suggestion-box.tsx`: vote + add-idea display interactions), and
  the safety guidelines. DATE DISCIPLINE (measured hydration risk):
  client components that format dates PIN the timezone to
  `Asia/Damascus` (`EVENT_TIMEZONE`, the product's own geography —
  the geo tree is ريف دمشق) so SSR and browser hydration render
  byte-identical output; never format event dates unpinned. Data:
  `src/lib/neighborhood-events.ts` (contracts + display datasets,
  the same demo discipline + kill-switch); the feed page gains the
  الفعاليات product tab + the upcoming-events preview widget linking
  here.
- `/provider` — AUTHENTICATED provider home (roadmap stage 3,
  Nextdoor Business): anonymous → sign-in gate (`noindex`); no provider
  profile (the me-surfaces' 404 house answer) → the L36 onboarding
  form (success redirects to `/provider?profile={id}` — the PK seam);
  provider → dashboard (L40 view analytics + L25 stats + the ledger
  link + the profile card when `?profile=` carries the PK (slice S3:
  the edit entry + the L36 public page link ride it) + the public
  ACTIVE inventory + the create entry + the stage-5 reviews
  section: reviews about me newest-first via `GET
  /reviews/provider/{userId}` on the session's own backend user id
  (the A1 contract), each unreplied review carrying the L21 reply
  form `POST /reviews/{id}/reply`) — data via `src/lib/api/provider.ts`
  + `src/lib/api/reputation.ts`, writes via Server Actions in
  `src/app/provider/actions.ts`
- `/provider/ledger` — AUTHENTICATED provider money home (slice S3,
  charter J5 / L20): the me-chain balance read (`GET
  /providers/me/ledger/balance` — measured: an unread ledger answers
  an EMPTY 0 record, never 404) + the paginated statement (`GET
  /providers/me/ledger/statement?page=`, URL-as-state pagination);
  "me" resolves server-side from the session's backend user (the client
  never supplies an id); 0 balance is the measured honest state (credits
  ride payment completion — the Stripe owner input); LEDGER-403 (battery
  BE-04) is FIXED on staging (measured live 2026-09-29) and any refusal
  words would render verbatim — data via `src/lib/api/provider.ts`
- `/provider/profile` — AUTHENTICATED provider profile edit (slice S3,
  J5): `GET/PUT /providers/{id}` keyed by provider_profiles.PK — the
  measured PROFILE-ID-GAP governs: no "read my profile" surface exists,
  so the PK rides the onboarding redirect (`/provider?profile={id}` →
  the dashboard card → this page's `?id=`); the PUT's measured
  semantics mirrored (empty agencyName/licenseNumber CLEAR them, the
  actor select always sends); the PROVIDER-role trust chain stated on
  the page (onboarding grants no authority — the admin role PUT is the
  elevator; its 403 words surface verbatim, measured 2026-09-29)
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
  booking" read exists) on FIRST resolution and rides the PURE read
  (`GET /payments/intents/{id}`, slice S3) whenever the id is already
  in hand (`?intent=` — the process/cancel redirects land there; no
  create side-effect re-runs) and renders amountCents (the booking's only
  readable total) with the honest PROCESSING/no-Stripe state; the J4
  manual-settlement note (charter §7.2, owner decision 2026-09-29,
  `manual-settlement-note.tsx`) rides the no-channel state while the
  intent is payment-pending (MANUAL_SETTLEMENT_OPEN = CREATED/
  PROCESSING): settle outside, share the reference through «محادثة هذا
  الحجز», the administration records it, the backend closes the loop —
  pure display, zero new endpoints; the
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
- `/robots.txt` + `/sitemap.xml` — the launch-readiness SEO file
  conventions (slice S5, `src/app/robots.ts` / `src/app/sitemap.ts`,
  build-time static per the packaged docs' file-conventions guide): the
  crawl policy keeps every private surface (`/admin`, `/api/`,
  `/provider`, `/profile`, `/inbox`, `/bookings`, `/neighborhood`) out
  of crawl budgets while the ONE-CHARACTER prefix trap is navigated —
  `Disallow: /neighborhood` (private community) prefix-matches
  `/neighborhoods` (PUBLIC geo picker) under the Robots Exclusion
  Standard, so the longer `Allow: /neighborhoods` rule carries the
  standard's longest-prefix-wins resolution; `/search` is deliberately
  NEVER disallowed (a robots-blocked page's noindex meta can never be
  seen). The sitemap lists ONLY the four stable public hubs (`/`,
  `/listings`, `/neighborhoods`, `/register` — the origin rides
  BETTER_AUTH_URL, one env fact with metadataBase); detail pages are
  discovered through crawlable pagination, not enumerated (no public
  all-ids read exists — the honest omissions documented in the file)
- `/api/health` — the uptime probe (slice S5 "مراقبة"): pure frontend
  liveness — 200 `{"status":"ok"}`, no session, `no-store`; deliberately
  NO backend health fan-out (the backend's health is its own domain —
  its service monitors own it; a probe that fails on a dependency
  cannot tell "web down" from "backend down")

## Rules

- Never commit secrets: `.env*` is gitignored; `.env.example` holds placeholders only; real dev values live in local `.env.local`; production values live only in Railway service variables.
- Display-data layer (`DEMO_LISTINGS`, the seed-content decision 2026-09-29):
  unset or any value other than `0|false` keeps the بيانات عرض showcase ON
  (the owner's directive is the default — production ships with it without
  a Railway console change); `DEMO_LISTINGS=0` kills it permanently. The
  layer ALSO retires by itself when real ACTIVE listings reach the
  storefront floor (4). See the `/listings` route entry for the full
  engagement discipline.
- Dev backend (since 2026-09-22): the backend team's shared **staging** service
  https://app-java-v3-staging-staging.up.railway.app (their runbook:
  `docs/frontend-dev-oauth-setup.md` @ `ccf599a` in app-java-v3 — never a
  local backend checkout, never production). Local `.env.local` points
  `BACKEND_URL` there with the dev client **`marketplace-bff`** (the LIVE
  confidential row — measured 2026-09-29 during S2's live round: authorize
  with the ORPHAN `marketplace-web-staging` row issues a code but the token
  exchange answers 401 `invalid_client`, exactly the runbook's battery-33
  BE-07 finding; the row name in older docs here predates that measurement).
  The shareable staging secret is dev-only, never in production; the
  production secret never leaves Railway. The OAuth chain is measured live
  to the backend login page; completing a login additionally needs a backend
  account's credentials (self-register via `/register`, the runbook §5
  pattern — the staging secret itself is an owner input per the runbook).
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
