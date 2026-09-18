import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

import { withAdmin } from '@/app/api/_lib/route-helpers';
import {
  ALLOWED_IMAGE_TYPES,
  BLOB_PATH_PREFIX,
  MAX_UPLOAD_BYTES,
} from '@pkg/blob/constraints';
import { serverEnv } from '@pkg/config/env.server';
import { apiFail, apiOk } from '@pkg/http/api-response';
import { logger } from '@pkg/logger';
import { checkRateLimit, RATE_LIMITS } from '@pkg/ratelimit/limiter';

export const dynamic = 'force-dynamic';

/**
 * Issues a short-lived, tightly-scoped token that lets the browser upload
 * straight to Vercel Blob.
 *
 * The file never passes through this function, which is the point: a 12 MB
 * photo would otherwise have to fit inside a serverless request body and be
 * buffered in memory. The blob read/write token stays on the server — the
 * browser only ever holds a token constrained to one upload, one size limit and
 * a fixed set of content types.
 *
 * Wrapped in withAdmin, so an anonymous caller cannot mint upload tokens.
 */
export const POST = withAdmin(async ({ request, session }) => {
  const limit = await checkRateLimit({
    key: `upload:${session.adminUserId}`,
    ...RATE_LIMITS.upload,
  });

  if (!limit.ok) {
    return apiFail('RATE_LIMITED', 'Too many uploads. Please try again later.', {
      headers: { 'Retry-After': String(limit.retryAfterSeconds) },
    });
  }

  const body = (await request.json()) as HandleUploadBody;

  const result = await handleUpload({
    body,
    request,
    token: serverEnv.BLOB_READ_WRITE_TOKEN,

    onBeforeGenerateToken: async (pathname) => {
      logger.info('blob.token_issued', { adminUserId: session.adminUserId, pathname });

      return {
        // Enforced by Vercel Blob itself, not just by our UI.
        allowedContentTypes: [...ALLOWED_IMAGE_TYPES],
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        // Prevents one upload from overwriting another by guessing its name.
        addRandomSuffix: true,
        validUntil: Date.now() + 60_000,
        tokenPayload: JSON.stringify({ adminUserId: session.adminUserId }),
      };
    },

    onUploadCompleted: async ({ blob }) => {
      // Vercel calls this by webhook, which cannot reach a localhost dev
      // server — so it is only for observability. The Media row is created by
      // the browser calling POST /api/admin/media once the upload resolves,
      // which works identically in development and production.
      logger.info('blob.upload_completed', { pathname: blob.pathname });
    },
  });

  return apiOk(result);
});

/** Exported for the client uploader so both sides agree on the prefix. */
export const UPLOAD_PATH_PREFIX = BLOB_PATH_PREFIX;
