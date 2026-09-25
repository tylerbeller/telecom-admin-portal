"use client"

import { useInfiniteResource } from "@/hooks/use-infinite-resource"

export interface UsageRecord {
  id: number
  customer_id: number
  customer_name: string
  type: "CALL" | "DATA" | "SMS"
  quantity: number
  cost: number
  recorded_at: string | null
}

export interface UsageFilters {
  type?: "CALL" | "DATA" | "SMS" | null
  customerId?: number | null
  dateFrom?: string | null
  dateTo?: string | null
}

const PAGE_SIZE = 50

export function useUsage(filters: UsageFilters = {}) {
  const {
    items: records,
    loading,
    loadingMore,
    error,
    hasNext,
    totalElements,
    loadMore,
    refresh,
  } = useInfiniteResource<UsageRecord>({
    path: "/api/usage",
    pageSize: PAGE_SIZE,
    params: {
      type: filters.type,
      customerId: filters.customerId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    },
    errorMessage: "Failed to fetch usage records",
  })

  return {
    records,
    loading,
    loadingMore,
    error,
    hasNext,
    totalElements,
    loadMore,
    refresh,
  }
}
