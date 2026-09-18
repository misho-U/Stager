import {
  mediaListResponseSchema,
  mediaSchema,
  type Media,
  type MediaRegisterInput,
  type MediaUpdateInput,
} from '@/entity/media/model/media.model';
import type { ListResponse } from '@/shared/types/api';
import { clientFetch } from '@pkg/http/fetcher';

/**
 * Media does not use the generic CRUD factory: creation is not a plain POST.
 * The browser uploads straight to Vercel Blob using a token our server issues,
 * then registers the resulting object here. That keeps the blob credentials on
 * the server and keeps large files off our serverless functions entirely.
 */
const BASE = '/api/admin/media';

export async function fetchMediaList(): Promise<ListResponse<Media>> {
  const raw = await clientFetch<unknown>(BASE);
  return mediaListResponseSchema.parse(raw);
}

export async function registerMedia(input: MediaRegisterInput): Promise<Media> {
  const raw = await clientFetch<unknown>(BASE, { method: 'POST', body: input });
  return mediaSchema.parse(raw);
}

export async function updateMedia(id: string, input: MediaUpdateInput): Promise<Media> {
  const raw = await clientFetch<unknown>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
  return mediaSchema.parse(raw);
}

export async function deleteMedia(id: string): Promise<void> {
  await clientFetch<void>(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
