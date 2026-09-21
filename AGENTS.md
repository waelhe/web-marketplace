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
- `/profile` — DAL session + direct backend `/me` fetch (server data layer,
  NOT a self-fetch through the BFF route — packaged BFF guide forbids it)
- `/api/auth/[...all]` — Better Auth handler (OAuth callback included)
- `/api/backend/[...path]` — Bearer relay to `BACKEND_URL` (401 = re-auth;
  client-side use ONLY — server components use `src/lib/api/server.ts`
  for authenticated data, `src/lib/api/public.ts` for public data)

## Rules

- Never commit secrets: `.env*` is gitignored; `.env.example` holds placeholders only; real dev values live in local `.env.local`; production values live only in Railway service variables.
- Backend for live verification: the Railway production service
  https://app-java-v3-production.up.railway.app (service `app-java-v3`).
  Local `.env.local` and the deployed service both point `BACKEND_URL` at
  it. Full login/consent/session flows additionally need a real backend
  user account.
- This repo deploys as Railway service `web-marketplace` (GitHub-connected,
  branch `main`, auto-deploy): https://web-marketplace-production-5cc1.up.railway.app.
- Add no dependency unless measured-needed against the pinned stack; Next.js builds must stay green (`npm run build`).
- Run everything with the pinned toolchain `../.tools/node-v26.8.2-win-x64` (Node
  v26.8.2, enforced by `engines` + `.npmrc engine-strict`) — ambient `node`
  on this machine is older and must not be used.
- After every edit, verify the page still works at runtime using the next-dev-loop Skill (guide Step 4).
