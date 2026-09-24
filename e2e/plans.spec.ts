import { test, expect } from "@playwright/test"

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080"

test.describe("Plans Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/plans")
  })

  test("should display plans table", async ({ page }) => {
    await expect(page.getByLabel("breadcrumb")).toBeVisible()

    const table = page.locator("table")
    await expect(table).toBeVisible()
  })

  test("should load plans from API", async ({ request }) => {
    const response = await request.get(`${backendUrl}/api/plans?page=0&size=20`)
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data)).toBeTruthy()
  })

  test("should display plan details including price", async ({ page }) => {
    await page.waitForSelector("table tbody tr", { timeout: 10000 })
    const rows = page.locator("table tbody tr")
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)

    const priceCell = page.locator("table tbody tr td").filter({ hasText: "$" })
    const priceCount = await priceCell.count()
    expect(priceCount).toBeGreaterThan(0)
  })
})
