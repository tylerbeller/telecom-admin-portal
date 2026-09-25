/**
 * Thin wrapper around fetch for the backend API.
 *
 * The backend returns a consistent error envelope ({ error, message, fields })
 * from its @RestControllerAdvice, so failures are translated into an
 * ApiRequestError that carries the status and per-field validation messages
 * instead of collapsing everything into a generic "request failed" string.
 */

import { flags } from "./flags"
import { logger } from "./logger"

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
  /** Per-request timeout in ms; defaults to 15s. Override for slow operations or tests. */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 15_000
/** GETs are idempotent, so only they earn automatic retries. */
const GET_ATTEMPTS = 3
const RETRY_BACKOFF_MS = 250

/** W3C trace context, so a browser request can be found in the backend logs by trace id. */
function newTraceparent(): string {
  const hex = crypto.randomUUID().replaceAll("-", "")
  return `00-${hex}-${hex.slice(0, 16)}-01`
}

function isRetryable(error: unknown): boolean {
  // A caller's own abort is a cancellation, never a failure to retry.
  if (isAbortError(error)) return false
  if (error instanceof ApiRequestError) return error.status >= 500
  // Network failures and our own timeout (TimeoutError) are retryable.
  return true
}

async function singleRequest<T>(
  path: string,
  init: RequestInit,
  errorMessage: string | undefined,
  timeoutMs: number
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has("traceparent")) headers.set("traceparent", newTraceparent())
  const signal = AbortSignal.any([
    ...(init.signal ? [init.signal] : []),
    AbortSignal.timeout(timeoutMs),
  ])

  const response = await fetch(path, { ...init, headers, signal })

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

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { errorMessage, timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options
  const method = (init.method ?? "GET").toUpperCase()
  const attempts = method === "GET" ? GET_ATTEMPTS : 1

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const startedAt = Date.now()
    try {
      const result = await singleRequest<T>(path, init, errorMessage, timeoutMs)
      if (flags.apiDebug) {
        logger.debug({ path, method, attempt, ms: Date.now() - startedAt }, "api request ok")
      }
      return result
    } catch (error) {
      if (isAbortError(error) || !isRetryable(error) || attempt === attempts) {
        if (!isAbortError(error) && isRetryable(error)) {
          logger.error(
            { path, method, attempts: attempt, status: (error as ApiRequestError).status },
            "api request failed"
          )
        }
        throw error
      }
      lastError = error
      if (flags.apiDebug) {
        logger.debug({ path, method, attempt }, "api request retrying")
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS * 2 ** (attempt - 1)))
    }
  }
  throw lastError
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
