import { test, expect } from "@playwright/test"

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080"

test.describe("Devices Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/devices")
  })

  test("should display the device inventory table", async ({ page }) => {
    await expect(page.getByLabel("breadcrumb")).toBeVisible()
    await expect(page.locator("table")).toBeVisible()
    await page.waitForSelector("table tbody tr")
    expect(await page.locator("table tbody tr").count()).toBeGreaterThan(0)
  })

  test("should load devices from the paginated API", async ({ request }) => {
    const response = await request.get(`${backendUrl}/api/devices?page=0&size=20`)
    expect(response.status()).toBe(200)
    const data = await response.json()

    expect(Array.isArray(data.content)).toBeTruthy()
    expect(data.totalElements).toBeGreaterThan(0)
    // a page must not return the whole table
    expect(data.content.length).toBeLessThanOrEqual(20)
  })

  test("should filter devices by status", async ({ page }) => {
    await page.waitForSelector("table tbody tr")

    await page.getByLabel("Filter by status").click()
    const filtered = page.waitForResponse(
      (response) => response.url().includes("status=AVAILABLE") && response.status() === 200
    )
    await page.getByRole("option", { name: "AVAILABLE" }).click()
    await filtered

    await page.waitForSelector("table tbody tr")
    const statuses = await page.$$eval("table tbody tr", (rows) => [
      ...new Set(rows.map((row) => row.textContent?.match(/AVAILABLE|ASSIGNED|LOST|DAMAGED/)?.[0])),
    ])
    expect(statuses).toEqual(["AVAILABLE"])
  })

  test("should filter devices by search", async ({ page }) => {
    await page.waitForSelector("table tbody tr")
    // columns are ID, IMEI, Model, SIM Number, ... so the IMEI is the second cell
    const firstImei = await page.locator("table tbody tr").first().locator("td").nth(1).innerText()

    await page.getByLabel("Search devices").fill(firstImei)
    await page.waitForResponse(
      (response) => response.url().includes("search=") && response.status() === 200
    )

    await expect(page.locator("table tbody tr")).toHaveCount(1)
  })

  test("should reject an unknown status with a 400", async ({ request }) => {
    const response = await request.get(`${backendUrl}/api/devices?status=NOT_A_STATUS`)
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toBeTruthy()
  })

  test("should page through the inventory", async ({ page }) => {
    await page.waitForSelector("table tbody tr")
    const firstCellPageOne = await page.locator("table tbody tr td").first().innerText()

    const nextPage = page.waitForResponse(
      (response) => response.url().includes("page=1") && response.status() === 200
    )
    await page.getByRole("button", { name: "Next", exact: true }).click()
    await nextPage

    await page.waitForSelector("table tbody tr")
    const firstCellPageTwo = await page.locator("table tbody tr td").first().innerText()
    expect(firstCellPageTwo).not.toBe(firstCellPageOne)
  })
})
