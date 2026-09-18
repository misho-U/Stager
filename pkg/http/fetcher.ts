import { ApiError, type ApiErrorBody, type ApiErrorCode } from '@pkg/http/api-error';
import { toAbsoluteUrl } from '@pkg/http/site-url';

type JsonBody = Record<string, unknown> | unknown[] | null;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: JsonBody;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

type ServerReadOptions = {
  /** Cache tags this read participates in — see @pkg/cache/tags. */
  tags: string[];
  revalidate?: number | false;
  headers?: Record<string, string>;
};

async function toApiError(response: Response): Promise<ApiError> {
  let code: ApiErrorCode = 'INTERNAL';
  let message = response.statusText || 'Request failed';
  let fields: Record<string, string[]> | undefined;

  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (body.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      fields = body.error.fields;
    }
  } catch {
    // Non-JSON error body (a proxy timeout page, for instance). The status
    // code is still meaningful, so fall through with the defaults.
  }

  return new ApiError(response.status, code, message, fields);
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Read public data from our own API in a server component.
 *
 * Deliberately sends no cookies: the response is shared by every visitor, so
 * personalising it would be both wrong and uncacheable. `tags` is required —
 * an untagged read can never be invalidated when the admin edits content, and
 * would serve stale copy until the TTL expires.
 */
export async function serverFetch<T>(path: string, options: ServerReadOptions): Promise<T> {
  const response = await fetch(toAbsoluteUrl(path), {
    method: 'GET',
    headers: { accept: 'application/json', ...options.headers },
    next: {
      tags: options.tags,
      ...(options.revalidate === undefined ? {} : { revalidate: options.revalidate }),
    },
  });

  return parse<T>(response);
}

/**
 * Read data as the signed-in admin from a server component.
 *
 * Forwards the auth cookies and never caches — admin views must show the
 * database as it is right now, including drafts.
 */
export async function serverFetchAuthed<T>(
  path: string,
  cookieHeader: string,
  options?: { headers?: Record<string, string> },
): Promise<T> {
  const response = await fetch(toAbsoluteUrl(path), {
    method: 'GET',
    headers: { accept: 'application/json', cookie: cookieHeader, ...options?.headers },
    cache: 'no-store',
  });

  return parse<T>(response);
}

/**
 * Call our API from the browser.
 *
 * Only an entity `.api.ts` may use this; components consume the TanStack Query
 * hooks in the matching `.query.ts` instead.
 */
export async function clientFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, headers } = options;

  const response = await fetch(path, {
    method,
    signal,
    // Same-origin credentials carry the Supabase session for admin writes.
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  return parse<T>(response);
}
