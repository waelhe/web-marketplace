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

## 4. Route map (16 pages · 3 handlers · 9 action modules)

| Route | State | What it renders (backend source) |
|---|---|---|
| `/` | public, session-aware | landing + state of entry points |
| `/listings` | public | paged active listings (`GET /listings`) |
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
backend's own export JSON verbatim, no recomposition).

> **لماذا يهم فريق الباك اند:** كل صفحة مرتبطة بوحدة باك اند مسماة —
> انظر الجدول التالي للمقابلة العكسية (أي وحدة تُعرض وأيها ما زالت
> خلف الكواليس).

## 5. API surface — the consumption matrix (measured against the live 128)

**97 distinct endpoint templates** across `lib/api` + raw-fetch call
sites. **0 dead templates** — every frontend call has a live backend
contract. Consumption: **96/111 paths = 113/128 ops (88%)**.

| lib/api channel | Consumes (backend module) |
|---|---|
| `public.ts` | catalog listings browse/detail/provider-list, search |
| `reputation.ts` | providers public page, reviews (+reply, reverse) |
| `geo.ts` | geo children/suggest (tree navigation) |
| `booking.ts` | bookings CRUD chain + payments intents + availability |
| `inbox.ts` | notifications (paged + unread-count), preferences, leads, conversations/messages |
| `community.ts` | posts, comments, reports, neighborhood membership |
| `saved-searches.ts` | saved searches CRUD |
| `provider.ts` | provider listings lifecycle + stats + views |
| `pricing.ts` | availability calendar + seasonal rates + weekend rule |
| `disputes.ts` | booking disputes read/open |
| `media.ts` | upload flow (S3-gated, honest 503) |
| `admin.ts` | the 24-op console (users, listings, ledger, payments, geo, revisions, reports, pricing rules) |

**The 14 unconsumed paths (15 ops), classified:**

| Class | Paths | Meaning |
|---|---|---|
| Correctly not frontend (4) | `webhooks/stripe`, `webhooks/{provider}`, `/robots.txt`, `/sitemap.xml` | server-to-server / infra files |
| Broken backend surface (1) | `GET /geo/tree` | 409 CONFLICT-001 ×3 measured — declared defect, not avoided by accident |
| Deliberate cut (1) | `GET /pricing/convert` | auth-gated by design (doc'd decision) |
| **Genuine surface gaps (8)** | `POST /auth/register`, `GET /listings/categories`, `GET /listings/category/{c}`, `GET /search/category/{c}`, `GET /payments/intents/{id}`, `GET /providers/me/ledger/balance`, `GET /providers/me/ledger/statement`, `GET/PUT /providers/{id}` | the next frontend batches |

> **لماذا يهم فريق الباك اند:** الثمانية الأخيرة هي طلبات الميزة
> القادمة من جهتنا بالترتيب الذي نقترحه: التسجيل العام (مُتحقَّق حيًّا
> عبر API في 2026-09-28)، ثم التصنيفات ثنائية اللغة (لإحلال القوائم
> الصلبة)، ثم دفتر المزوّد وقراءة حالة الدفع وتحرير ملف المزوّد.

## 6. Quality gates (what runs before any push)

```
eslint ─▶ tsc --noEmit (after build typegen) ─▶ vitest (13/13, 4 files)
      ─▶ next build (RAILPACK parity: Node 26.8.2) ─▶ playwright smoke 8/8
      ─▶ live browser pass (agent-browser; hermetic net needs no secrets,
          the signed-in pass needs an env with the staging secret)
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
| FE consumption | 97 templates · 0 dead · 96/111 paths (113/128 ops) | 2026-09-28 |
| Source scale | 91 files / 17,031 lines / 16 pages / 9 action modules | 2026-09-28 |
| Tests | 13 unit (vitest) + 8 e2e (playwright, hermetic) | 2026-09-28 |
| OAuth chain | PKCE S256 + consent, executed live on prod | 2026-09-28 |
| Deploy proof | Railway commitHash `5972dbd…` + signed-in browser pass | 2026-09-28 |
| Known backend defects on our radar | `GET /geo/tree` 409 ×3 | latest 2026-09-28 |
