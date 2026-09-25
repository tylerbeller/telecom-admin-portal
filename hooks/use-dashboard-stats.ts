"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { apiFetch, isAbortError } from "@/lib/api"

export interface DashboardStats {
  active_customers: number
  monthly_revenue: number
  open_tickets: number
  devices_in_use: number
}

export interface ChartData {
  name: string
  value: number
}

export interface RevenueData {
  name: string
  revenue: number
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [customersByPlan, setCustomersByPlan] = useState<ChartData[]>([])
  const [devicesByStatus, setDevicesByStatus] = useState<ChartData[]>([])
  const [ticketsByStatus, setTicketsByStatus] = useState<ChartData[]>([])
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchStats = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    try {
      setLoading(true)
      // Every panel is required, so a failure in any of them surfaces as an
      // error instead of leaving a chart silently empty.
      const [statsData, byPlan, byDeviceStatus, byTicketStatus, revenue] = await Promise.all([
        apiFetch<DashboardStats>("/api/dashboard/stats", {
          signal,
          errorMessage: "Failed to fetch stats",
        }),
        apiFetch<ChartData[]>("/api/dashboard/customers-by-plan", {
          signal,
          errorMessage: "Failed to fetch customers by plan",
        }),
        apiFetch<ChartData[]>("/api/dashboard/devices-by-status", {
          signal,
          errorMessage: "Failed to fetch devices by status",
        }),
        apiFetch<ChartData[]>("/api/dashboard/tickets-by-status", {
          signal,
          errorMessage: "Failed to fetch tickets by status",
        }),
        apiFetch<RevenueData[]>("/api/dashboard/revenue-by-plan", {
          signal,
          errorMessage: "Failed to fetch revenue by plan",
        }),
      ])

      setStats(statsData)
      setCustomersByPlan(byPlan ?? [])
      setDevicesByStatus(byDeviceStatus ?? [])
      setTicketsByStatus(byTicketStatus ?? [])
      setRevenueByPlan(revenue ?? [])
      setError(null)
    } catch (e) {
      if (isAbortError(e)) return
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    []
  )

  return {
    stats,
    customersByPlan,
    devicesByStatus,
    ticketsByStatus,
    revenueByPlan,
    loading,
    error,
    fetchStats,
  }
}
