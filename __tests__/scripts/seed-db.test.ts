import { describe, expect, it, vi } from "vitest"

import { resolvePython } from "@/scripts/seed-db.mjs"

describe("resolvePython", () => {
  it("skips an interpreter alias that exits unsuccessfully", () => {
    const probe = vi.fn((command: string) => command === "python")

    expect(resolvePython({ exists: () => false, probe })).toBe("python")
    expect(probe).toHaveBeenCalledWith("python3")
    expect(probe).toHaveBeenCalledWith("python")
  })
})
