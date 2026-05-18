"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, CheckCheckIcon, MoreHorizontal, Users } from "lucide-react"
import { DeleteRoundedIcon } from "@/components/icons/material-symbols-delete-rounded"
import { toast } from 'sonner'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import EventDrawer from "./event-drawer"
import { ParticipantsModal } from "./participants-modal"
import { TruncatedCell } from "@/components/ui/truncated-cell"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog"
import { Spinner } from "@/components/ui/spinner"
import { OverviewKeyRoundedIcon } from "@/components/icons/material-symbols-overview-key-rounded"

export type Event = {
  id: string
  participants_id: string
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

function EventActions({ event }: { event: Event }) {
  const [doneLoading, setDoneLoading] = useState(false)

  const handleDelete = async () => {
    const res = await fetch('/api/delete-event', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: event.id })
    })

    const { error } = await res.json()
    if (error) throw new Error(error)
    toast.success('Event Deleted Successfully!', { position: "top-center" })
  }

  const handleMarkDone = async () => {
    setDoneLoading(true)

    const res = await fetch('/api/update-event-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: event.id, status: 'done' })
    })

    const { error } = await res.json()
    if (error) {
      toast.error(error, { position: "top-center" })
      setDoneLoading(false)
      return
    }

    toast.success('Event marked as done.', { position: "top-center" })
    setDoneLoading(false)
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

        <EventDrawer eventId={event.id}>
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

        <DropdownMenuSeparator />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={doneLoading}>
              {doneLoading ? <Spinner /> : <CheckCheckIcon className="size-4" />}
              <span className="text-accent-foreground">Event Done</span>
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-primary/10 text-primary">
                <CheckCheckIcon className="size-5" />
              </AlertDialogMedia>
              <AlertDialogTitle>Mark this event as done?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move the event to Event History and remove it from the ongoing events and attendance pages.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkDone}>
                {doneLoading && <Spinner />}
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DeleteConfirmDialog
          title={<>Delete event <span className="font-bold">{event.name}</span>?</>}
          description="This action is irreversible. All RSVPs, attendance and evaluation data for this event will be removed."
          onConfirm={handleDelete}
        >
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <DeleteRoundedIcon />
            <span className="text-destructive">Delete</span>
          </DropdownMenuItem>
        </DeleteConfirmDialog>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const columns: ColumnDef<Event>[] = [
  {
    accessorKey: "name",
    cell: ({ row }) => {
      return <TruncatedCell className="capitalize" content={row.getValue("name")} />
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Event Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "description",
    cell: ({ row }) => {
      const description = (row.getValue("description") as string) ?? ''
      return <TruncatedCell content={description} />
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Description
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "date_start",
    header: "Event Start",
  },
  {
    accessorKey: "date_end",
    header: "Event End",
    cell: ({ row }) => {
      return <span className="capitalize">{row.getValue("date_end")}</span>
    }
  },
  {
    accessorKey: "time_start",
    header: "Time Start",
  },
  {
    accessorKey: "time_end",
    header: "Time End",
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
    id: "actions",
    accessorKey: "Actions",
    cell: ({ row }) => <EventActions event={row.original} />,
  },
]