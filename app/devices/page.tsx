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
import { DevicesTable } from "@/components/devices-table"
import { DeviceFormDialog } from "@/components/device-form-dialog"
import {
  useDevices,
  type Device,
  type DeviceCreate,
  type DeviceStatus,
  type DeviceUpdate,
} from "@/hooks/use-devices"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

const STATUS_OPTIONS = ["ALL", "AVAILABLE", "ASSIGNED", "LOST", "DAMAGED"] as const
type StatusFilter = (typeof STATUS_OPTIONS)[number]

export default function DevicesPage() {
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const debouncedSearch = useDebouncedValue(searchInput.trim() || null, 300)

  const {
    devices,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    goToPage,
    createDevice,
    updateDevice,
    deleteDevice,
  } = useDevices({
    search: debouncedSearch,
    status: statusFilter === "ALL" ? null : (statusFilter as DeviceStatus),
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null)

  const handleAdd = () => {
    setEditingDevice(null)
    setFormOpen(true)
  }

  const handleEdit = (device: Device) => {
    setEditingDevice(device)
    setFormOpen(true)
  }

  const handleDeleteClick = (device: Device) => {
    setDeviceToDelete(device)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (deviceToDelete) {
      await deleteDevice(deviceToDelete.id)
      setDeleteDialogOpen(false)
      setDeviceToDelete(null)
    }
  }

  const handleFormSubmit = async (data: DeviceCreate | DeviceUpdate) => {
    if (editingDevice) {
      await updateDevice(editingDevice.id, data as DeviceUpdate)
    } else {
      await createDevice(data as DeviceCreate)
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
                  <BreadcrumbPage>Devices</BreadcrumbPage>
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
                <CardTitle className="text-headline-2">Device Inventory</CardTitle>
                <Button onClick={handleAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Device
                </Button>
              </div>
              <div className="flex flex-row items-center gap-2">
                <div className="relative max-w-sm flex-1">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by IMEI, model, or SIM..."
                    className="pl-8"
                    aria-label="Search devices"
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
                  <DevicesTable
                    devices={devices}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                </div>
              )}
            </CardContent>
            <div className="flex shrink-0 items-center justify-between border-t px-6 py-3">
              <span className="text-muted-foreground text-sm">
                {totalElements === 0
                  ? "No devices found"
                  : `Page ${page + 1} of ${Math.max(totalPages, 1)} · ${totalElements} devices`}
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

        <DeviceFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          device={editingDevice}
          onSubmit={handleFormSubmit}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Device</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deviceToDelete?.model} ({deviceToDelete?.imei})?
                This action cannot be undone.
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
