// Diagnostic: decode the browser's better-auth account cookie (JWE, key =
// HKDF(secret, "better-auth-account")) and exercise SAS's refresh grant the
// way better-auth's generic-oauth plugin does. Prints only status/error
// shapes and token LENGTHS — never token values.
// Usage: node scripts/diag_refresh.mjs <account_cookie_value>
import { symmetricDecodeJWT } from "../node_modules/better-auth/dist/crypto/jwt.mjs";
import { readFileSync } from "node:fs";

const cookieValue = process.argv[2];
if (!cookieValue) {
  console.error("usage: node diag_refresh.mjs <account_data cookie value>");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const secret = env.BETTER_AUTH_SECRET;
const payload = await symmetricDecodeJWT(cookieValue, secret, "better-auth-account");
if (!payload) {
  console.error("DECODE FAILED (wrong secret? expired JWE? missing cookie)");
  process.exit(1);
}
console.log("account fields:", Object.keys(payload).join(", "));
console.log("providerId:", payload.providerId, "| accountId:", payload.accountId);
console.log("accessTokenExpiresAt:", payload.accessTokenExpiresAt);
console.log("accessToken len:", payload.accessToken?.length ?? "none");
console.log("refreshToken len:", payload.refreshToken?.length ?? "none");

const basic = Buffer.from(`${env.OAUTH_CLIENT_ID}:${env.OAUTH_CLIENT_SECRET}`).toString("base64");
// Same BACKEND_URL the app itself uses (.env.local); hardcoded Railway origin
// kept only as fallback so the script and the app cannot drift apart.
const tokenUrl = `${env.BACKEND_URL ?? "https://app-java-v3-production.up.railway.app"}/oauth2/token`;
const res = await fetch(tokenUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${basic}`,
  },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: payload.refreshToken,
  }),
});
console.log("refresh grant -> HTTP", res.status);
const body = await res.json().catch(() => "(unparseable)");
if (res.ok) {
  console.log("new access_token len:", body.access_token?.length ?? "none");
  console.log("new refresh_token len:", body.refresh_token?.length ?? "none");
  console.log("expires_in:", body.expires_in, "| scope:", body.scope);
  console.log("VERDICT: SAS refresh works — failure is elsewhere");
} else {
  console.log("error body:", JSON.stringify(body));
  console.log("VERDICT: SAS rejected the refresh token");
}
