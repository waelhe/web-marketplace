# Frontend Architecture Map — web-marketplace (the complete measured map)

> **Bilingual contract / العقد الثنائي:** the technical skeleton is English
> (matching the code it maps); every section carries an Arabic side-note
> («لماذا يهم فريق الباك اند») so the backend team can read the contract
> alignment points without a translation layer.
>
> **Measured, not assumed / مقيس لا مفترض:** every number here was measured
> directly — on the live production & staging deployments, the Railway
> deployment records, the live OpenAPI (`/v3/api-docs`, 128 ops), and the
> source tree at `main @ 5972dbd`. Measurement date: **2026-09-28**.
> Backend reference: **app-java-v3 @ 1710501** (Flyway V70, 22 modules).
> Delta 2026-09-29 (S2, local merge 1ae100d): `GET /listings/categories`
> and `POST /auth/register` (S1) left the gap table — consumption
> 115/128 ops; gate counts refreshed below.
> Delta 2026-09-29 (S3, PR #13): the J5 provider money/profile ops
> consumed — 120/128. Delta 2026-09-29 (S4, PR #14): the two
> category path ops consumed (`GET /listings/category/{c}` on the
> browse category-only state, `GET /search/category/{c}` on the flat
> /search category mode) — **122/128 ops (96%), 102/111 paths, ZERO
> genuine surface gaps**; gate counts refreshed below.
> Delta 2026-09-29 (S5, local merge): the launch-readiness layer — the
> web origin's own `robots.txt` + `sitemap.xml` file conventions (the
> crawl policy with the /neighborhood prefix trap navigated; the
> public-hub sitemap), the `/api/health` uptime probe, and the /search
> `noindex, follow` decision (duplicate-content: its category state
> mirrors `/listings?category=` byte-identically). No backend ops
> consumed (the backend's own robots/sitemap ops serve the BACKEND
> origin — classified infra, unchanged).
> This file pairs with `docs/ARCHITECTURE.md` (the deep Arabic narrative);
> it does not replace it. The **product definition** it serves lives in
> `docs/product-charter.md` (the journeys, their acceptance, the slice plan).

---

## 1. System context (C4 level 1)

```
┌─────────────┐         https          ┌──────────────────────────┐        https         ┌─────────────────────┐
│   Browser    │ ─────────────────────▶ │  web-marketplace (BFF)   │ ───────────────────▶ │  app-java-v3 (API)  │
│  Arabic RTL  │ ◀───────────────────── │  Next.js 16.3.5 server   │ ◀─────────────────── │  Spring Boot 4.1.1  │
│  no tokens   │   HTML + session cookie│  Railway: web-marketplace │   Bearer + JSON      │  Railway: prod +    │
└─────────────┘                        │  RAILPACK · Node 26.8.2  │  problem+json        │  staging services   │
                                       └──────────────────────────┘                      └─────────────────────┘
```

- **The frontend is a full BFF, not a page layer.** The Next.js server
  itself holds the OAuth2 client secret and runs the authorization-code +
  PKCE flow. Access/refresh tokens never leave the server; the browser
  sees exactly one credential: the encrypted session cookie.
- **One runtime, four runtime dependencies** (measured `package.json`):
  `next@16.3.5`, `react@19.3`, `react-dom@19.3`, `better-auth@1.7.5` —
  plus 9 dev dependencies. No CSS framework: logical CSS properties +
  the Cairo variable font (a founding decision in `README.md`).
- **Scale:** 91 TS/TSX files, 17,031 lines in `src/` · 16 pages · 3 route
  handlers · 9 server-action modules · 29 files in the `lib/api` layer.

> **لماذا يهم فريق الباك اند:** الواجهة ليست مستهلكًا ثقيل الاعتماديات
> يكسر مع كل تحديث — أربع حزم تشغيل فقط، وكل ما يربطنا بكم هو العقد
> (OpenAPI) وسرّ العميل. تحريك العقد هو القرار المعماري الوحيد الذي
> يمسّنا.

## 2. The four data channels (the core discipline)

| # | Channel | Entry point | Auth | Used by |
|---|---|---|---|---|
| 1 | **Authenticated RSC** | `src/lib/api/server.ts` (`backendGet`/`backendSend`) | Bearer from the signed account cookie, auto-refresh | sessions, inbox, bookings, provider tools, admin console |
| 2 | **Public RSC** | `src/lib/api/public.ts` (`publicGet`/`backendSendPublic`) | none (anonymous GET measured 200 on prod) | listings browse, listing detail, provider public page, reviews, search, geo |
| 3 | **Browser relay** | `src/app/api/backend/[...path]/route.ts` + `src/lib/api/client.ts` | session cookie → Bearer relayed server-side per request | client-side data that must live in the browser; 401 → `{"error":"unauthenticated","reauth":true}` exactly |
| 4 | **Auth handler** | `src/app/api/auth/[...all]/route.ts` | the OAuth dance itself | sign-in/out, callback `/api/auth/callback/marketplace-web` |

Every channel returns failures **as data, never as thrown exceptions** —
the honest-failure pattern: the backend's `application/problem+json`
words are surfaced verbatim (RFC 7807/9457, the backend's own contract),
never rewritten into friendlier lies.

> **لماذا يهم فريق الباك اند:** قناة 2 هي ما تراه محركات البحث، وقناة 1
> هي كل ما يتطلب جلسة. أي سلوك تريدونه «للزائر فقط» أو «للمسجّل فقط»
> يُقاس عبر هاتين القناتين قبل اعتماده — لا تخمين في الواجهة.

## 3. The OAuth2 + PKCE chain (measured live, 2026-09-28)

The full sequence was executed end-to-end on production with a freshly
registered account (task 43 of our worklog; screenshot on file):

1. Anonymous visit to a session-gated page (`/inbox`) → the honest
   sign-in gate renders (never a probe that would 401).
2. Sign-in button → backend `GET /login` (Spring login form, session +
   CSRF cookie issued).
3. Credentials POST → 302 → `GET /oauth2/authorize?response_type=code&client_id=…&scope=openid+profile&code_challenge_method=S256&code_challenge=…&redirect_uri=…/api/auth/callback/marketplace-web&nonce=…`.
   **PKCE S256 mandatory** (`requireProofKey=true` measured in the
   backend's `OAuth2ClientSecretInitializer`).
4. Consent page (backend `requireAuthorizationConsent=true`) → profile
   scope approved → 302 with the authorization code.
5. Callback hits the Next.js server → **the code+verifier exchange
   happens server-side** → tokens stored in the signed account cookie
   (`useAccountCookie: true` — the documented DB-less path of
   better-auth 1.7.5). The browser never sees a token.
6. Any later RSC render resolves its Bearer via
   `auth.api.getAccessToken({useAccountCookie:true})` with silent
   refresh (backend TTLs: access 900s / refresh 7d).

**client_id is an environment fact, not a code constant** (measured
flipping twice on staging: `marketplace-bff` → `marketplace-web-staging`).
Production runs `marketplace-bff` with both redirect URIs registered
(local dev + the deployed callback). `OAUTH_CLIENT_SECRET` lives only in
Railway variables and rotates — the frontend treats `invalid_client`
storms as a rotation signal, never a code bug.

> **لماذا يهم فريق الباك اند:** هذه السلسلة هي الجسر الوحيد بين
> المستودعين. أي تغيير في `requireProofKey`/`requireAuthorizationConsent`/
> أعمار الرموز/أسماء العملاء يظهر عندنا فورًا كعطل تدفق كامل —
> نرجو إبقاءه في بروتوكول الإشعار المتبادل.

## 4. Route map (16 pages · 5 handlers · 9 action modules)

| Route | State | What it renders (backend source) |
|---|---|---|
| `/` | public, session-aware | landing + state of entry points + the بيانات عرض strips below the storefront floor |
| `/search` | public, noindex+follow | flat text search + category rail (S4; S5 SEO decision: result pages stay out of the index) |
| `/listings` | public | paged active listings (`GET /listings`) + the بيانات عرض showcase below the storefront floor (unfiltered first page only, labeled, zero links, self-retiring) |
| `/listings/{id}` | public | detail + L31 property embed + L39 JSON-LD + lead form |
| `/listings/{id}/book` | session | booking start (availability-driven) |
| `/neighborhoods` | public | geo tree navigation (`/geo/{id}/children`, `/geo/suggest`) |
| `/neighborhood` | session | my neighborhood feed (posts + join/leave) |
| `/inbox` | session | notifications feed (paged, plan-2.6) + unread badge + L22 preferences matrix + L34 leads |
| `/inbox/conversations/{id}` | participant | message thread (L44 direct / booking) |
| `/bookings`, `/bookings/{id}` | session | my bookings + state machine actions |
| `/profile` | session | identity + data export download |
| `/providers/{id}` | public | provider public page + reviews |
| `/provider` + `/provider/bookings` + `/provider/listings/*` + pricing | provider | the provider power tools |
| `/admin` | admin | the 24-op administration console |

Route handlers: `api/auth/[...all]` (channel 4), `api/backend/[...path]`
(channel 3), `api/account/export` (GDPR Art. 20 download — streams the
backend's own export JSON verbatim, no recomposition), plus the S5
launch artifacts: `robots.txt` + `sitemap.xml` (build-time static file
conventions — the crawl policy and the 4 public hubs) and
`api/health` (the uptime probe: 200 `{"status":"ok"}`, no-store, no
backend fan-out).

> **The display-data layer (بيانات عرض, 2026-09-29 — the seed-content
> decision):** `src/lib/demo-listings.ts` + `src/components/ui/
> demo-card.tsx`. A pure FRONTEND showcase (no backend rows, no fake
> contract reads): 8 labeled stay rows that render on the unfiltered
> storefront (`/` strips + `/listings` first page) when the backend's own
> 200 read serves fewer real ACTIVE listings than the floor (4). The
> engagement discipline: success-path only (never masks an outage),
> never on filtered/sorted/searched surfaces (real data only — the
> user's trust), every card badged + linkless (demo ids are not UUIDs;
> the detail read would 404), self-retiring at the floor, one env
> off-switch (`DEMO_LISTINGS=0`).

> **لماذا يهم فريق الباك اند:** كل صفحة مرتبطة بوحدة باك اند مسماة —
> انظر الجدول التالي للمقابلة العكسية (أي وحدة تُعرض وأيها ما زالت
> خلف الكواليس).

## 5. API surface — the consumption matrix (measured against the live 128)

**97 distinct endpoint templates** across `lib/api` + raw-fetch call
sites. **0 dead templates** — every frontend call has a live backend
contract. Consumption: **122/128 ops (96%)** — the 6 unconsumed ops
(all on unconsumed paths) are classified below: not-frontend infra, one
measured backend defect, one documented deliberate cut. Zero genuine
surface gaps after S4.

| lib/api channel | Consumes (backend module) |
|---|---|
| `public.ts` | catalog listings browse/detail/provider-list, search, the two category path ops (S4: browse-by-category + search-by-category) |
| `reputation.ts` | providers public page, reviews (+reply, reverse) |
| `geo.ts` | geo children/suggest (tree navigation) |
| `booking.ts` | bookings CRUD chain + payments intents (resolve + the pure GET) + availability |
| `inbox.ts` | notifications (paged + unread-count), preferences, leads, conversations/messages |
| `community.ts` | posts, comments, reports, neighborhood membership |
| `saved-searches.ts` | saved searches CRUD |
| `provider.ts` | provider listings lifecycle + stats + views + the L20 ledger reads (balance, statement) + profile read/update (the J5 edit) |
| `pricing.ts` | availability calendar + seasonal rates + weekend rule |
| `disputes.ts` | booking disputes read/open |
| `media.ts` | upload flow (S3-gated, honest 503) |
| `admin.ts` | the 24-op console (users, listings, ledger, payments, geo, revisions, reports, pricing rules) |

**The 6 unconsumed ops (6 paths), classified:**

| Class | Paths | Meaning |
|---|---|---|
| Correctly not frontend (4) | `webhooks/stripe`, `webhooks/{provider}`, `/robots.txt`, `/sitemap.xml` | server-to-server / infra files |
| Broken backend surface (1) | `GET /geo/tree` | 409 CONFLICT-001 ×3 measured — declared defect, not avoided by accident |
| Deliberate cut (1) | `GET /pricing/convert` | auth-gated by design (doc'd decision) |
| **Genuine surface gaps (0)** | — | CLOSED by S4 (2026-09-29): `GET /listings/category/{c}` rides the /listings category-ONLY state (no other criterion, no sort — the ops answer 500 INT-001 on sort, measured traceIds 0d7295c8/e1a7b064), `GET /search/category/{c}` rides the flat /search category mode; the register was closed by S1 (PR #4), the categories read by S2 (PR #12), and the J5 provider money/profile ops by S3 (PR #13) |

> **لماذا يهم فريق الباك اند:** فجوتا بحث الفئة (مسارا التصفّح والبحث)
> أُغلقتا بـS4 (2026-09-29) بعد ثلاث هذا الأسبوع: التسجيل
> العام (S1، مُتحقَّق حيًّا عبر API في 2026-09-28)، ثم التصنيفات ثنائية
> اللغة (S2، PR #12)، ثم دفتر المزوّد وقراءة نية الدفع وتحرير ملف
> المزوّد (S3، 2026-09-29 — مع قياسين مسجّلين للفريق: **LEDGER-403
> مُصلح** ورُصد حيّاً على الستاجينغ، وبوابة دور PROVIDER على تحرير
> الملف — التأهيل لا يمنح الدور ورفعه إداريّ فقط؛ وقراءة «ملفي»
> (PROFILE-ID-GAP) ما زالت مسجّلة والواجهة تعمل بمسار `?profile=`
> المؤقت من التأهيل).

## 6. Quality gates (what runs before any push)

```
eslint ─▶ tsc --noEmit (after build typegen) ─▶ vitest (43/43, 8 files)
      ─▶ next build (RAILPACK parity: Node 26.8.2) ─▶ playwright smoke 21 + 2 skipped-by-design
          + opt-in live rounds (REGISTER_LIVE=1, CATEGORIES_LIVE=1)
      ─▶ live browser pass (agent-browser; hermetic net needs no secrets,
          the signed-in pass needs an env with the staging secret + the
          one-time consent round for fresh accounts)
```

The smoke net is **hermetic by contract**: structure + 401 shapes +
noindex + 375px RTL overflow — zero data dependence, green at N=0..N
rows, `retries: 0` (flakes must fail loudly).

> **لماذا يهم فريق الباك اند:** هذه البوابات هي سبب قدرتنا على
> استقبال موجات مثل تحديث 2026-09-27 (تسع عمليات دمج) وإصلاح أثرها
> خلال جلسة واحدة: عقد pagination المكسور أُمسك بواسطة tsc + vitest
> قبل أن يصل الإنتاج (PR #1 — الحالة المرجعية لبروتوكول تغيير العقد).

## 7. Deployment & environments (Railway, measured)

| Environment | Service | URL | Backend it points at |
|---|---|---|---|
| production | `web-marketplace` (RAILPACK, auto-deploy from main) | `web-marketplace-production-5cc1.up.railway.app` | `app-java-v3-production.up.railway.app` |
| local dev | `next dev` :3000 | — | staging backend (shared, never a local checkout) |

Env facts live only in Railway variables (`BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, `BACKEND_URL`, `OAUTH_CLIENT_ID/SECRET`) — zero
secrets in the repo. Deployments are verified by **commitHash match**
in the Railway deployment record (the auto-deploy of `5972dbd` was
confirmed exactly this way) — chunk fingerprints are a build artifact,
not a deploy proof (a lesson measured the hard way).

> **لماذا يهم فريق الباك اند:** النشر التلقائي من main يعني أن أي دمج
> للواجهة يصل الإنتاج خلال دقائق — توقيت دمج PR للواجهة يقرر توقيت
> الظهور الحي، تمامًا كما عندكم.

## 8. Contract-change protocol (how the frontend meets a backend move)

The canonical case, measured across 2026-09-27→28:

1. Backend merges plan 2.6 (#403): `GET /notifications` moves to the
   shared paged envelope + a new unread-count endpoint.
2. The old frontend still consumed the 2026-09-22 "full list" array —
   `.filter()` on the envelope object = TypeError = **/inbox 500s for
   every signed-in visitor**.
3. The drift was caught by re-measuring the live OpenAPI (125→128 ops),
   the fix rode the leads-section's own paged discipline (PR #1:
   `?feedPage=` pager + the backend's own badge number), all gates ran,
   and the merged fix was live-verified with a signed-in browser pass.

The standing rules: **re-measure the live OpenAPI after every backend
wave; consume envelopes the way sibling surfaces already do; the badge
number is the backend's, never a client-side recount.**

> **لماذا يهم فريق الباك اند:** هذا القسم هو الاتفاق التشغيلي: عند
> تحريك عقد، نحن نعيد القياس في نفس اليوم ونفتح PR خلال الجلسة —
> نرجو إبقاء `/v3/api-docs` متاحًا مجهولًا كما هو (128 عملية مقيسة
> عبره من البيئتين).

---

### Measurement appendix (all figures + dates)

| Figure | Value | Measured |
|---|---|---|
| Frontend HEAD | `5972dbd` (main) | 2026-09-28 |
| Backend HEAD | `1710501` (main) | 2026-09-28 |
| Live OpenAPI | 128 ops / 111 paths — staging AND prod identical | 2026-09-28 |
| FE consumption | 97 templates · 0 dead · 122/128 ops (96%) · 6 unconsumed classified (infra / GEO-TREE-409 / deliberate cut) | 2026-09-29 |
| Source scale | 92 files / ~17.7k lines / 17 pages / 9 action modules | 2026-09-29 |
| Tests | 43 unit (vitest) + 23 e2e (playwright, hermetic + opt-in live) | 2026-09-29 |
| OAuth chain | PKCE S256 + consent, executed live on prod | 2026-09-28 |
| Deploy proof | Railway commitHash `5972dbd…` + signed-in browser pass | 2026-09-28 |
| Known backend defects on our radar | `GET /geo/tree` 409 ×3 | latest 2026-09-28 |
