'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Trash2, X } from 'lucide-react'
import type { ColumnDef, Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog'
import { cn } from '@/lib/utils'

type BulkDeleteToolbarProps<T> = {
  table: Table<T>
  entityLabel: string
  /** Called for each selected row; throw to abort and surface an error toast. */
  onDelete: (row: T) => Promise<void>
  className?: string
  /** Optional override for the per-row identifier text shown in the count badge. */
  pluralize?: (count: number) => string
}

export function BulkDeleteToolbar<T>({
  table,
  entityLabel,
  onDelete,
  className,
  pluralize,
}: BulkDeleteToolbarProps<T>) {
  const [pending, setPending] = React.useState(false)
  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = selectedRows.length

  if (selectedCount === 0) return null

  const label = pluralize
    ? pluralize(selectedCount)
    : `${selectedCount} ${entityLabel}${selectedCount === 1 ? '' : 's'}`

  const handleConfirm = async () => {
    setPending(true)
    try {
      const results = await Promise.allSettled(
        selectedRows.map((row) => onDelete(row.original))
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0 && failed < results.length) {
        toast.warning(
          `Deleted ${results.length - failed} of ${results.length} ${entityLabel}${results.length === 1 ? '' : 's'}; ${failed} failed.`,
          { position: 'top-center' }
        )
      } else if (failed === results.length) {
        const firstReason = (results[0] as PromiseRejectedResult).reason
        const msg = firstReason instanceof Error ? firstReason.message : 'Bulk delete failed.'
        throw new Error(msg)
      } else {
        toast.success(`${label} deleted.`, { position: 'top-center' })
      }
      table.resetRowSelection()
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border bg-primary/5 px-3 py-2',
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{label} selected</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5"
          onClick={() => table.resetRowSelection()}
          disabled={pending}
        >
          <X className="size-3.5" />
          Clear
        </Button>
      </div>
      <DeleteConfirmDialog
        title={<>Delete <span className="font-bold">{label}</span>?</>}
        description="This action cannot be undone. Each selected row will be permanently deleted."
        confirmLabel={pending ? 'Deleting...' : `Delete ${label}`}
        onConfirm={handleConfirm}
      >
        <Button type="button" variant="destructive" size="sm" disabled={pending} className="gap-1.5">
          {pending ? <Spinner data-icon="inline-start" /> : <Trash2 className="size-3.5" />}
          Delete {label}
        </Button>
      </DeleteConfirmDialog>
    </div>
  )
}

export function selectionColumn<T>(): ColumnDef<T> {
  return {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : false
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all rows on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
  }
}
