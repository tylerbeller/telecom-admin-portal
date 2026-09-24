"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { apiFetch, apiSend, isAbortError } from "@/lib/api"

export interface Plan {
  id: number
  name: string
  monthly_price: number
  data_limit_gb: number | null
  minutes_limit: number | null
  sms_limit: number | null
  is_active: boolean
}

export interface PlanCreate {
  name: string
  monthlyPrice: number
  dataLimitGb?: number | null
  minutesLimit?: number | null
  smsLimit?: number | null
}

export interface PlanUpdate extends PlanCreate {
  isActive?: boolean
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchPlans = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      setLoading(true)
      const data = await apiFetch<Plan[]>("/api/plans", {
        signal: controller.signal,
        errorMessage: "Failed to fetch plans",
      })
      setPlans(data ?? [])
      setError(null)
    } catch (e) {
      if (isAbortError(e)) return
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [])

  const createPlan = useCallback(async (plan: PlanCreate) => {
    const newPlan = await apiSend<Plan>("/api/plans", "POST", plan, {
      errorMessage: "Failed to create plan",
    })
    setPlans((prev) => [...prev, newPlan])
    return newPlan
  }, [])

  const updatePlan = useCallback(async (id: number, plan: PlanUpdate) => {
    const updated = await apiSend<Plan>(`/api/plans/${id}`, "PUT", plan, {
      errorMessage: "Failed to update plan",
    })
    setPlans((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }, [])

  const deletePlan = useCallback(async (id: number) => {
    await apiSend<void>(`/api/plans/${id}`, "DELETE", undefined, {
      errorMessage: "Failed to delete plan",
    })
    setPlans((prev) => prev.filter((p) => p.id !== id))
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    []
  )

  return {
    plans,
    loading,
    error,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
  }
}
