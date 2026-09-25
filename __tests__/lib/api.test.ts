import { describe, it, expect, vi, afterEach } from "vitest"
import { ApiRequestError, apiFetch, apiSend, buildQuery, isAbortError } from "@/lib/api"

function response(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response
}

describe("buildQuery", () => {
  it("omits null, undefined, and empty values", () => {
    expect(buildQuery({ page: 0, size: 20, search: null, status: undefined, q: "" })).toBe(
      "?page=0&size=20"
    )
  })

  it("returns an empty string when nothing is set", () => {
    expect(buildQuery({ search: null })).toBe("")
  })

  it("encodes values", () => {
    expect(buildQuery({ search: "a b&c" })).toBe("?search=a+b%26c")
  })
})

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns the parsed body on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ id: 1 })))
    await expect(apiFetch<{ id: number }>("/api/x")).resolves.toEqual({ id: 1 })
  })

  it("returns undefined for 204 responses without parsing a body", async () => {
    const json = vi.fn()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 204, json } as unknown as Response)
    )

    await expect(apiFetch("/api/x", { method: "DELETE" })).resolves.toBeUndefined()
    expect(json).not.toHaveBeenCalled()
  })

  it("surfaces the backend message and status on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response(
            { error: "Invalid value", message: "'BOGUS' is not a valid value for 'status'" },
            { ok: false, status: 400 }
          )
        )
    )

    await expect(apiFetch("/api/customers?status=BOGUS")).rejects.toThrow(
      "'BOGUS' is not a valid value for 'status'"
    )
  })

  it("exposes per-field validation messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          {
            error: "Validation failed",
            message: "Some fields are missing or invalid",
            fields: { email: "must not be blank" },
          },
          { ok: false, status: 400 }
        )
      )
    )

    const error = await apiFetch("/api/customers").catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).status).toBe(400)
    expect((error as ApiRequestError).fields).toEqual({ email: "must not be blank" })
  })

  it("falls back to the caller's message when the body has none", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(null, { ok: false, status: 500 })))

    await expect(apiFetch("/api/x", { errorMessage: "Failed to fetch x" })).rejects.toThrow(
      "Failed to fetch x"
    )
  })

  it("falls back to the status when there is no message at all", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(null, { ok: false, status: 503 })))
    await expect(apiFetch("/api/x")).rejects.toThrow("Request failed (503)")
  })
})

describe("apiSend", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("JSON-encodes the body and sets the content type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ id: 7 }))
    vi.stubGlobal("fetch", fetchMock)

    await apiSend("/api/devices", "POST", { imei: "123" })

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe("/api/devices")
    expect(init.method).toBe("POST")
    expect(init.body).toBe(JSON.stringify({ imei: "123" }))
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json")
  })

  it("sends no body or content type when there is nothing to send", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetchMock)

    await apiSend("/api/devices/1", "DELETE")

    const [, init] = fetchMock.mock.calls[0]
    expect(init.body).toBeUndefined()
    expect(new Headers(init.headers).get("Content-Type")).toBeNull()
  })
})

describe("apiFetch resilience", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("retries a GET on a 5xx and returns the later success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(null, { ok: false, status: 503 }))
      .mockResolvedValueOnce(response({ id: 9 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiFetch<{ id: number }>("/api/x")).resolves.toEqual({ id: 9 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("does not retry a 4xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(null, { ok: false, status: 400 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiFetch("/api/x")).rejects.toThrow("Request failed (400)")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("does not retry writes, even on a 5xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(null, { ok: false, status: 500 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiSend("/api/x", "POST", { a: 1 })).rejects.toThrow("Request failed (500)")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("attaches a W3C traceparent header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true }))
    vi.stubGlobal("fetch", fetchMock)

    await apiFetch("/api/x")

    const [, init] = fetchMock.mock.calls[0]
    const traceparent = new Headers(init.headers).get("traceparent")
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
  })

  it("times out a hung request instead of waiting forever", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_path: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              reject(init.signal?.reason ?? new Error("aborted"))
            })
          })
      )
    )

    const error = await apiFetch("/api/hung", { timeoutMs: 5 }).catch((e: unknown) => e)
    expect(error).toBeDefined()
    expect((error as Error).name).toBe("TimeoutError")
  }, 5000)
})

describe("isAbortError", () => {
  it("recognizes aborted requests", () => {
    const controller = new AbortController()
    controller.abort()
    const error = new Error("The operation was aborted")
    error.name = "AbortError"

    expect(isAbortError(error)).toBe(true)
    expect(isAbortError(new Error("network down"))).toBe(false)
    expect(isAbortError("nope")).toBe(false)
  })
})
