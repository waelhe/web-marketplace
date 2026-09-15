# Marketplace Web (Next.js BFF) — P2

Web client for the marketplace backend. Backend-for-Frontend: the Next.js
server holds the OAuth2 client secret and performs the authorization-code +
PKCE flow; tokens stay server-side, the browser only holds the encrypted
session cookie.

## Stack (pinned, verified 2026-09-15)

- Next.js 16.3.5 + React 19.3.0 + Node v26.8.2 (portable, `../.tools`)
- Better Auth 1.7.5 + Generic OAuth (stateless — no database)
- TypeScript + ESLint, no CSS framework (P2 proves auth, not styling)

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in (dev values: backend runbook)
npm run dev                  # http://localhost:3000
```

Backend must run locally first (DB + Redis + jar with the two OAuth2
clients — see backend `labs/oauth2-verification` runbook).

## Routes

- `/` — sign in / out, session state
- `/profile` — reads backend `GET /api/v1/users/me` through the BFF proxy
- `/api/auth/[...all]` — Better Auth handler (OAuth callback included)
- `/api/backend/[...path]` — Bearer relay to `BACKEND_URL` (401 = re-auth)

## Decisions (measured, not assumed)

- Better Auth over next-auth: v4 is legacy (project steers to Better Auth),
  v5 still beta; Generic OAuth gives discovery + PKCE-by-default +
  `client_secret_basic` + server-side `getAccessToken` with auto-refresh.
- Stateless over SQLite: `better-sqlite3` has no prebuild for this runtime
  and no C++ toolchain here (measured build failure); stateless OAuth flows
  are officially documented incl. refresh via the encrypted account cookie.
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

## Verification (P2)

`npm run build` green + live login/read flow against local backend
(authorize → login → consent → code → session → `/me` 200).
