import { describe, it, expect, vi, afterEach } from "vitest"

// Flags are read once at module load, so each test re-imports the module
// under a fresh environment.
async function loadFlags() {
  vi.resetModules()
  return (await import("@/lib/flags")).flags
}

describe("flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("defaults to off when the env var is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_API_DEBUG", "")
    const flags = await loadFlags()
    expect(flags.apiDebug).toBe(false)
  })

  it("enables only on the exact string 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_API_DEBUG", "true")
    expect((await loadFlags()).apiDebug).toBe(true)

    vi.stubEnv("NEXT_PUBLIC_FLAG_API_DEBUG", "yes")
    expect((await loadFlags()).apiDebug).toBe(false)
  })
})
