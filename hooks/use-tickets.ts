"use client"

import { useCallback } from "react"
import { apiSend } from "@/lib/api"
import { createLogger } from "@/lib/logger"
import { useInfiniteResource } from "@/hooks/use-infinite-resource"

const log = createLogger("useTickets")

export interface Ticket {
  id: number
  customer_id: number
  customer_name: string
  subject: string
  description: string | null
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  created_at: string | null
  resolved_at: string | null
}

export interface TicketFilters {
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null
  status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | null
  customerId?: number | null
  search?: string | null
  dateFrom?: string | null
  dateTo?: string | null
}

export interface TicketCreate {
  customerId: number
  subject: string
  description: string
  priority: string
}

export interface TicketUpdate {
  customerId: number
  subject: string
  description: string
  priority?: string
  status?: string
}

const PAGE_SIZE = 50

export function useTickets(filters: TicketFilters = {}) {
  const {
    items: tickets,
    setItems: setTickets,
    loading,
    loadingMore,
    error,
    hasNext,
    totalElements,
    loadMore,
    refresh,
  } = useInfiniteResource<Ticket>({
    path: "/api/tickets",
    pageSize: PAGE_SIZE,
    params: {
      priority: filters.priority,
      status: filters.status,
      customerId: filters.customerId,
      search: filters.search,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    },
    errorMessage: "Failed to fetch tickets",
  })

  const createTicket = useCallback(
    async (ticket: TicketCreate) => {
      log.info({ customerId: ticket.customerId }, "Creating ticket")
      const newTicket = await apiSend<Ticket>("/api/tickets", "POST", ticket, {
        errorMessage: "Failed to create ticket",
      })
      log.info({ ticketId: newTicket.id }, "Ticket created")
      await refresh()
      return newTicket
    },
    [refresh]
  )

  const updateTicket = useCallback(
    async (id: number, ticket: TicketUpdate) => {
      log.info({ ticketId: id }, "Updating ticket")
      const updated = await apiSend<Ticket>(`/api/tickets/${id}`, "PUT", ticket, {
        errorMessage: "Failed to update ticket",
      })
      log.info({ ticketId: id, status: updated.status }, "Ticket updated")
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)))
      return updated
    },
    [setTickets]
  )

  const deleteTicket = useCallback(
    async (id: number) => {
      log.info({ ticketId: id }, "Deleting ticket")
      await apiSend<void>(`/api/tickets/${id}`, "DELETE", undefined, {
        errorMessage: "Failed to delete ticket",
      })
      log.info({ ticketId: id }, "Ticket deleted")
      setTickets((prev) => prev.filter((t) => t.id !== id))
    },
    [setTickets]
  )

  return {
    tickets,
    loading,
    loadingMore,
    error,
    hasNext,
    totalElements,
    loadMore,
    refresh,
    createTicket,
    updateTicket,
    deleteTicket,
  }
}
