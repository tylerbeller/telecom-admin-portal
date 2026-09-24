import { test, expect } from "@playwright/test"

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080"

test.describe("API Health", () => {
  test("backend health endpoint should respond", async ({ request }) => {
    const response = await request.get(`${backendUrl}/api/health`)
    expect(response.ok()).toBeTruthy()
  })

  test("customers API should respond", async ({ request }) => {
    const response = await request.get(`${backendUrl}/api/customers`)
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(Array.isArray(data.content)).toBeTruthy()
  })

  test("plans API should respond", async ({ request }) => {
    const response = await request.get(`${backendUrl}/api/plans`)
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(Array.isArray(data)).toBeTruthy()
  })

  test("devices API should respond", async ({ request }) => {
    const response = await request.get(`${backendUrl}/api/devices`)
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(Array.isArray(data.content)).toBeTruthy()
  })

  test("dashboard stats API should respond", async ({ request }) => {
    const response = await request.get(`${backendUrl}/api/dashboard/stats`)
    expect(response.ok()).toBeTruthy()
  })
})
