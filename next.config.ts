import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    browserToTerminal: 'warn',
  },
  // Dev-server hydration gate (measured 2026-10-04): Next's dev runtime
  // only trusts `localhost` as a dev origin — every e2e/dev visit from
  // 127.0.0.1 (the playwright baseURL, local and CI alike) had its HMR
  // websocket handshake REJECTED (net::ERR_INVALID_HTTP_RESPONSE) and
  // React never attached: pages rendered SSR-only for the whole 20s
  // probe window. The prod build has no HMR and hydrated instantly,
  // which is why only client-interactive surfaces (the suq publish
  // sheet) ever exposed it. Allowing the loopback alias fixes dev
  // hydration everywhere; zero effect on production builds.
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    // The photo upload Server Action carries the file's bytes through
    // the action request (the official FormData path). The default 1MB
    // action cap is raised past the backend's own measured upload
    // ceiling (MEDIA_MAX_UPLOAD_BYTES default 10485760 — application.yml)
    // with the packaged doc's prescribed multipart-overhead headroom
    // ("the limit applies to the raw HTTP request body, including the
    // bytes that multipart/form-data adds… leave some room for this
    // overhead"): the authoritative size gate stays the backend's own
    // check (plus the action's mirrored pre-check), not this transport
    // limit.
    serverActions: {
      bodySizeLimit: '11mb',
    },
  },
};

export default nextConfig;
