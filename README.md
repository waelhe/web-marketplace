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

Backend must run locally first (DB + Redis + jar with the two OAuth2
clients — see backend `labs/oauth2-verification` runbook).

## Routes

- `/` — sign in / out, session state (Arabic RTL UI)
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

## Verification (P2)

`npm run build` green + live login/read flow against local backend
(authorize → login → consent → code → session → `/me` 200).

The 2026-09-20 foundation run was verified live WITHOUT the backend (it is
stopped in that sandbox): compilation, routes, RTL DOM attributes, Cairo
font application, 404/boundary rendering, lint, typecheck, and the
production build are all measured green; OAuth discovery/relay flows were
NOT live-verifiable there and carry no claims (per AGENTS.md the backend
must run first).
