/**
 * The listing media channel (roadmap stage 4 — the L28/L34 presigned
 * upload surface completing the provider manage page's fourth quarter).
 *
 * Measured contract (backend source + live OpenAPI 2026-09-22):
 * - POST   /api/v1/media/uploads           (PROVIDER role + listing ownership;
 *                                          type allowlist + size cap BEFORE signing)
 * - POST   /api/v1/media/{id}/complete     (HeadObject verification → UPLOADED)
 * - GET    /api/v1/media/listings/{id}     (UPLOADED assets in display order)
 * - DELETE /api/v1/media/{id}              (soft-delete + best-effort removal, 204)
 *
 * The presigned PUT goes straight to the storage URL returned by the
 * backend (Cloudflare R2-style presigned object storage — the URL embeds
 * its own signature and pins the declared Content-Type), so it is NOT a
 * backendSend call: no Authorization header, no BACKEND_URL prefix. The
 * BFF holds the whole flow server-side (declare → PUT bytes → complete)
 * so tokens never reach the browser and no storage CORS is assumed.
 */

import { backendGet, backendSend } from "./server";
import type { MediaAssetView, MediaUploadView } from "./provider-contract";

/** Declare an upload: the backend signs and returns the presigned PUT URL. */
export async function requestUpload(
  listingId: string,
  contentType: string,
  sizeBytes: number,
): Promise<ReturnType<typeof backendSend<MediaUploadView>>> {
  return backendSend<MediaUploadView>("POST", "/api/v1/media/uploads", {
    listingId,
    contentType,
    sizeBytes,
  });
}

/**
 * PUT the bytes to the presigned storage URL. The signature pins the
 * declared Content-Type — sending it verbatim is part of the contract.
 * A non-2xx storage answer is returned as data (an expected failure),
 * never thrown.
 */
export async function putToPresignedUrl(
  uploadUrl: string,
  contentType: string,
  bytes: ArrayBuffer,
): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: bytes,
      cache: "no-store",
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Confirm the upload (server-side HeadObject check) → the asset goes visible. */
export async function completeUpload(
  mediaId: string,
): Promise<ReturnType<typeof backendSend<MediaAssetView>>> {
  return backendSend<MediaAssetView>("POST", `/api/v1/media/${mediaId}/complete`);
}

/** Every UPLOADED asset of the listing in display order (authenticated read). */
export async function listListingMedia(
  listingId: string,
): Promise<ReturnType<typeof backendGet<MediaAssetView[]>>> {
  return backendGet<MediaAssetView[]>(`/api/v1/media/listings/${listingId}`);
}

/** Soft-delete one asset (owner-scoped; 204 on success). */
export async function deleteMedia(
  mediaId: string,
): Promise<ReturnType<typeof backendSend<null>>> {
  return backendSend<null>("DELETE", `/api/v1/media/${mediaId}`);
}
