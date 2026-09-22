import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    browserToTerminal: 'warn',
  },
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
