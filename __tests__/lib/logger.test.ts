import { describe, it, expect, vi, afterEach } from "vitest"
import { logger, createLogger } from "@/lib/logger"

describe("logger redaction", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("redacts sensitive field names wholesale", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    logger.error({ email: "ada@example.com", sim_number: "8901260", ticketId: 42 }, "update failed")

    const output = spy.mock.calls[0][1] as Record<string, unknown>
    expect(output.email).toBe("[redacted]")
    expect(output.sim_number).toBe("[redacted]")
    expect(output.ticketId).toBe(42)
  })

  it("scrubs email-shaped and long-number-shaped strings in values", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    logger.error({ note: "call ada@example.com or 555010012345678" })

    const output = spy.mock.calls[0][1] as Record<string, unknown>
    expect(output.note).toBe("call [redacted-email] or [redacted-number]")
  })

  it("redacts nested objects but keeps non-sensitive values intact", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    logger.error({ customer: { name: "Ada", phone: "555-0100" }, status: 500 })

    const output = spy.mock.calls[0][1] as { customer: Record<string, unknown>; status: number }
    expect(output.customer.name).toBe("Ada")
    expect(output.customer.phone).toBe("[redacted]")
    expect(output.status).toBe(500)
  })

  it("warns through console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})

    logger.warn({ ticketId: 7 }, "slow response")

    expect(spy).toHaveBeenCalled()
    expect(spy.mock.calls[0][0]).toContain("slow response")
  })

  it("suppresses debug and info outside development", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})

    logger.debug({ a: 1 }, "hidden")
    logger.info({ b: 2 }, "also hidden")

    expect(debugSpy).not.toHaveBeenCalled()
    expect(infoSpy).not.toHaveBeenCalled()
  })

  it("prefixes child logger output with its context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    createLogger("billing").error({}, "charge failed")

    expect(spy.mock.calls[0][0]).toContain("[billing]")
  })
})
