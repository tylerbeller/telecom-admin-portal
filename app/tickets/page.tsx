"use client"

import { useState, useRef } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, X, Loader2 } from "lucide-react"
import { HealthStatus } from "@/components/health-status"
import { TicketsTable } from "@/components/tickets-table"
import { TicketFormDialog } from "@/components/ticket-form-dialog"
import {
  useTickets,
  type Ticket,
  type TicketFilters,
  type TicketCreate,
  type TicketUpdate,
} from "@/hooks/use-tickets"
import type { Customer } from "@/hooks/use-customers"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

export default function TicketsPage() {
  const [filters, setFilters] = useState<TicketFilters>({})
  const debouncedCustomerId = useDebouncedValue(filters.customerId, 300)
  const debouncedSearch = useDebouncedValue(filters.search, 300)
  const debouncedDateFrom = useDebouncedValue(filters.dateFrom, 300)
  const debouncedDateTo = useDebouncedValue(filters.dateTo, 300)
  const {
    tickets,
    loading,
    loadingMore,
    error,
    hasNext,
    totalElements,
    loadMore,
    createTicket,
    updateTicket,
    deleteTicket,
  } = useTickets({
    ...filters,
    customerId: debouncedCustomerId,
    search: debouncedSearch,
    dateFrom: debouncedDateFrom,
    dateTo: debouncedDateTo,
  })
  const scrollRef = useRef<HTMLDivElement>(null)

  useInfiniteScroll({
    scrollRef,
    loadMore,
    hasNext,
    loading: loadingMore,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null)
  const [customerAccount, setCustomerAccount] = useState<Customer | null>(null)
  const [customerLookupError, setCustomerLookupError] = useState<string | null>(null)
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false)
  const [ticketLookupId, setTicketLookupId] = useState("")
  const [ticketLookupResult, setTicketLookupResult] = useState<Ticket | null>(null)
  const [ticketLookupError, setTicketLookupError] = useState<string | null>(null)
  const [lookingUpTicket, setLookingUpTicket] = useState(false)

  const clearFilters = () => {
    setFilters({})
    setCustomerAccount(null)
    setCustomerLookupError(null)
    setTicketLookupId("")
    setTicketLookupResult(null)
    setTicketLookupError(null)
  }
  const hasActiveFilters =
    filters.priority ||
    filters.status ||
    filters.customerId ||
    filters.search ||
    filters.dateFrom ||
    filters.dateTo ||
    ticketLookupId

  const handleAdd = () => {
    setEditingTicket(null)
    setFormOpen(true)
  }

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket)
    setFormOpen(true)
  }

  const handleDeleteClick = (ticket: Ticket) => {
    setTicketToDelete(ticket)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (ticketToDelete) {
      await deleteTicket(ticketToDelete.id)
      setDeleteDialogOpen(false)
      setTicketToDelete(null)
    }
  }

  const lookUpCustomer = async () => {
    if (!filters.customerId || filters.customerId <= 0) {
      setCustomerAccount(null)
      setCustomerLookupError("Enter a valid customer ID.")
      return
    }

    setLookingUpCustomer(true)
    setCustomerLookupError(null)
    try {
      const customer = await apiFetch<Customer>(`/api/customers/${filters.customerId}`, {
        errorMessage: "Customer account not found.",
      })
      setCustomerAccount(customer)
    } catch (error) {
      setCustomerAccount(null)
      setCustomerLookupError(error instanceof Error ? error.message : "Customer account not found.")
    } finally {
      setLookingUpCustomer(false)
    }
  }

  const lookUpTicket = async () => {
    const id = Number(ticketLookupId)
    if (!ticketLookupId.trim() || !Number.isInteger(id) || id <= 0) {
      setTicketLookupResult(null)
      setTicketLookupError("Enter a valid ticket ID.")
      return
    }

    setLookingUpTicket(true)
    setTicketLookupError(null)
    try {
      const ticket = await apiFetch<Ticket>(`/api/tickets/${id}`, {
        errorMessage: "Ticket not found.",
      })
      setTicketLookupResult(ticket)
    } catch (error) {
      setTicketLookupResult(null)
      setTicketLookupError(error instanceof Error ? error.message : "Ticket not found.")
    } finally {
      setLookingUpTicket(false)
    }
  }

  const handleFormSubmit = async (data: TicketCreate | TicketUpdate) => {
    if (editingTicket) {
      await updateTicket(editingTicket.id, data as TicketUpdate)
    } else {
      await createTicket(data as TicketCreate)
    }
  }

  return (
    <SidebarProvider className="h-svh">
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex flex-1 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Support Tickets</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <HealthStatus />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
          <Card className="flex flex-1 flex-col overflow-hidden">
            <CardHeader className="shrink-0 space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-headline-2">Support Tickets</CardTitle>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-sm">
                    {loading
                      ? "Loading..."
                      : `${(tickets?.length ?? 0).toLocaleString()} of ${(totalElements ?? 0).toLocaleString()} tickets`}
                  </span>
                  <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Ticket
                  </Button>
                </div>
              </div>
              <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="priority-filter">Priority</Label>
                  <Select
                    value={filters.priority || "all"}
                    onValueChange={(v: string) =>
                      setFilters((f) => ({
                        ...f,
                        priority: v === "all" ? null : (v as TicketFilters["priority"]),
                      }))
                    }
                  >
                    <SelectTrigger id="priority-filter" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(v: string) =>
                      setFilters((f) => ({
                        ...f,
                        status: v === "all" ? null : (v as TicketFilters["status"]),
                      }))
                    }
                  >
                    <SelectTrigger id="status-filter" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="customer-filter">Customer ID</Label>
                  <div className="flex h-9 min-w-0 gap-2">
                    <Input
                      id="customer-filter"
                      type="number"
                      min={1}
                      placeholder="Any"
                      className="h-9 min-w-0 flex-1"
                      value={filters.customerId || ""}
                      onChange={(e) => {
                        setCustomerAccount(null)
                        setCustomerLookupError(null)
                        setFilters((f) => ({
                          ...f,
                          customerId: e.target.value ? Number(e.target.value) : null,
                        }))
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          void lookUpCustomer()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={lookUpCustomer}
                      disabled={lookingUpCustomer}
                    >
                      {lookingUpCustomer ? "Looking up..." : "Look up"}
                    </Button>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="ticket-filter">Ticket ID</Label>
                  <div className="flex h-9 min-w-0 gap-2">
                    <Input
                      id="ticket-filter"
                      type="number"
                      min={1}
                      placeholder="Any"
                      className="h-9 min-w-0 flex-1"
                      value={ticketLookupId}
                      onChange={(e) => {
                        setTicketLookupResult(null)
                        setTicketLookupError(null)
                        setTicketLookupId(e.target.value)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          void lookUpTicket()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={lookUpTicket}
                      disabled={lookingUpTicket}
                    >
                      {lookingUpTicket ? "Looking up..." : "Look up ticket"}
                    </Button>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="customer-name-filter">Customer name</Label>
                  <Input
                    id="customer-name-filter"
                    type="search"
                    placeholder="Any name"
                    className="h-9 w-full"
                    value={filters.search || ""}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        search: e.target.value || null,
                      }))
                    }
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-sm font-medium">Created date</span>
                  <div className="flex min-w-0 gap-2">
                    <Input
                      id="date-from-filter"
                      type="date"
                      aria-label="From date"
                      className="h-9 min-w-0 flex-1 px-2"
                      value={filters.dateFrom || ""}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          dateFrom: e.target.value || null,
                        }))
                      }
                    />
                    <Input
                      id="date-to-filter"
                      type="date"
                      aria-label="To date"
                      className="h-9 min-w-0 flex-1 px-2"
                      value={filters.dateTo || ""}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          dateTo: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="flex min-h-5 items-center justify-between gap-4 text-xs">
                <div className="min-w-0">
                  {customerAccount && (
                    <p className="text-muted-foreground truncate" role="status">
                      Account: {customerAccount.first_name} {customerAccount.last_name} ·{" "}
                      {customerAccount.email}
                    </p>
                  )}
                  {customerLookupError && (
                    <p className="text-destructive" role="alert">
                      {customerLookupError}
                    </p>
                  )}
                  {!customerAccount && !customerLookupError && (
                    <p className="text-muted-foreground">
                      Click Look up or press Enter to retrieve an account.
                    </p>
                  )}
                  {ticketLookupResult && (
                    <p className="text-muted-foreground truncate" role="status">
                      Ticket #{ticketLookupResult.id}: {ticketLookupResult.subject} ·{" "}
                      {ticketLookupResult.customer_name}
                    </p>
                  )}
                  {ticketLookupError && (
                    <p className="text-destructive" role="alert">
                      {ticketLookupError}
                    </p>
                  )}
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="shrink-0" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Clear filters
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div ref={scrollRef} className="h-full overflow-auto">
                {loading ? (
                  <div className="text-muted-foreground flex h-full items-center justify-center">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Loading...
                  </div>
                ) : error ? (
                  <div className="py-8 text-center text-red-500">{error}</div>
                ) : (
                  <>
                    <TicketsTable
                      tickets={tickets}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                    />
                    {loadingMore && (
                      <div className="text-muted-foreground flex items-center justify-center py-4">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading more...
                      </div>
                    )}
                    {!hasNext && tickets.length > 0 && (
                      <div className="text-muted-foreground py-4 text-center text-sm">
                        End of results
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <TicketFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          ticket={editingTicket}
          onSubmit={handleFormSubmit}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{ticketToDelete?.subject}&quot;? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
