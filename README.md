# Marketplace Web (Next.js BFF) — P2

Web client for the marketplace backend. Backend-for-Frontend: the Next.js
server holds the OAuth2 client secret and performs the authorization-code +
PKCE flow; tokens stay server-side, the browser only holds the encrypted
session cookie.

## Stack (pinned, verified 2026-09-15)

- Next.js 16.3.5 + React 19.3.0 + Node v26.8.2 (portable, `../.tools`)
- Better Auth 1.7.5 + Generic OAuth (stateless — no database)
- TypeScript + ESLint; zero CSS framework — RTL-logical design tokens in
  `globals.css` (Tailwind stays a recorded future option, not a default)

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in (dev values: backend runbook)
npm run dev                  # http://localhost:3000
```

Backend: the marketplace backend runs as the Railway production service
`app-java-v3` (https://app-java-v3-production.up.railway.app) — local dev
and the deployed service both point `BACKEND_URL` at it. Full login-flow
verification additionally needs a real backend user account (the seeded
admin password is not a known constant).

## Routes

- `/` — sign in / out, session state + the public browse entry link
  (Arabic RTL UI)
- `/listings` — PUBLIC active-listing browse (paginated; anonymous GETs —
  crawlers see the same page visitors do)
- `/listings/[id]` — PUBLIC listing detail: `generateMetadata` (title
  template + canonical + OpenGraph) and the backend-composed schema.org
  JSON-LD embedded verbatim; unknown/inactive ids render the not-found
  boundary with `noindex` (the documented streamed-404 contract)
- `/profile` — DAL session + DIRECT backend `/me` fetch (server data layer)
- `/api/auth/[...all]` — Better Auth handler (OAuth callback included)
- `/api/backend/[...path]` — Bearer relay to `BACKEND_URL` (401 = re-auth)

## Decisions (measured, not assumed)

- Better Auth over next-auth: v4 is legacy (project steers to Better Auth),
  v5 still beta; Generic OAuth gives discovery + PKCE-by-default +
  `client_secret_basic` + server-side `getAccessToken` with auto-refresh.
- Stateless over SQLite: `better-sqlite3` has no prebuild for this runtime
  and no C++ toolchain here (measured build failure); stateless OAuth flows
  are officially documented incl. refresh via the encrypted account cookie.
- Provider redirect = framework callback (`/api/auth/callback/marketplace-web`,
  registered in backend env — Better Auth's official demand; exact-match
  RFC 9700 §4.1.3, sent verbatim with no placeholder substitution).
- Email-less provider: backend identity is `sub`-only, so the official
  `mapProfileToUser` bridge mints `${sub}@marketplace.placeholder.invalid`
  (reserved `.invalid`, never a contact address; recognition stays on the
  stable `(providerId, sub)` key).
- No secrets in repo: `.env*` gitignored; `.env.example` holds placeholders.

## Frontend foundation (2026-09-20, packaged-docs-anchored)

All decisions measured against the docs bundled INSIDE `next@16.3.5`
(`node_modules/next/dist/docs/`) — not training data.

- Arabic RTL root: `lang="ar" dir="rtl"` (single-locale app — no `[lang]`
  segment per the i18n guide), logical CSS properties everywhere.
- Typography: Cairo variable font (wght 200-1000, arabic+latin subsets,
  measured in the packaged font-data.json; the fonts guide recommends
  variable fonts). Self-hosted via `next/font/google` — zero browser
  requests to Google.
- Official boundary files: `not-found/error/global-error/loading` per the
  file-conventions reference — error props use `retry()` (16.x), NOT the
  legacy `reset()`; `global-error` owns its `<html>/<body>`.
- DAL (`src/lib/dal.ts`): React `cache()`-memoized session read, the
  officially recommended centralization point for auth checks.
- Server data layer (`src/lib/api/server.ts`): Server Components fetch the
  backend DIRECTLY (BFF guide: never self-fetch through own Route
  Handlers) — token resolution mirrors the live-verified relay route.
- Client API (`src/lib/api/client.ts`): typed BFF-proxy wrapper with
  RFC 7807 `problem+json` decoding (`src/lib/problem.ts`, mirrors backend
  `docs/api/error-contract.md`) and the 401-reauth signal.
- Zero new dependencies (repo rule). `server-only` package deliberately
  deferred: `next/headers` already fails the build on client imports of the
  DAL — same guard, no dep.
- Recorded debt: exact `/me` DTO types wait for the OpenAPI export; typed
  client-side data caching (TanStack Query/SWR) waits for the first
  interactive page that needs it.

## Public listing surfaces (2026-09-22, packaged-docs-anchored)

- The public catalog data channel (`src/lib/api/public.ts`): anonymous
  direct server fetch (no session, no Bearer) — measured live against the
  Railway production backend: `GET /api/v1/listings` (browse) and
  `GET /api/v1/listings/{id}` (detail) answer anonymous GETs.
- React `cache()` dedups the detail read across `generateMetadata` and the
  page body — ONE backend GET per request, honoring the backend's L40
  view-counter contract (every successful detail read counts one view).
- The backend's L39 SEO contract points HERE: its
  `marketplace.catalog.seo.listing-path` defaults to `/listings/{id}` —
  this route IS the contract-mandated public page (JSON-LD `url` + sitemap
  entries compose against it once the backend binds its
  `public-site-base-url`).
- JSON-LD embedding follows the packaged JSON-LD guide: native
  `<script type="application/ld+json">`, `<` escaped as `\u003c`, the
  backend-composed block embedded VERBATIM (frontend never recomposes
  facts). Live-verified branch pending: production currently has no
  property-block listing (measured: the single e2e listing carries
  `property: null` → `jsonLd: null`).
- Streamed-404 trade-off (measured + documented): with the root
  `loading.tsx` boundary, unknown/inactive listing ids render the
  not-found UI with `noindex` but HTTP 200 — the official streaming
  contract ("does not lead to indexation"). A real 404 status would
  require removing the loading boundary (blank screens for 0.6–2.7s
  Railway round trips) — recorded as a deliberate non-goal.
- `metadataBase` reuses `BETTER_AUTH_URL` (the app's own origin in dev and
  production) so canonical/OG URLs resolve absolutely from one env fact.

## Deployment (Railway, 2026-09-21)

- Service `web-marketplace` in the app-java-v3 Railway project, GitHub-
  connected to this repo (branch `main`, auto-deploy trigger), builder
  RAILPACK.
- Public URL: https://web-marketplace-production-5cc1.up.railway.app
  (domain targetPort 8080 — Railway injects `PORT=8080` and `next start`
  listens on it, the documented platform contract).
- Runtime env lives ONLY in Railway variables: `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL` (the public URL above), `BACKEND_URL`,
  `OAUTH_CLIENT_ID`/`OAUTH_CLIENT_SECRET` (the backend's registered client
  `marketplace-bff`). No secrets in the repo.
- Backend-side registration (converged by its `OAuth2ClientSecretInitializer`
  on boot): `OAUTH_CLIENT_REDIRECT_URIS` carries BOTH callbacks — the local
  dev `http://localhost:3000/api/auth/callback/marketplace-web` and the
  deployed `https://web-marketplace-production-5cc1.up.railway.app/api/auth/callback/marketplace-web`;
  `CORS_ALLOWED_ORIGINS` carries the deployed origin.

## Verification

`npm run build` green; OAuth chain live-verified 2026-09-21 against the
Railway backend, from BOTH the local dev server and the deployed service:
OIDC discovery 200, authorize with PKCE S256 answers 302 → `/login` for
both registered callbacks, `client_credentials` exchange answers 200 with
a real JWT, and the browser E2E (home → sign-in click → backend login form)
was measured on both origins.

The remaining steps of the full user flow — form login, consent, callback,
session, `/me` through the relay — require a real backend user account and
are honestly NOT yet live-verified. The 2026-09-20 foundation run was
verified live WITHOUT the backend (it was stopped in that sandbox):
compilation, routes, RTL DOM attributes, Cairo font application,
404/boundary rendering, lint, typecheck, and the production build were all
measured green.
