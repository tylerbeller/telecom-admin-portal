"use client"

import { useCallback } from "react"
import { apiSend } from "@/lib/api"
import { usePagedResource } from "@/hooks/use-paged-resource"

export interface Device {
  id: number
  imei: string
  model: string
  sim_number: string
  customer_id: number | null
  customer_name: string | null
  status: "AVAILABLE" | "ASSIGNED" | "LOST" | "DAMAGED"
  assigned_at: string | null
  created_at: string | null
}

export type DeviceStatus = Device["status"]

export interface DeviceCreate {
  imei: string
  model: string
  simNumber: string
  customerId?: number | null
}

export interface DeviceUpdate extends DeviceCreate {
  status?: string
}

export interface DeviceFilters {
  search?: string | null
  status?: DeviceStatus | null
}

const PAGE_SIZE = 20

export function useDevices(filters: DeviceFilters = {}) {
  const {
    items: devices,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    fetchPage,
    goToPage,
    refetch,
  } = usePagedResource<Device>({
    path: "/api/devices",
    pageSize: PAGE_SIZE,
    params: { search: filters.search, status: filters.status },
    errorMessage: "Failed to fetch devices",
  })

  const createDevice = useCallback(
    async (device: DeviceCreate) => {
      const created = await apiSend<Device>("/api/devices", "POST", device, {
        errorMessage: "Failed to create device",
      })
      await refetch()
      return created
    },
    [refetch]
  )

  const updateDevice = useCallback(
    async (id: number, device: DeviceUpdate) => {
      const updated = await apiSend<Device>(`/api/devices/${id}`, "PUT", device, {
        errorMessage: "Failed to update device",
      })
      await refetch()
      return updated
    },
    [refetch]
  )

  const deleteDevice = useCallback(
    async (id: number) => {
      await apiSend<void>(`/api/devices/${id}`, "DELETE", undefined, {
        errorMessage: "Failed to delete device",
      })
      await refetch()
    },
    [refetch]
  )

  return {
    devices,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    fetchDevices: fetchPage,
    goToPage,
    createDevice,
    updateDevice,
    deleteDevice,
  }
}
