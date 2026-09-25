import { test, expect } from "@playwright/test"

test.describe("Customers Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/customers")
  })

  test("should display customers table", async ({ page }) => {
    await expect(page.getByLabel("breadcrumb")).toBeVisible()

    const table = page.locator("table")
    await expect(table).toBeVisible()
  })

  test("should load customers from the paginated API", async ({ page }) => {
    const customersResponse = page.waitForResponse(
      (response) => response.url().includes("/api/customers") && response.status() === 200
    )
    await page.reload()
    const response = await customersResponse
    const data = await response.json()
    expect(Array.isArray(data.content)).toBeTruthy()
    expect(data.totalElements).toBeGreaterThan(0)
  })

  test("should display customer data in table rows", async ({ page }) => {
    await page.waitForSelector("table tbody tr", { timeout: 10000 })
    const rows = page.locator("table tbody tr")
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)
  })

  test("should filter customers by search", async ({ page }) => {
    await page.waitForSelector("table tbody tr")

    await page.getByLabel("Search customers").fill("danielle.johnson@yahoo.com")
    await page.waitForResponse(
      (response) => response.url().includes("search=") && response.status() === 200
    )

    await expect(page.locator("table tbody tr")).toHaveCount(1)
    await expect(page.locator("table")).toContainText("Danielle")
  })

  test("should sort customers using every sort option", async ({ page }) => {
    await page.waitForSelector("table tbody tr")

    const options = [
      ["NAME_DESC", "Name (Z–A)"],
      ["PLAN_ASC", "Plan (A–Z)"],
      ["PLAN_DESC", "Plan (Z–A)"],
      ["STATUS_ASC", "Status (A–Z)"],
      ["STATUS_DESC", "Status (Z–A)"],
      ["BALANCE_ASC", "Balance (low to high)"],
      ["BALANCE_DESC", "Balance (high to low)"],
    ] as const

    for (const [value, label] of options) {
      await page.getByLabel("Sort customers").click()
      const sorted = page.waitForResponse(
        (response) => response.url().includes(`sort=${value}`) && response.status() === 200
      )
      await page.getByRole("option", { name: label }).click()
      await sorted
      await expect(page.locator("table tbody tr").first()).toBeVisible()
    }
  })

  test("should have add customer button", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /add|new|create/i })
    await expect(addButton).toBeVisible()
  })
})
