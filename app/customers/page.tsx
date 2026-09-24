"use client"

import { useState } from "react"
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
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react"
import { HealthStatus } from "@/components/health-status"
import { CustomersTable } from "@/components/customers-table"
import { CustomerFormDialog } from "@/components/customer-form-dialog"
import {
  useCustomers,
  type Customer,
  type CustomerCreate,
  type CustomerSort,
  type CustomerStatus,
  type CustomerUpdate,
} from "@/hooks/use-customers"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { usePlans } from "@/hooks/use-plans"

const STATUS_OPTIONS = ["ALL", "ACTIVE", "SUSPENDED", "CANCELLED"] as const
type StatusFilter = (typeof STATUS_OPTIONS)[number]

const SORT_OPTIONS: { value: CustomerSort; label: string }[] = [
  { value: "NAME_ASC", label: "Name (A–Z)" },
  { value: "NAME_DESC", label: "Name (Z–A)" },
  { value: "PLAN_ASC", label: "Plan (A–Z)" },
  { value: "PLAN_DESC", label: "Plan (Z–A)" },
  { value: "STATUS_ASC", label: "Status (A–Z)" },
  { value: "STATUS_DESC", label: "Status (Z–A)" },
  { value: "BALANCE_ASC", label: "Balance (low to high)" },
  { value: "BALANCE_DESC", label: "Balance (high to low)" },
]

export default function CustomersPage() {
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [sort, setSort] = useState<CustomerSort>("NAME_ASC")
  const debouncedSearch = useDebouncedValue(searchInput.trim() || null, 300)

  const {
    customers,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    goToPage,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomers({
    search: debouncedSearch,
    status: statusFilter === "ALL" ? null : (statusFilter as CustomerStatus),
    sort,
  })
  const { plans } = usePlans()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)

  const handleAdd = () => {
    setEditingCustomer(null)
    setFormOpen(true)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormOpen(true)
  }

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (customerToDelete) {
      await deleteCustomer(customerToDelete.id)
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
    }
  }

  const handleFormSubmit = async (data: CustomerCreate | CustomerUpdate) => {
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, data as CustomerUpdate)
    } else {
      await createCustomer(data as CustomerCreate)
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
                  <BreadcrumbPage>Customers</BreadcrumbPage>
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
            <CardHeader className="flex shrink-0 flex-col items-stretch gap-4 space-y-0 pb-4">
              <div className="flex flex-row items-center justify-between">
                <CardTitle className="text-headline-2">Customers</CardTitle>
                <Button onClick={handleAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              </div>
              <div className="flex flex-row items-center gap-2">
                <div className="relative max-w-sm flex-1">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by name or email..."
                    className="pl-8"
                    aria-label="Search customers"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                >
                  <SelectTrigger className="w-[160px]" aria-label="Filter by status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status === "ALL" ? "All statuses" : status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(value) => setSort(value as CustomerSort)}>
                  <SelectTrigger className="w-[190px]" aria-label="Sort customers">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground ml-auto hidden text-sm sm:inline">
                  {totalElements} total
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {loading ? (
                <div className="text-muted-foreground py-8 text-center">Loading...</div>
              ) : error ? (
                <div className="py-8 text-center text-red-500">{error}</div>
              ) : (
                <div className="h-full overflow-auto">
                  <CustomersTable
                    customers={customers}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                </div>
              )}
            </CardContent>
            <div className="flex shrink-0 items-center justify-between border-t px-6 py-3">
              <span className="text-muted-foreground text-sm">
                {totalElements === 0
                  ? "No customers found"
                  : `Page ${page + 1} of ${Math.max(totalPages, 1)} · ${totalElements} customers`}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 0 || loading}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1 || loading}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <CustomerFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          customer={editingCustomer}
          plans={plans}
          onSubmit={handleFormSubmit}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {customerToDelete?.first_name}{" "}
                {customerToDelete?.last_name}? This action cannot be undone.
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
