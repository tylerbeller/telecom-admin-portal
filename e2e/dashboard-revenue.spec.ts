import { test, expect, type APIRequestContext } from "@playwright/test"

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080"

interface ApiCustomer {
  status: string
  plan_name: string | null
}

interface ApiPlan {
  name: string
  monthly_price: number
}

interface PagedCustomers {
  content: ApiCustomer[]
  hasNext: boolean
}

/** Collects every customer by walking the paginated customers API. */
async function fetchAllCustomers(request: APIRequestContext): Promise<ApiCustomer[]> {
  const customers: ApiCustomer[] = []
  let page = 0
  let hasNext = true
  while (hasNext) {
    const response = await request.get(`${backendUrl}/api/customers?page=${page}&size=100`)
    expect(response.ok()).toBeTruthy()
    const data: PagedCustomers = await response.json()
    customers.push(...data.content)
    hasNext = data.hasNext
    page += 1
  }
  return customers
}

/**
 * Cross-checks the dashboard aggregates against the raw customer and plan lists.
 * The seeded database contains suspended and cancelled subscribers, so any
 * aggregation that forgets to filter on ACTIVE shows up here as a mismatch.
 */
test.describe("Dashboard revenue aggregates", () => {
  test("monthly revenue counts only active subscribers", async ({ request }) => {
    const [statsRes, plansRes, customers] = await Promise.all([
      request.get(`${backendUrl}/api/dashboard/stats`),
      request.get(`${backendUrl}/api/plans`),
      fetchAllCustomers(request),
    ])
    expect(statsRes.ok()).toBeTruthy()
    expect(plansRes.ok()).toBeTruthy()

    const stats = await statsRes.json()
    const plans: ApiPlan[] = await plansRes.json()

    const priceByPlan = new Map(plans.map((p) => [p.name, p.monthly_price]))
    const expected = customers
      .filter((c) => c.status === "ACTIVE" && c.plan_name !== null)
      .reduce((sum, c) => sum + (priceByPlan.get(c.plan_name as string) ?? 0), 0)

    expect(Number(stats.monthly_revenue)).toBeCloseTo(expected, 2)
  })

  test("active customer count matches the customer list", async ({ request }) => {
    const [statsRes, customers] = await Promise.all([
      request.get(`${backendUrl}/api/dashboard/stats`),
      fetchAllCustomers(request),
    ])

    const stats = await statsRes.json()
    const activeCount = customers.filter((c) => c.status === "ACTIVE").length

    expect(stats.active_customers).toBe(activeCount)
  })

  test("revenue by plan excludes plans with no active subscribers", async ({ request }) => {
    const [revenueRes, customers] = await Promise.all([
      request.get(`${backendUrl}/api/dashboard/revenue-by-plan`),
      fetchAllCustomers(request),
    ])

    const revenue: { name: string; revenue: number }[] = await revenueRes.json()
    const plansWithActive = new Set(
      customers.filter((c) => c.status === "ACTIVE").map((c) => c.plan_name)
    )

    for (const row of revenue) {
      expect(plansWithActive.has(row.name)).toBeTruthy()
    }
  })
})
