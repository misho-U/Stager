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

/**
 * The table the query reads does not exist (P2021): a table a new migration
 * adds, read by a Vercel preview of that change before the migration has
 * run on the live database. Production applies its migrations before it
 * builds, so there it never happens. Only for an addition that may be
 * missing, as "none" (a course without a syllabus), never for a table the
 * site cannot do without.
 */
export function isMissingTable(error: unknown): boolean {
  return describeDbError(error)?.code === 'P2021';
}

/**
 * A column the query reads does not exist (P2022): one a new migration adds,
 * read by a Vercel preview before the migration has run on the live
 * database (see isMissingTable). Same rule: only to fall back to what the
 * site showed before the addition, never to hide a column it needs.
 */
export function isMissingColumn(error: unknown): boolean {
  return describeDbError(error)?.code === 'P2022';
}

/**
 * A Prisma error as it may be logged or reported: its class, code and model.
 * Never its message, which quotes the failed query's values: a contact
 * form that failed to save would put the visitor's name, email, phone and
 * message in the log and in Sentry. Null for anything that is not Prisma's.
 */
export type DbErrorSummary = { name: string; code: string | null; model: string | null };

export function prismaErrorSummary(error: unknown): DbErrorSummary | null {
  if (!(error instanceof Error)) return null;
  const { code, meta } = error as Error & { code?: unknown; meta?: { modelName?: unknown } };
  // The driver adapter's own error quotes Postgres, which names the values
  // too ("Key (email)=(…) already exists").
  const isPrisma =
    error.name.startsWith('PrismaClient') ||
    error.name === 'DriverAdapterError' ||
    describeDbError(error) !== null;
  if (!isPrisma) return null;
  return {
    name: error.name,
    code: typeof code === 'string' ? code : null,
    model: typeof meta?.modelName === 'string' ? meta.modelName : null,
  };
}

/** What a withheld Prisma error says instead of its message. */
export function prismaErrorText({ code, model }: DbErrorSummary): string {
  return `${code ?? 'no code'} on ${model ?? 'an unknown model'} (message withheld)`;
}

/**
 * The error to report in place of a Prisma one: same class name and stack
 * frames, its message replaced by code and model. The first line of a stack
 * repeats the message, and so does every line before the first frame.
 */
export function withheldPrismaError(error: unknown): unknown {
  const summary = prismaErrorSummary(error);
  if (!summary || !(error instanceof Error)) return error;
  const withheld = new Error(prismaErrorText(summary));
  withheld.name = summary.name;
  const frames = (error.stack ?? '').split('\n').filter((line) => /^\s+at /.test(line));
  withheld.stack = [`${withheld.name}: ${withheld.message}`, ...frames].join('\n');
  return withheld;
}
