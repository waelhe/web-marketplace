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
- TypeScript + ESLint, no CSS framework (P2 proves auth, not styling)

## Routes

- `/` — sign in/out, session state
- `/profile` — reads backend `GET /api/v1/users/me` through the BFF proxy
- `/api/auth/[...all]` — Better Auth handler (OAuth callback included)
- `/api/backend/[...path]` — Bearer relay to `BACKEND_URL` (401 = re-auth)

## Rules

- Never commit secrets: `.env*` is gitignored; `.env.example` holds placeholders only; real dev values live in local `.env.local`.
- Backend must run locally first (DB + Redis + jar with the two OAuth2 clients) for any live verification.
- Add no dependency unless measured-needed against the pinned stack; Next.js builds must stay green (`npm run build`).
