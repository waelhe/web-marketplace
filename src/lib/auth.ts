import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";

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
          // providerId names the backend's RegisteredClient
          // ("marketplace-web"). The registered redirect is the framework
          // callback BELOW — not the legacy /login/oauth2/code/... path:
          // it must equal the registered string exactly (RFC 9700 §4.1.3),
          // measured verbatim on the wire 2026-09-15 and re-verified live
          // 2026-09-17 (authorize URL carried it character-for-character).
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
  ],
});
