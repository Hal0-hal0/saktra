"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { ArrowUpDown } from "lucide-react"
import { DeleteRoundedIcon } from "@/components/icons/material-symbols-delete-rounded"
import { PencilLineIcon } from "@/components/icons/lucide-pencil-line"
import { toast } from 'sonner'
import UpdateDrawer from "./update-drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useProfiles } from "./profile-provider"
import { TruncatedCell } from "@/components/ui/truncated-cell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog"
import { formatEvaluationRole } from "@/lib/member-evaluation"
export type Payment = {
  user_id: string
  user_name: string
  email: string
  role: string
  status: string
  department: string
  position: string
  created_at: string
}

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "role",
    cell: ({ row }) => {
      return <TruncatedCell content={formatEvaluationRole(row.getValue("role"))} />
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
    cell: ({ row }) => {
      return <TruncatedCell content={row.getValue("email")} />
    },
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
    cell: ({ row }) => {
      return <TruncatedCell content={row.getValue("user_name")} />
    },
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => {
      return <TruncatedCell className="capitalize" content={row.getValue("department")} />
    }
  },
  {
    accessorKey: "position",
    header: "Position",
    cell: ({ row }) => {
      return <TruncatedCell className="capitalize" content={row.getValue("position")} />
    }
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
    accessorKey: "created_at",
    sortingFn: "datetime",
    sortDescFirst: true,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date Added
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const raw = row.getValue("created_at") as string | Date | null
      if (!raw) return <span className="text-muted-foreground">—</span>
      const date = raw instanceof Date ? raw : new Date(raw)
      return (
        <span className="text-sm tabular-nums">
          {date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })}
        </span>
      )
    },
  },
  {
    id: "actions",
    accessorKey: "Actions",
    cell: ({ row }) => <MemberActions user={row.original} />,
  },
]

function MemberActions({ user }: { user: Payment }) {
  const { currentUserId } = useProfiles()
  const isSelf = currentUserId === user.user_id

  const handleDelete = async () => {
    const res = await fetch('/api/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.user_id })
    })

    const { error } = await res.json()
    if (error) throw new Error(error)
    toast.success('User deleted!', { position: "top-center" })
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
        <UpdateDrawer user={user}>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <PencilLineIcon />Update User
          </DropdownMenuItem>
        </UpdateDrawer>

        <DropdownMenuSeparator />

        {isSelf ? (
          <DropdownMenuItem disabled>
            <DeleteRoundedIcon />
            <span>Delete (self-delete blocked)</span>
          </DropdownMenuItem>
        ) : (
          <DeleteConfirmDialog
            title={<>Delete user <span className="font-bold">{user.email}</span>?</>}
            description="This is irreversible. The account is removed from authentication and all profile data is wiped from the database."
            onConfirm={handleDelete}
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <DeleteRoundedIcon />
              <span className="text-destructive">Delete</span>
            </DropdownMenuItem>
          </DeleteConfirmDialog>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}