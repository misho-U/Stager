import type { z } from 'zod';

import { readJson, recordAudit, withAdmin } from '@/app/api/_lib/route-helpers';
import { revalidateEntity } from '@pkg/cache/revalidate';
import type { ContentEntity } from '@pkg/cache/tags';
import { apiCreated, apiFail, apiNoContent, apiOk } from '@pkg/http/api-response';
import type { ListResponse } from '@/shared/types/api';

/**
 * Route factories for the admin CRUD endpoints.
 *
 * Every write has to do three things beyond the database call: append an audit
 * entry, invalidate the public cache tags, and turn a unique-constraint
 * violation into a field error the form can display. Hand-writing that per
 * entity means each new one is a chance to forget the second — and a forgotten
 * revalidation looks exactly like "the dashboard saved but the site didn't
 * change", which is the hardest class of bug to report.
 *
 * The per-entity repository still owns all the querying and shaping; these
 * factories only own the cross-cutting parts.
 */

type Conflict = { field: string; message: string };

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function conflictResponse(conflict: Conflict) {
  return apiFail('CONFLICT', conflict.message, { fields: { [conflict.field]: [conflict.message] } });
}

type CollectionConfig<TRecord, TInput> = {
  /** Cache-tag entity name — see pkg/cache/tags. */
  entity: ContentEntity;
  /** Human-readable type recorded in the audit log. */
  entityType: string;
  inputSchema: z.ZodType<TInput>;
  list: () => Promise<ListResponse<TRecord>>;
  create: (input: TInput) => Promise<TRecord>;
  /** Detail cache key (usually the slug); null when the entity has no detail page. */
  cacheKeyOf: (record: TRecord) => string | null;
  /** Small, non-sensitive summary stored in the audit diff. */
  auditSummary: (record: TRecord) => Record<string, unknown>;
  idOf: (record: TRecord) => string;
  conflict?: Conflict;
};

export function createCollectionRoutes<TRecord, TInput>(config: CollectionConfig<TRecord, TInput>) {
  const GET = withAdmin(async () => apiOk(await config.list()));

  const POST = withAdmin(async ({ request, session }) => {
    const parsed = await readJson(request, config.inputSchema);
    if (!parsed.ok) return parsed.response;

    try {
      const record = await config.create(parsed.data);

      await recordAudit({
        request,
        session,
        action: 'CREATE',
        entityType: config.entityType,
        entityId: config.idOf(record),
        diff: { after: config.auditSummary(record) },
      });

      // After the write commits, never before.
      revalidateEntity(config.entity, config.cacheKeyOf(record));

      return apiCreated(record);
    } catch (error) {
      if (config.conflict && isUniqueViolation(error)) return conflictResponse(config.conflict);
      throw error;
    }
  });

  return { GET, POST };
}

type ItemConfig<TRecord, TUpdate> = {
  entity: ContentEntity;
  entityType: string;
  updateSchema: z.ZodType<TUpdate>;
  get: (id: string) => Promise<TRecord | null>;
  update: (id: string, input: TUpdate) => Promise<TRecord | null>;
  remove: (id: string) => Promise<boolean>;
  cacheKeyOf: (record: TRecord) => string | null;
  auditSummary: (record: TRecord) => Record<string, unknown>;
  notFoundMessage: string;
  conflict?: Conflict;
};

export function createItemRoutes<TRecord, TUpdate>(config: ItemConfig<TRecord, TUpdate>) {
  type Params = { id: string };

  const GET = withAdmin<Params>(async ({ params }) => {
    const record = await config.get(params.id);
    if (!record) return apiFail('NOT_FOUND', config.notFoundMessage);
    return apiOk(record);
  });

  const PATCH = withAdmin<Params>(async ({ request, session, params }) => {
    const parsed = await readJson(request, config.updateSchema);
    if (!parsed.ok) return parsed.response;

    const before = await config.get(params.id);
    if (!before) return apiFail('NOT_FOUND', config.notFoundMessage);

    try {
      const record = await config.update(params.id, parsed.data);
      if (!record) return apiFail('NOT_FOUND', config.notFoundMessage);

      await recordAudit({
        request,
        session,
        action: 'UPDATE',
        entityType: config.entityType,
        entityId: params.id,
        diff: { before: config.auditSummary(before), after: config.auditSummary(record) },
      });

      // Invalidate under BOTH keys: if the slug changed, the old URL would keep
      // serving the previous copy until its TTL expired.
      const previousKey = config.cacheKeyOf(before);
      const nextKey = config.cacheKeyOf(record);
      revalidateEntity(config.entity, previousKey);
      if (nextKey !== previousKey) revalidateEntity(config.entity, nextKey);

      return apiOk(record);
    } catch (error) {
      if (config.conflict && isUniqueViolation(error)) return conflictResponse(config.conflict);
      throw error;
    }
  });

  const DELETE = withAdmin<Params>(async ({ request, session, params }) => {
    const before = await config.get(params.id);
    if (!before) return apiFail('NOT_FOUND', config.notFoundMessage);

    const removed = await config.remove(params.id);
    if (!removed) return apiFail('NOT_FOUND', config.notFoundMessage);

    await recordAudit({
      request,
      session,
      action: 'DELETE',
      entityType: config.entityType,
      entityId: params.id,
      diff: { before: config.auditSummary(before) },
    });

    revalidateEntity(config.entity, config.cacheKeyOf(before));

    return apiNoContent();
  });

  return { GET, PATCH, DELETE };
}
