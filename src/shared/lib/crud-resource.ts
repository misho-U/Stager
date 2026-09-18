import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import { listResponseSchema, type ListResponse } from '@/shared/types/api';
import { clientFetch } from '@pkg/http/fetcher';

/**
 * Every admin resource has the same five operations over the same URL shape.
 * Writing them out ten times would mean ten places to fix a bug in error
 * handling, response parsing or cache invalidation.
 *
 * Each entity still owns its `.api.ts` and `.query.ts` — they call these
 * factories with their own schemas, which is where the per-entity typing and
 * validation live.
 */

export type CrudApi<TRecord, TCreate, TUpdate> = {
  list: () => Promise<ListResponse<TRecord>>;
  get: (id: string) => Promise<TRecord>;
  create: (input: TCreate) => Promise<TRecord>;
  update: (id: string, input: TUpdate) => Promise<TRecord>;
  remove: (id: string) => Promise<void>;
};

/**
 * Responses are parsed, not cast.
 *
 * A schema mismatch means the API changed and the client did not; failing loudly
 * at the boundary beats a stray `undefined` surfacing three components deep.
 */
export function createCrudApi<TRecord, TCreate, TUpdate>(config: {
  basePath: string;
  recordSchema: z.ZodType<TRecord>;
}): CrudApi<TRecord, TCreate, TUpdate> {
  const { basePath, recordSchema } = config;
  const listSchema = listResponseSchema(recordSchema);

  return {
    async list() {
      const raw = await clientFetch<unknown>(basePath);
      return listSchema.parse(raw) as ListResponse<TRecord>;
    },

    async get(id) {
      const raw = await clientFetch<unknown>(`${basePath}/${encodeURIComponent(id)}`);
      return recordSchema.parse(raw);
    },

    async create(input) {
      const raw = await clientFetch<unknown>(basePath, { method: 'POST', body: input as never });
      return recordSchema.parse(raw);
    },

    async update(id, input) {
      const raw = await clientFetch<unknown>(`${basePath}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: input as never,
      });
      return recordSchema.parse(raw);
    },

    async remove(id) {
      await clientFetch<void>(`${basePath}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  };
}

/**
 * TanStack Query bindings for a CRUD resource.
 *
 * Keys are nested under one root so `invalidateQueries({ queryKey: keys.all })`
 * reaches the list and every detail entry. Mutations invalidate on success
 * rather than writing into the cache by hand: the server owns derived fields
 * (updatedAt, publishedAt, resolved relations) and a hand-patched cache would
 * drift from them.
 */
export function createCrudQueries<TRecord, TCreate, TUpdate>(config: {
  resource: string;
  api: CrudApi<TRecord, TCreate, TUpdate>;
}) {
  const { resource, api } = config;

  const keys = {
    all: [resource] as const,
    lists: () => [resource, 'list'] as const,
    detail: (id: string) => [resource, 'detail', id] as const,
  };

  const listQuery = () =>
    queryOptions({
      queryKey: keys.lists(),
      queryFn: () => api.list(),
    });

  const detailQuery = (id: string) =>
    queryOptions({
      queryKey: keys.detail(id),
      queryFn: () => api.get(id),
      enabled: id.length > 0,
    });

  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (input: TCreate) => api.create(input),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, input }: { id: string; input: TUpdate }) => api.update(id, input),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
    });
  }

  function useDelete() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => api.remove(id),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
    });
  }

  return { keys, listQuery, detailQuery, useCreate, useUpdate, useDelete };
}
