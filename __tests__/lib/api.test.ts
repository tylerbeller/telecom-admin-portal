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

    expect(fetchMock).toHaveBeenCalledWith("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imei: "123" }),
    })
  })

  it("sends no body or content type when there is nothing to send", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetchMock)

    await apiSend("/api/devices/1", "DELETE")

    const [, init] = fetchMock.mock.calls[0]
    expect(init.body).toBeUndefined()
    expect(init.headers).toBeUndefined()
  })
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
