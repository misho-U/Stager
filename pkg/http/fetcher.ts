import { ApiError, type ApiErrorBody, type ApiErrorCode } from '@pkg/http/api-error';

type JsonBody = Record<string, unknown> | unknown[] | null;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: JsonBody;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

async function toApiError(response: Response): Promise<ApiError> {
  let code: ApiErrorCode = 'INTERNAL';
  let message = response.statusText || 'Request failed';
  let details: ConstructorParameters<typeof ApiError>[3] = {};

  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (body.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      details = { reason: body.error.reason, fields: body.error.fields, issues: body.error.issues };
    }
  } catch {
    // Non-JSON error body (a proxy timeout page, for instance). The status
    // code is still meaningful, so fall through with the defaults.
  }

  return new ApiError(response.status, code, message, details);
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
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
