"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { ArrowUpDown } from "lucide-react"
import { DeleteRoundedIcon } from "@/components/icons/material-symbols-delete-rounded"
import { PencilLineIcon } from "@/components/icons/lucide-pencil-line"
import { toast } from 'sonner'
import { ButtonUpdateUser } from "./btn-updateUsers"
import UpdateDrawer from "./update-drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useProfiles } from "./profile-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
import { Timestamp } from "next/dist/server/lib/cache-handlers/types"
export type Payment = {
  user_id: string
  user_name: string
  email: string
  role: string
  status: string
  department: string
  position:string
  created_at: Date
}

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "role",
    cell: ({ row }) => {
    return <span className="capitalize">{row.getValue("role")}</span>
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Role
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "user_name",
    header: "Username",
  }, 
    {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => {
    return <span className="capitalize">{row.getValue("department")}</span>
  }
  },
    {
    accessorKey:"position",
    header: "Position",
  },

  {
    accessorKey: "status",
    cell: ({ row }) => {
    const status = row.getValue("status")
    return status === "active" ? (
    <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">Active</Badge>
      ) : (
        <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">Inactive</Badge>
      )
    },  
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    id: "actions",
    accessorKey: "Actions",
    cell: ({ row }) => {
      const [open, setOpen] = useState(false)
      const user = row.original

      const handleDelete = async () => {
          const res = await fetch('/api/delete-user', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.user_id })
        })

        const { error } = await res.json()
        if (error) {
          toast.error(error)
          return
        }
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
            <UpdateDrawer user={user}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <PencilLineIcon/>Update User
              </DropdownMenuItem>
            </UpdateDrawer>
            
            <DropdownMenuSeparator />

              <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogTrigger asChild onClick={() => setOpen(true)}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}><DeleteRoundedIcon/><span className="text-destructive">Delete</span></DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                      <DeleteRoundedIcon/>
                    </AlertDialogMedia>
                    <AlertDialogTitle>Do you want to delete this user: <span className="font-bold">{user.email}</span> ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action is irreversible. Once user is being deleted all it's data will be wiped out in the database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleDelete}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]