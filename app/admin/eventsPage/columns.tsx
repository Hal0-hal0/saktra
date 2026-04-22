"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { ArrowUpDown } from "lucide-react"
import { DeleteRoundedIcon } from "@/components/icons/material-symbols-delete-rounded"
import { PencilLineIcon } from "@/components/icons/lucide-pencil-line"
import { toast } from 'sonner'
import { ButtonCreateEvent } from "./btn-createEvent"
import UpdateDrawer from "./update-drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useEvent } from "./event-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import EventDrawer from "./event-drawer"

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
import { Spinner } from "@/components/ui/spinner"
export type Event = {
  id:string
  participants_id:string
  date_start:string
  date_end:string
  time_start: string
  time_end:string
  name:string
  description:string
  location:string
  venue:string
}

export const columns: ColumnDef<Event>[] = [
  {
    accessorKey: "name",
    cell: ({ row }) => {
    return <span className="capitalize">{row.getValue("name")}</span>
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
     return  <span>{description?.length > 50 ? description.slice(0, 50) + '...' : description}</span>
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
  },
    {
    accessorKey: "venue",
    header: "Venue",
  },
  {
    id: "actions",
    accessorKey: "Actions",
    cell: ({ row }) => {
      const [open, setOpen] = useState(false)
      const [loading, setloading] = useState (false)
      const event = row.original
      

      const handleDelete = async () => {
        setloading(true)
        const res = await fetch('/api/delete-event', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: event.id })
        })

        const { error } = await res.json()
        if (error) {
          toast.error(error)
          return
        }
        setloading(false)
        toast.success('User deleted!', {position:"top-center"})
      }
      
 
      return (
        <DropdownMenu >
          <DropdownMenuTrigger asChild >
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" >
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <EventDrawer eventId={row.original.id}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <DeleteRoundedIcon/>
                <span className="text-accent-foreground">View More</span>
              </DropdownMenuItem>
            </EventDrawer>

            <DropdownMenuSeparator />

              <AlertDialog >
                <AlertDialogTrigger asChild >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}><DeleteRoundedIcon/><span className="text-destructive">Delete</span></DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader >
                    <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                      <DeleteRoundedIcon/>
                    </AlertDialogMedia>
                    <AlertDialogTitle>Do you want to delete this user: ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action is irreversible. Once user is being deleted all it's data will be wiped out in the database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleDelete}>
                      {loading && <Spinner/> }
                      Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]