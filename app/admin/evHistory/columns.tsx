"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
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

        <ParticipantsModal eventId={event.id} eventName={event.name}>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Users className="size-4" />
            <span className="text-accent-foreground">See Participants</span>
          </DropdownMenuItem>
        </ParticipantsModal>

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
          {row.original.name}
        </button>
      </EventDrawer>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.original.description ?? ""
      return description.length > 50 ? `${description.slice(0, 50)}...` : description
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
  },
  {
    accessorKey: "venue",
    header: "Venue",
  },
  {
    id: "actions",
    accessorKey: "Actions",
    cell: ({ row }) => <HistoryEventActions event={row.original} />,
  },
]