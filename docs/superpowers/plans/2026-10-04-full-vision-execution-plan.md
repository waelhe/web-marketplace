# The Full-Vision Execution Plan — «السوق» end-to-end (2026-10-04)

> **Status:** the executive plan for the owner's 2026-10-04 directive («اريدك ان
> تعيد تصور تصميم المنصة وتجربة المستخدم ui/ux الكاملة end to end… واريدك
> ان تصمم خطة تنفيذية متكاملة لتجهز كل مايحتاجه مطور تطبيق الجوال»).
> **Companion spec (product definition, owner-facing Arabic):**
> [`docs/superpowers/specs/2026-10-04-full-vision-platform-design.md`](../specs/2026-10-04-full-vision-platform-design.md).
> **Governing method:** `docs/agent-protocol.md` §4/§5 — one slice = one branch =
> green gates = one PR = local merge; push only on the owner's explicit word.
> **Measured baseline (2026-10-04):** production OpenAPI **157 paths / 189 ops**
> (`app-java-v3-production-59bf.up.railway.app`), frontend healthy
> (`web-marketplace-production-f9d3.up.railway.app`, 200). Waves N1–N13 signed
> in production; backend main `193ff24` (L52 polls + W5 ads & billing merged).

---

## 0. The plan's spine — the mobile developer is the exit criterion

Every wave below ships **public, versioned, measured API contracts** first
(backend L-slice), then the web surface (frontend N-slice). The mobile app is a
first-class consumer of the same contracts the web BFF consumes — never a
parallel API. A wave is "mobile-ready" when:

1. Its contract is live on production OpenAPI (paths/ops counted, date stamped).
2. Its failure shapes are measured (RFC 7807 `problem+json`, traceId present).
3. Its auth surface follows the session standard (§2 — no expiry without logout).
4. Its docs row lands in `docs/mobile-app-integration.md` (the handoff contract,
   to be re-founded on the chosen official session path in S1 — the copy on the
   closed branch `feat/mobile-refresh-grant` carries the rejected refresh design
   and is NOT merged).

## 1. Measured ground truth this plan builds on (2026-10-04)

| Fact | Measurement |
|---|---|
| Production OpenAPI | 157 paths / 189 ops |
| Neighborhood core served | feed/comments, DMs, notifications+prefs, moderation, membership+verification (V78), reactions (L47), post media (L48), events+RSVP (L49/V83), market board (L50/V90), groups (L51/V91), polls (L52/V100) |
| Yelp plan complete | W1–W5 served: dual reviews, business page, follow, favorites, ranking, ads & billing (V103–V105, `#496`) |
| Real estate core served | 60+ ops: listings/search/radius/property details/pricing rules/bookings/media/reviews |
| Services core served | providers, availability slots, rule-based pricing, bookings, ledger |
| Admin console served | 24 ops + nine doors (verification, moderation, catalog, finance, audit, users, bookings, listings, ads) |
| Mobile session standard | **OPEN, owner-gated (PR #498 verdict, 2026-10-03):** the 90-day rotating-refresh attempt for the public client was closed UNMERGED — measured against the framework's own sources (SAS 7.1.1): `OAuth2RefreshTokenGenerator` returns `null` for public clients and `PublicClientAuthenticationConverter` only matches PKCE code requests, so the grant registration opens no path. Production runs the official strict pattern: `marketplace-mobile` = public, PKCE, `authorization_code` only, **900s access TTL, no refresh** (main `193ff24` + converge-on-boot). Two official paths forward, owner decision pending: confidential client (bff pattern — refresh works today) or periodic re-auth (RFC 9700) |
| Web session gap (measured) | `marketplace-bff`: `reuseRefreshTokens(true)` + **absolute 7-day RT TTL** (`OAuth2ClientSecretInitializer.buildTokenSettings`) — the web session dies inside a week without logout, violating the owner's standing rule |
| Remaining neighborhood gaps | #8 business recommendations, #9 structured lost&found, #10 zone-scoped safety alerts, #11 conversations list, #12 public member profile, #13 adjacent-neighborhood scope, #14 WS push, #15 activity badge (docs/nextdoor-gap-analysis.md §3) |
| Not started as columns | commerce marketplace (Amazon-grade), Redfin layer (estimates/insights), service packages (Wyzant-grade), place/institution graph (universities/colleges/schools/mosques), cross-section context cards, escrow/mediation, first-party sales, business solutions |

## 2. Phase S — the session standard + the mobile door (FIRST — it de-risks everything)

**Owner's binding rule:** «وبالنسبة لتخزين الجلسات، فأريدها حسب الاجراء العالمي.
وأن لاتنتهي الجلسة بدون تسجيل الخروج كما في التطبيقات والممارسات العالمية».

| Wave | Slice | Scope | Acceptance (DoD — E2E live proof) |
|---|---|---|---|
| **S1** | backend L53 | **The mobile session path — decision-gated by the owner (PR #498 verdict, 2026-10-03):** merging `feat/mobile-refresh-grant` is OFF the table (framework-refused for public clients). The owner picks one official path: (a) **confidential client** for the trusted app (bff pattern — the refresh grant works natively; 90-day sliding TTL + rotation apply exactly as S2 does for web), or (b) **periodic re-auth** (RFC 9700 native pattern — 900s access token + fresh authorization through the AS session, already the running shape on main). Either way: close the backend PR chain (`#500` truth-sync first) + re-found `docs/mobile-app-integration.md` on the chosen pattern. | Chosen path measured live: (a) refresh→new RT→old RT dead (`invalid_grant`), 90-day window re-arms on use; or (b) token exchange + re-authorization round through the AS session with the 900s TTL verified; handoff doc §2 verified live on the chosen pattern |
| **S2** | backend L54 + frontend N14 | **The web BFF sliding session**: raise `marketplace-bff` RT to a 90-day **sliding** window. The measured constraint (RSC renders drop the re-signed Set-Cookie, 2026-09-30) is solved inside the framework's official patterns (candidate designs to be validated against the version-matched bundled docs during the wave — e.g. rotation-safe refresh executed only in cookie-writable contexts: route handler / server action / middleware, with RSC reads side-effect-free). | A web session survives 7+ days of continuous use with ZERO "session expired" banners (measured on production with a dated log); explicit logout / revocation / account-status change are the ONLY session enders (account-status invalidation already integration-tested) |
| **S3** | backend L55 + frontend N15 | **Device & session manager**: `GET /me/sessions` (device, last-seen, ip-derived label), `DELETE /me/sessions/{id}`, global sign-out; surfaced in the advanced profile (§4 of the spec). | Listing + revoke one device measured live; revoked device's next call answers 401/302; surviving sessions untouched |
| **S4** | backend L56 | **Mobile push channel**: FCM/APNs device token registration (`POST /me/devices`, delete), notification fan-out reusing the existing notification types + the WS preference column already in the matrix | Token register/list/delete round live; a reply on the member's content delivers a push to the registered device (staging of the push service per backend team runbook) |

**Exit**: the mobile developer logs in once and stays logged in until explicit
logout — on both native and web — and receives pushes. The handoff doc grows a
§push + §sessions-verified.

## 3. Phase 0 — close the neighborhood core (the trust fabric, small measured slices)

| Wave | Slice | Scope | DoD |
|---|---|---|---|
| **C1** | backend L57 + frontend N16 | Gap #11 conversations list: `GET /messages/conversations` (paged, last-message preview, unread count) + the inbox surface | Real conversation list rendered from the contract; unread badge true; e2e green |
| **C2** | backend L58 + frontend N17 | Gap #12 public member profile: `GET /users/{id}` (public subset: display name, badges, neighborhood, joined-at, reputation summary) + the neighbor card on feed/business/review surfaces | Clicking a neighbor opens the public profile; private fields absent (measured); no PII leakage beyond the public subset |
| **C3** | backend L59 + frontend N18 | Gap #8 business recommendations: write-side recommendation (text + verdict, no booking required) on business pages; aggregate into the business card | Recommendation round live; business card carries count+latest; moderation path reuses reports |
| **C4** | backend L60 + frontend N19 | Gap #9 structured lost&found + #10 zone-scoped safety alerts: typed posts with structured fields (status/location/date; zone taxonomy) — reuses the post media + report machinery | Structured form saves typed fields; the feed renders structured cards; zone filter works on the safety map |
| **C5** | backend L61 | Gap #13 adjacent scope (`scope=adjacent` on the feed read) + #14 WS live push (server side) + #15 activity badge counters | Adjacent feed measured; WS delivers one live event to a connected browser; badge counters true |

## 4. Phase G — the place & institution graph (the vision's skeleton)

| Wave | Slice | Scope | DoD |
|---|---|---|---|
| **G1** | backend L62 + frontend N20 | **Membership kind** `RESIDENT`/`EXPAT` (migration + join flow + badge on membership card); expat joins the home حارة | Kind shown on the member's card; expat flow measured; verification paths unchanged |
| **G2** | backend L63 | **Institution graph**: `Institution` entity (kind: UNIVERSITY/COLLEGE/SCHOOL/INSTITUTE/MOSQUE) attached to the geo tree; college communities reuse the neighborhood module pattern (membership, feed, groups, events, polls — `scope_type` generalization) | A university + colleges seeded; college community board works with the same L41–L52 gates; membership verification reuses V78 lifecycle with an institution document kind |
| **G3** | backend L64 + frontend N21 | **Private sections in the حي**: mosque/school/institute sections with rosters + member-only boards (noindex), section moderation role | Section visible only to members (measured 403 for non-members); roster join request + approval flow live |
| **G4** | backend L65 + frontend N22 | **Geo completeness tooling**: admin-managed city/حي tree operations + national seed dataset (owner input: scope of first coverage) | Admin graph door creates/edits places; picker shows the seeded cities; the feed/boards work in any seeded حي |
| **G5** | frontend N23 | The neighborhood shell extensions: sections rail (mosques/schools/institutes), universities picker, member-kind badge — on the S10 owner shell, zero new skin | Navigation measured to every new surface; 390px zero-overflow evidence (the standing N-series proof) |

## 5. Phase P — the advanced profile (spec §4)

| Wave | Slice | Scope | DoD |
|---|---|---|---|
| **P1** | backend L66 + frontend N24 | Reputation composition read: `GET /users/{id}/reputation-summary` (thanks, reviews in/out, marketplace rating, business recs, badge level) + the four-floor profile surface | The profile renders all floors from one composed read; privacy toggles per floor enforced server-side (measured) |
| **P2** | frontend N25 | Profile editing extension: avatar upload (media channel), bio, privacy matrix | Upload through the signed channel; privacy change reflected immediately for a second viewer account |

## 6. Phase V — the four economic columns (spec §5)

### 6.1 The commerce marketplace (Amazon-grade) — the M-series (largest)

| Wave | Slice | Scope | DoD |
|---|---|---|---|
| **M1** | backend L67 | **Product catalog**: `Product` (vendor = business page / provider), variants, media via the existing channel, category vocabulary (owner gate) | CRUD round live; media presigned round; category gate honored |
| **M2** | backend L68 + frontend N26 | **Storefront + product page**: vendor storefront on the business page, product detail with Q&A, vendor rating summary | Surfaces render from contracts; Q&A round live; store reachable from directory + neighborhood market |
| **M3** | backend L69 + frontend N27 | **Cart + multi-vendor checkout → Order**: cart per vendor, order lifecycle (PREPARING/SHIPPED/DELIVERED/RECEIVED), honest state transitions | Order placed without payment provider (manual settlement path per the standing Stripe decision); states advance by the right party only (measured 403s) |
| **M4** | backend L70 + frontend N28 | **Fulfillment + disputes + vendor ledger**: shipment records, dispute flow generalized from bookings disputes, vendor payout rows in the existing ledger | Dispute → resolution → ledger rows immutable; vendor dashboard shows order queues + settlements |
| **M5** | frontend N29 | **Buyer surfaces**: orders page, seller ratings prompt post-delivery, returns request | Rating only after RECEIVED (measured gate); e2e green |
| **M6** | backend L71 + frontend N30 | **First-party sales**: platform-owned products in the same cart with the «من المنصة» badge | First-party product purchasable; revenue rows distinct from vendor sales |

### 6.2 Real estate — the Redfin layer (E-series, over the served core)

| Wave | Slice | Scope | DoD |
|---|---|---|---|
| **E1** | backend L72 | **Neighborhood insights aggregates**: price bands, days-on-market, demand activity per حي (materialized, dated) | Insight read live for seeded hoods; numbers carry computation dates |
| **E2** | backend L73 + frontend N31 | **Property estimate**: model from platform data (recorded deals, property block, neighborhood band) with confidence interval; shown on the property page | Estimate renders with «تقدير» framing + method note; recalculates on new deals (dated) |
| **E3** | frontend N32 | **Property context card** (spec §5.6): composed read `GET /properties/{id}/context` — nearby businesses+ratings (radius search), neighborhood pulse, safety, institutions, market trends — ONE composed read, not ten client calls | Context card renders from the single contract; each block honest-empty when no data |
| **E4** | backend L74 + frontend N33 | **Open-house events** (events module at real-estate scale: capacity, RSVP list visible to host) + agent bridge (business page of the agent) | Open house RSVP round live; agent page carries active listings |
| **E5** | frontend N34 | Mortgage calculator (pure front-end tool) + sale-journey filters (price-per-area, price-reduced flags) | Filters ride existing search criteria; calculator static-testable |

### 6.3 Services — the Wyzant layer (T-series)

| Wave | Slice | Scope | DoD |
|---|---|---|---|
| **T1** | backend L75 + frontend N35 | **Quote-request mode** surfaced beside instant-book (leads already served — UX pairing) | Both modes explicit on the service card; lead → quote → accept → booking chain live |
| **T2** | backend L76 + frontend N36 | **Service packages** (N-session bundles, progress per session, lesson material fields) | Package purchase books N slots; progress visible to buyer; ledger rows per session |
| **T3** | backend L77 | **Background-check badge** for home-service providers (verification lifecycle reused, distinct document kind) | Badge appears after admin approval; surface gate honored |
| **T4** | frontend N37 | Tutoring/home-services category taxonomy surfaces (subject picker, grade levels) | Picker fed by the registry (S2 pattern — live vocabulary, no hard lists) |

### 6.4 Business directory deepening (D-series, over W1–W5)

| Wave | Slice | Scope | DoD |
|---|---|---|---|
| **D1** | backend L78 + frontend N38 | Advanced business profile floors: hours + open-now, services & price list, Q&A, media gallery | Hours drive open-now (measured against a known window); price list renders |
| **D2** | backend L79 + frontend N39 | **Owner performance dashboard** (reach, interactions, campaign W5 metrics, booking funnel) — the seed of business solutions | Dashboard reads only its own business (measured gate); numbers from immutable aggregates |
| **D3** | backend L80 | **Claim flow**: a member claims an unclaimed business (evidence → admin approval — verification machinery reused) | Claim → review → transfer measured; audit rows written |

## 7. Phase K — the cross-section knowledge layer (spec §5.6, generalized)

| Wave | Slice | Scope | DoD |
|---|---|---|---|
| **K1** | backend L81 | **Context composition service**: the generic assembler behind context cards (entity → radius businesses, feed pulse, safety, institutions, trends) with per-block degradation | One contract serves property/business/service contexts; blocks degrade honestly (empty ≠ error) |
| **K2** | backend L82 | **The knowledge directory**: curated area knowledge entries (sourced from community feed recs + editorials; moderation-gated) | Directory browsable per حي; entries feed context cards |
| **K3** | frontend N40 | Context surfaces on business + service pages (the property card shipped in E3) | Same composed contract consumed; zero client-side aggregation |

## 8. Phase R — revenue (spec §7)

| Wave | Slice | Scope | DoD |
|---|---|---|---|
| **R1** | backend L83 + frontend N41 | **Escrow & mediation — the percentage**: `EscrowEngagement` on bookings/orders/services — either party requests the platform as intermediary OR agent; funds state machine (HELD → RELEASED/REFUNDED) with timeout + dispute-resolution release; **fee = configurable percentage → immutable ledger rows** (AD_DEBIT pattern); owner gate: the number itself | Full escrow round live on a booking (request → hold → confirm receipt → release → fee row); mediation path through the existing dispute resolution; every money number traces to a ledger row |
| **R2** | backend L84 + frontend N42 | **Ads extensions**: placement inventory (feed/directory/search surfaces), neighborhood+interest targeting, advertiser performance views over W5 | Placement rotation measured; targeting honored; click ledger rows |
| **R3** | backend L85 | **First-party product/service billing**: paid valuation report, listing boost, expedited verification — platform-sold items on the same ledger | Purchase → entitlement live; entitlement gates the paid surface |
| **R4** | backend L86 | **Business solutions tier**: the D2 dashboard's paid tier (advanced analytics, presence boost, ad credits) with subscription-shaped billing windows | Tier gate enforced; billing window immutable |

## 9. Phase A — the admin console extensions (spec §5.7)

| Wave | Slice | Scope | DoD |
|---|---|---|---|
| **A1** | frontend N43 | The graph door: cities/حي/universities/colleges/sections management on the N2 shell | Create/edit measured; graph changes visible to pickers |
| **A2** | frontend N44 | The revenue door: ads/escrow/first-party dashboards over the ledger | Every displayed number traces to ledger rows (the honesty rule) |
| **A3** | backend L87 | Moderator role matrix (neighborhood/college/section scoped moderation) | A حي moderator sees only their queue (measured) |

## 10. The mobile developer's package (the plan's north star — assembled progressively)

Already in hand (measured on production, main `193ff24` + converge-on-boot):
the OAuth client card (`marketplace-mobile` — public, PKCE S256 mandatory,
`authorization_code` only, **900s access TTL, no refresh — the official
strict pattern**), login flow via Custom Tabs, API conventions (paged
envelope, RFC 7807, 302-as-session-gone), testing checklist, forbidden list,
and the handoff doc skeleton. **Not in hand:** the long-session story — the
90-day rotating refresh on the public client was proven framework-refused and
closed unmerged (PR #498, 2026-10-03); its handoff-doc copy (single-flight
refresh, rotation semantics) rode that branch and is NOT merged. The session
section is S1's owner-gated output (confidential client vs periodic re-auth).

The plan completes it with (wave → addition):

1. S1 → the chosen official session pattern (confidential-client refresh with
   the 90-day sliding window, or RFC 9700 periodic re-auth) implemented,
   deployed, and live-verified — the handoff doc re-founded on it.
2. S3 → session/device management endpoints for the app's settings screen.
3. S4 → **push notifications** (FCM/APNs registration + fan-out) — the biggest
   mobile gap today.
4. C2/P1 → public profile + reputation reads for the member screens.
5. G2/G3 → institution communities (universities/schools/mosques) as API-first
   contracts — the app renders them like neighborhoods.
6. M/E/T/D/K/R waves → commerce, Redfin, packages, business floors, context
   cards, escrow: every wave ships its OpenAPI rows + failure shapes BEFORE the
   web surface, so the mobile dev builds in parallel, never waits.
7. **Deep links**: the `com.marketplace.app:/oauth2/callback` scheme exists;
   each wave's routes get documented app-link paths (listing → product →
   business → context card).
8. **Contract stability**: `/v3/api-docs` is the single source (build DTOs from
   it; never invent endpoints — the standing forbidden rule); the backend's
   `ApiVersioningTest` + migration-checksum guards keep it additive.
9. **Environments**: production-only by owner decision (test accounts, cleanup
   discipline) — recorded, not relitigated here.
10. **Arabic-first i18n**: `messages_ar.properties` + RTL surface copy — the
    app is Arabic-first by design, English strings never required.

**Handoff exit test (the plan's final acceptance):** a mobile developer with
zero context builds login → browse → book/order → receive push → review against
production OpenAPI using only the handoff doc — every screen they can reach has
a documented contract, a measured failure shape, and a session that never ends
without their explicit logout.

## 11. Sequencing & dependencies (the order the agent will propose slices in)

```
S1 → S2 → S3 → S4        (the session standard + mobile door — FIRST)
→ C1..C5                  (neighborhood core completion — small, fast)
→ G1..G5 → P1..P2         (the graph + profile — the skeleton)
→ M1..M6                  (commerce — the biggest column)
→ E1..E5 ∥ T1..T4         (Redfin + Wyzant layers — parallelizable)
→ D1..D3 → K1..K3         (directory deepening + knowledge layer)
→ R1..R4 → A1..A3         (revenue + admin — closes the loop)
```

Rules: backend L-slice precedes its frontend N-slice (contract first); the
charter's §6 ledger registers each wave the moment it starts (definition before
building); the owner's explicit word moves anything to origin.

## 12. Owner-input register additions (charter §7 — recorded by this plan)

1. **Escrow/mediation percentage** — the number itself (R1's only blocker).
2. **Commerce category vocabulary** (M1's gate — the S2 pattern).
3. **Institution section rules** — who creates a mosque/school section and the
   approval bar for its moderator (G3).
4. **National coverage scope** — which cities/universities seed first (G4).
5. **Paid-tier shape** for valuation reports (E2/R3) and business solutions (R4).
6. **Push provider credentials** (FCM/APNs — S4's deploy-time input).
7. **Mobile session path** — confidential client for the trusted app vs
   periodic re-auth per RFC 9700 (S1's gate; both paths are the owner's own
   verdict alternatives in PR #498 — the framework closed the third option).

## 13. Self-review (the conceptual gate for this docs change)

- Every "served" claim above traces to a charter N-record or a measured commit
  (L47–L52, W1–W5, V78/V83/V90/V91/V100/V103–V105); every gap traces to the
  gap-analysis rows or the session measurements in §1.
- The plan reuses measured machinery everywhere (verification lifecycle, media
  channel, ledger pattern, disputes, events, leads) — no invented parallel
  systems; the institution graph is the one genuinely new data model and it is
  scoped as a generalization of the neighborhood module, not a second one.
- Session standard: the web gap is stated with its measured cause (7-day
  absolute RT) and its fix is scoped inside official framework docs (the S2
  candidate designs are flagged for in-wave validation against the bundled
  docs — not pre-decided here, per the epistemic order).
- Session standard (mobile, corrected 2026-10-04 against the PR #498 verdict):
  the earlier draft of this plan claimed the 90-day public-client refresh was
  "done, awaiting merge" — that claim was falsified by the owner's measured
  closure (2026-10-03): the framework's own sources (SAS 7.1.1 — same version
  as the platform) hard-block refresh issuance and refresh-grant
  authentication for public clients. Every affected section (§0, §1, §2-S1,
  §10, §12) now carries the verdict; S1 is re-scoped as the owner-gated
  choice between the two alternatives the verdict itself names.
- Nothing here pushes to origin; this document itself rides the §5 docs cycle
  (branch → conceptual review → local merge → the push ask).
