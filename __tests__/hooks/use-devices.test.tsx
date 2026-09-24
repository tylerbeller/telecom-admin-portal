import { renderHook, waitFor, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useDevices, type Device } from "@/hooks/use-devices"

const device: Device = {
  id: 1,
  imei: "356938035643809",
  model: "Pixel 9",
  sim_number: "8901260123456789",
  customer_id: 4,
  customer_name: "Teresa Gray",
  status: "ASSIGNED",
  assigned_at: null,
  created_at: null,
}

function pagedResponse(content: Device[], overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      content,
      page: 0,
      totalPages: 1,
      totalElements: content.length,
      hasNext: false,
      ...overrides,
    }),
  } as Response
}

function lastUrl() {
  const calls = vi.mocked(fetch).mock.calls
  return calls[calls.length - 1][0] as string
}

describe("useDevices", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(pagedResponse([device])))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("loads the first page and exposes paging metadata", async () => {
    const { result } = renderHook(() => useDevices())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(lastUrl()).toBe("/api/devices?page=0&size=20")
    expect(result.current.devices).toEqual([device])
    expect(result.current.totalElements).toBe(1)
    expect(result.current.page).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it("forwards search and status filters", async () => {
    const { result } = renderHook(() => useDevices({ search: "pixel", status: "ASSIGNED" }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(lastUrl()).toBe("/api/devices?search=pixel&status=ASSIGNED&page=0&size=20")
  })

  it("omits filters that are not set", async () => {
    const { result } = renderHook(() => useDevices({ search: null, status: null }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(lastUrl()).toBe("/api/devices?page=0&size=20")
  })

  it("requests the next page without losing the filters", async () => {
    const { result } = renderHook(() => useDevices({ status: "AVAILABLE" }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      result.current.goToPage(2)
    })

    expect(lastUrl()).toBe("/api/devices?status=AVAILABLE&page=2&size=20")
  })

  it("surfaces the backend error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid value", message: "'X' is not a valid value" }),
      } as Response)
    )

    const { result } = renderHook(() => useDevices())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe("'X' is not a valid value")
    expect(result.current.devices).toEqual([])
  })

  it("reloads the current page after a delete", async () => {
    const { result } = renderHook(() => useDevices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const callsBefore = vi.mocked(fetch).mock.calls.length

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => null,
    } as Response)

    await act(async () => {
      await result.current.deleteDevice(1)
    })

    // one DELETE plus the refetch of the page on screen
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore + 2)
    expect(lastUrl()).toBe("/api/devices?page=0&size=20")
  })

  it("aborts the in-flight request when filters change", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort")
    const { result, rerender } = renderHook(
      ({ search }: { search: string }) => useDevices({ search }),
      {
        initialProps: { search: "a" },
      }
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    rerender({ search: "ab" })
    await waitFor(() => expect(lastUrl()).toContain("search=ab"))

    expect(abortSpy).toHaveBeenCalled()
    abortSpy.mockRestore()
  })
})
