import { describe, it, expect, vi, afterEach } from "vitest"

// The apiDebug flag turns on per-attempt request logging in the API client.
vi.mock("@/lib/flags", () => ({ flags: { apiDebug: true } }))
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  },
}))

import { apiFetch } from "@/lib/api"
import { logger } from "@/lib/logger"

function ok(body: unknown = {}) {
  return { ok: true, status: 200, json: async () => body } as Response
}

describe("apiDebug flag", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("logs per-attempt timing on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ id: 1 })))

    await apiFetch("/api/x")

    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/x", method: "GET", attempt: 1 }),
      "api request ok"
    )
  })

  it("logs before each retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 503, json: async () => null })
        .mockResolvedValueOnce(ok())
    )

    await apiFetch("/api/x")

    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/x", attempt: 1 }),
      "api request retrying"
    )
  })
})
