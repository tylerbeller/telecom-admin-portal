import { test, expect } from "@playwright/test"

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080"

test.describe("Support Tickets Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tickets")
  })

  test("should filter tickets by customer name and date range", async ({ page }) => {
    await page.waitForSelector("table tbody tr")
    const ticketsResponse = await page.request.get(`${backendUrl}/api/tickets?page=0&size=1`)
    const ticketsData = await ticketsResponse.json()
    const ticketDate = ticketsData.content[0].created_at.slice(0, 10)
    const customerName = await page
      .locator("table tbody tr")
      .first()
      .locator("td")
      .nth(2)
      .innerText()
    const firstName = customerName.split(" ")[0]

    const filtered = page.waitForResponse(
      (response) =>
        response.url().includes(`search=${firstName}`) &&
        response.url().includes(`dateFrom=${ticketDate}`) &&
        response.url().includes(`dateTo=${ticketDate}`) &&
        response.status() === 200
    )
    await page.getByLabel("Customer name").fill(firstName)
    await page.getByLabel("From date").fill(ticketDate)
    await page.getByLabel("To date").fill(ticketDate)
    await filtered

    await expect(page.locator("table tbody tr").first()).toBeVisible()
    await expect(page.locator("table")).toContainText(firstName)
  })

  test("should look up a manually entered customer ID before creating a ticket", async ({
    page,
    request,
  }) => {
    const response = await request.get(`${backendUrl}/api/tickets?page=0&size=1`)
    const data = await response.json()
    const ticket = data.content[0]

    await page.getByRole("button", { name: "Create Ticket" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Customer ID").fill(String(ticket.customer_id))

    const customerResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/customers/${ticket.customer_id}`) && response.status() === 200
    )
    await dialog.getByRole("button", { name: "Look up account" }).click()
    await customerResponse

    await expect(page.getByRole("status")).toContainText(`Account found: ${ticket.customer_name}`)
    await expect(dialog.getByRole("button", { name: "Create Ticket" })).toBeEnabled()
  })

  test("should save an edited ticket", async ({ page }) => {
    await page.waitForSelector("table tbody tr")
    const firstRow = page.locator("table tbody tr").first()
    const ticketId = await firstRow.locator("td").first().innerText()
    const updatedSubject = `Updated ticket ${Date.now()}`

    await firstRow.getByRole("button", { name: `Edit ticket ${ticketId}` }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("Subject").fill(updatedSubject)
    const updateResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/tickets/${ticketId}`) &&
        response.request().method() === "PUT" &&
        response.status() === 200
    )
    await dialog.getByRole("button", { name: "Save Changes" }).click()
    await updateResponse

    await expect(dialog).toHaveCount(0)
    await expect(page.locator("table")).toContainText(updatedSubject)
  })

  test("should retrieve an account from the ticket-list customer ID field", async ({ page }) => {
    await page.waitForSelector("table tbody tr")
    const firstRow = page.locator("table tbody tr").first()
    const customerId = await firstRow.locator("td").nth(1).innerText()
    const customerName = await firstRow.locator("td").nth(2).innerText()

    await page.getByLabel("Customer ID").fill(customerId)
    const customerResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/customers/${customerId}`) && response.status() === 200
    )
    await page.getByRole("button", { name: "Look up", exact: true }).click()
    await customerResponse

    await expect(page.getByText(`Account: ${customerName}`, { exact: false })).toBeVisible()
  })

  test("should show a validation error for an invalid customer ID", async ({ page }) => {
    await page.getByLabel("Customer ID").fill("-1")
    await page.getByRole("button", { name: "Look up", exact: true }).click()

    await expect(page.getByText("Enter a valid customer ID.", { exact: true })).toBeVisible()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })

  test("should show a not-found error for an unknown customer ID", async ({ page }) => {
    const customerResponse = page.waitForResponse(
      (response) => response.url().includes("/api/customers/999999999") && response.status() === 404
    )

    await page.getByLabel("Customer ID").fill("999999999")
    await page.getByRole("button", { name: "Look up", exact: true }).click()
    await customerResponse

    await expect(page.getByText("Customer account not found.", { exact: true })).toBeVisible()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })

  test("should retrieve a ticket from the ticket ID lookup field", async ({ page }) => {
    await page.waitForSelector("table tbody tr")
    const firstRow = page.locator("table tbody tr").first()
    const ticketId = await firstRow.locator("td").first().innerText()

    await page.getByLabel("Ticket ID").fill(ticketId)
    const ticketResponse = page.waitForResponse(
      (response) => response.url().includes(`/api/tickets/${ticketId}`) && response.status() === 200
    )
    await page.getByRole("button", { name: "Look up ticket" }).click()
    const response = await ticketResponse
    // Parallel tests edit the first row's subject, so assert against what this
    // lookup actually returned instead of a possibly stale table snapshot.
    const ticket = await response.json()

    await expect(
      page.getByText(`Ticket #${ticket.id}: ${ticket.subject}`, { exact: false })
    ).toBeVisible()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })

  test("should show a validation error for an invalid ticket ID", async ({ page }) => {
    await page.getByLabel("Ticket ID").fill("-1")
    await page.getByRole("button", { name: "Look up ticket" }).click()

    await expect(page.getByText("Enter a valid ticket ID.", { exact: true })).toBeVisible()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })

  test("should show a not-found error for an unknown ticket ID", async ({ page }) => {
    const ticketResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tickets/999999999") && response.status() === 404
    )

    await page.getByLabel("Ticket ID").fill("999999999")
    await page.getByRole("button", { name: "Look up ticket" }).click()
    await ticketResponse

    await expect(page.getByText("Ticket not found.", { exact: true })).toBeVisible()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })

  test("should require confirmation before deleting a ticket", async ({ page }) => {
    await page.waitForSelector("table tbody tr")
    const firstRow = page.locator("table tbody tr").first()
    const ticketId = await firstRow.locator("td").first().innerText()
    const subject = await firstRow.locator("td").nth(3).innerText()

    await firstRow.getByRole("button", { name: `Delete ticket ${ticketId}` }).click()

    const dialog = page.getByRole("alertdialog")
    await expect(dialog.getByRole("heading", { name: "Delete Ticket" })).toBeVisible()
    await expect(dialog).toContainText(subject)
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toHaveCount(0)
    await expect(firstRow).toBeVisible()
  })
})
