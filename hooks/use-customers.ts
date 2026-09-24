"use client"

import { useCallback } from "react"
import { apiSend } from "@/lib/api"
import { usePagedResource } from "@/hooks/use-paged-resource"

export interface Customer {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  plan_id: number | null
  plan_name: string | null
  status: "ACTIVE" | "SUSPENDED" | "CANCELLED"
  balance: number
  activated_at: string | null
  created_at: string | null
}

export type CustomerStatus = Customer["status"]
export type CustomerSort =
  | "NAME_ASC"
  | "NAME_DESC"
  | "PLAN_ASC"
  | "PLAN_DESC"
  | "STATUS_ASC"
  | "STATUS_DESC"
  | "BALANCE_ASC"
  | "BALANCE_DESC"

export interface CustomerCreate {
  firstName: string
  lastName: string
  email: string
  phone: string
  planId: number
  balance?: number
}

export interface CustomerUpdate extends Omit<CustomerCreate, "planId"> {
  planId?: number
  status?: string
}

export interface CustomerFilters {
  search?: string | null
  status?: CustomerStatus | null
  sort?: CustomerSort | null
}

const PAGE_SIZE = 20

export function useCustomers(filters: CustomerFilters = {}) {
  const {
    items: customers,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    fetchPage,
    goToPage,
    refetch,
  } = usePagedResource<Customer>({
    path: "/api/customers",
    pageSize: PAGE_SIZE,
    params: { search: filters.search, status: filters.status, sort: filters.sort },
    errorMessage: "Failed to fetch customers",
  })

  const createCustomer = useCallback(
    async (customer: CustomerCreate) => {
      const created = await apiSend<Customer>("/api/customers", "POST", customer, {
        errorMessage: "Failed to create customer",
      })
      await refetch()
      return created
    },
    [refetch]
  )

  const updateCustomer = useCallback(
    async (id: number, customer: CustomerUpdate) => {
      const updated = await apiSend<Customer>(`/api/customers/${id}`, "PUT", customer, {
        errorMessage: "Failed to update customer",
      })
      await refetch()
      return updated
    },
    [refetch]
  )

  const deleteCustomer = useCallback(
    async (id: number) => {
      await apiSend<void>(`/api/customers/${id}`, "DELETE", undefined, {
        errorMessage: "Failed to delete customer",
      })
      await refetch()
    },
    [refetch]
  )

  return {
    customers,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    fetchCustomers: fetchPage,
    goToPage,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  }
}
