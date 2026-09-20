import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[web-marketplace] missing required env ${name} — see .env.example`);
  }
  return value;
}

// Stateless BFF: no `database` field — Better Auth encrypts session + provider
// account material (tokens) in httpOnly cookies server-side. Tokens never
// reach the browser (labs/platform/03-web.md §2). SQLite was rejected by
// measurement (no C++ toolchain / prebuild for this runtime).
const appURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const backendURL = process.env.BACKEND_URL ?? "http://localhost:8080";

export const auth = betterAuth({
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  plugins: [
    genericOAuth({
      config: [
        {
          // providerId is the LOCAL route name (shapes the framework
          // callback below); the backend's RegisteredClient clientId is
          // env-driven (OAUTH_CLIENT_ID) — "marketplace-bff" on the live
          // Railway backend, measured 2026-09-21 (authorize answered
          // 302→/login with this pair after its redirect set gained the
          // callback below, and a client_credentials exchange at the
          // token endpoint answered 200 with the real secret). The
          // callback must equal a registered string exactly (RFC 9700
          // §4.1.3) — measured verbatim on the wire 2026-09-15 and
          // re-verified live 2026-09-17 and 2026-09-21.
          providerId: "marketplace-web",
          clientId: requiredEnv("OAUTH_CLIENT_ID"),
          clientSecret: requiredEnv("OAUTH_CLIENT_SECRET"),
          discoveryUrl: `${backendURL}/.well-known/openid-configuration`,
          scopes: ["openid", "profile"],
          // Official solution (Better Auth generic-oauth: "Make sure your OAuth
          // provider is configured to use this URL"):
          // the backend registers THIS framework callback URL verbatim
          // (env-driven redirect URIs, spec §4.4-هـ — zero backend code).
          // Measured 2026-09-15: redirectURI is sent verbatim (no
          // `:providerId` substitution on the wire), so it must equal the
          // registered string exactly (RFC 9700 §4.1.3).
          redirectURI: `${appURL}/api/auth/callback/marketplace-web`,
          tokenEndpointAuth: { method: "client_secret_basic" },
          pkce: true,
          // Official handling for email-less providers
          // (better-auth.com/docs/concepts/oauth#handling-providers-without-email):
          // our provider is subject-identified and never emits an email
          // (backend syncFromOidc nulls it by design), while Better Auth
          // requires an email on every user record. The sanctioned bridge
          // is a deterministic placeholder from the STABLE sub in the
          // reserved .invalid domain (RFC 2606 — never routable, never a
          // real inbox). Returning accounts are recognized by the stable
          // (providerId, accountId=sub) key, not by this address. No mail
          // is ever sent from this BFF (no mail provider configured).
          mapProfileToUser: (profile) => {
            const sub = (profile as { sub?: unknown }).sub;
            if (typeof sub !== "string" || !sub) {
              throw new Error("[web-marketplace] provider profile has no stable sub");
            }
            return {
              email: `${sub}@marketplace.placeholder.invalid`,
              name: sub,
            };
          },
        },
      ],
    }),
    // Official Next.js integration (better-auth.com/docs/integrations/next,
    // 1.7.x): "make sure this is the last plugin in the array". Applies every
    // Set-Cookie Better Auth collects from auth.api calls via Next's
    // cookies() in Route Handlers / Server Actions — this is what lets the
    // relay's token refresh land the ROTATED refresh token (SAS has
    // reuseRefreshTokens=false, measured in OAuth2ClientSecretInitializer)
    // in the browser's account cookie, keeping stateless sessions alive.
    // In RSC renders it detects RSC:1 and skips session-refresh writes —
    // reads stay side-effect-free there.
    nextCookies(),
  ],
});
