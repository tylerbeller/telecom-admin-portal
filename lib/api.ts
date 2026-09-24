/**
 * Thin wrapper around fetch for the backend API.
 *
 * The backend returns a consistent error envelope ({ error, message, fields })
 * from its @RestControllerAdvice, so failures are translated into an
 * ApiRequestError that carries the status and per-field validation messages
 * instead of collapsing everything into a generic "request failed" string.
 */

export interface ApiErrorBody {
  error?: string
  message?: string
  fields?: Record<string, string>
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
    this.fields = fields
  }
}

/** True when a rejection came from an aborted request rather than a real failure. */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}

export type QueryValue = string | number | boolean | null | undefined

/** Serializes defined, non-empty params into a query string (leading "?" included). */
export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

export interface ApiFetchOptions extends RequestInit {
  /** Fallback used when the response body carries no usable message. */
  errorMessage?: string
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { errorMessage, ...init } = options
  const response = await fetch(path, init)

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    const message =
      body?.message ?? body?.error ?? errorMessage ?? `Request failed (${response.status})`
    throw new ApiRequestError(message, response.status, body?.fields)
  }

  if (response.status === 204) return undefined as T
  try {
    return (await response.json()) as T
  } catch (error) {
    // An aborted body read must stay an AbortError so callers can recognize
    // and drop superseded results; any other malformed 2xx body resolves to
    // null.
    if (isAbortError(error)) throw error
    return null as T
  }
}

/** POST/PUT/PATCH/DELETE helper that JSON-encodes the body. */
export function apiSend<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  options: ApiFetchOptions = {}
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    method,
    headers: body === undefined ? options.headers : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export interface PagedResponse<T> {
  content: T[]
  page: number
  totalPages: number
  totalElements: number
  hasNext: boolean
}
