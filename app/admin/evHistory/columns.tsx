"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Users, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog"
import EventDrawer from "../eventsPage/event-drawer"
import { ParticipantsModal } from "../eventsPage/participants-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { OverviewKeyRoundedIcon } from "@/components/icons/material-symbols-overview-key-rounded"
import { TruncatedCell } from "@/components/ui/truncated-cell"

export type EventHistoryItem = {
  id: string
  date_start: string
  date_end: string
  time_start: string
  time_end: string
  name: string
  description: string
  location: string
  venue: string
  status?: string
}

function HistoryEventActions({ event }: { event: EventHistoryItem }) {
  const handleDelete = async () => {
    const res = await fetch("/api/delete-event", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: event.id }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to delete event")
    toast.success("Event deleted successfully")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>

        <EventDrawer eventId={event.id} showUpdateButton={false}>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <OverviewKeyRoundedIcon />
            <span className="text-accent-foreground">View More</span>
          </DropdownMenuItem>
        </EventDrawer>

        <DropdownMenuSeparator />

        <DeleteConfirmDialog
          title={<>Delete event <span className="font-bold text-destructive">{event.name}</span>?</>}
          description="This action is irreversible. It will permanently remove all associated RSVPs and evaluation scores."
          onConfirm={handleDelete}
          confirmLabel="Confirm Delete"
        >
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
            <Trash2 className="size-4" />
            <span>Delete Event</span>
          </DropdownMenuItem>
        </DeleteConfirmDialog>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const historyColumns: ColumnDef<EventHistoryItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Event Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <EventDrawer eventId={row.original.id} showUpdateButton={false}>
        <button type="button" className="text-left font-medium capitalize hover:underline">
          <TruncatedCell content={row.original.name} />
        </button>
      </EventDrawer>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.original.description ?? ""
      return <TruncatedCell content={description} />
    },
  },
  {
    accessorKey: "date_start",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Start Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "date_end",
    header: "End Date",
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => <TruncatedCell content={row.getValue("location")} />
  },
  {
    accessorKey: "venue",
    header: "Venue",
    cell: ({ row }) => <TruncatedCell content={row.getValue("venue")} />
  },
  {
    id: "participants",
    header: "Participants",
    enableSorting: false,
    cell: ({ row }) => (
      <ParticipantsModal eventId={row.original.id} eventName={row.original.name}>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Users className="size-3.5" />
          <span>View</span>
        </Button>
      </ParticipantsModal>
    ),
  },
  {
    id: "actions",
    accessorKey: "Actions",
    cell: ({ row }) => <HistoryEventActions event={row.original} />,
  },
]