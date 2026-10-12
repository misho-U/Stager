/**
 * What a database error is, as far as an HTTP answer cares: Prisma's code and
 * the constraint it names.
 *
 * Duck-typed rather than `instanceof PrismaClientKnownRequestError`, so this
 * file pulls in no Prisma runtime. Prisma 7 behind a driver adapter reports the
 * constraint under `meta.driverAdapterError.cause.constraint.index` (e.g.
 * "categories_slug_key", "insights_categoryId_fkey"), not the `meta.target` of
 * older versions and of its docs; both are read.
 */
export type DbErrorInfo = { code: string; constraint: string | null };

type PrismaLike = {
  code?: unknown;
  meta?: {
    target?: unknown;
    driverAdapterError?: { cause?: { constraint?: { index?: unknown } } };
  };
};

export function describeDbError(error: unknown): DbErrorInfo | null {
  if (typeof error !== 'object' || error === null) return null;

  const { code, meta } = error as PrismaLike;
  if (typeof code !== 'string' || !/^P\d{4}$/.test(code)) return null;

  const index = meta?.driverAdapterError?.cause?.constraint?.index;
  const target = meta?.target;
  const constraint =
    typeof index === 'string'
      ? index
      : Array.isArray(target)
        ? target.join(',')
        : typeof target === 'string'
          ? target
          : null;

  return { code, constraint };
}

/**
 * A unique-constraint error on this field. A constraint is named after its
 * table and columns ("projects_slug_key"), so the field appears in its name.
 * An error that names no constraint is taken to be on the field, as before.
 */
export function isUniqueViolationOn(error: unknown, field: string): boolean {
  const info = describeDbError(error);
  if (info?.code !== 'P2002') return false;
  return info.constraint === null || info.constraint.split(/[_,]/).includes(field);
}

/**
 * The database refused a value its column's type does not hold (P2007): an
 * enum value the code knows and the database does not have yet. A Vercel
 * preview runs new code against the live database before the migration
 * that adds the value has run, which only happens when the code ships; a
 * page asked for by a key the live database has never heard of is a page it
 * does not have, not a failed read.
 */
export function isUnknownEnumValue(error: unknown): boolean {
  return describeDbError(error)?.code === 'P2007';
}
