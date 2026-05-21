"use client"
import * as React from "react"
import { toast } from "sonner"

import {
  ColumnDef,
  ColumnFiltersState,
  getFilteredRowModel,
  flexRender,
  RowSelectionState,
  SortingState,
  getSortedRowModel,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ButtonCreateEvent } from "./btn-createEvent"
import { BulkDeleteToolbar, selectionColumn } from "@/components/admin/bulk-delete-toolbar"
import type { Event } from "./columns"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  showCreateButton?: boolean
  filterColumnId?: string
  filterPlaceholder?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  showCreateButton = true,
  filterColumnId = "name",
  filterPlaceholder = "Filter events...",
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

    const columnsWithSelection = React.useMemo(
      () => [selectionColumn<TData>() as ColumnDef<TData, TValue>, ...columns],
      [columns]
    )

  const table = useReactTable({
    data,
    columns: columnsWithSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    initialState: {
        pagination: {
        pageSize: 10,
        },
    },
    state: {
      sorting,
      columnFilters,
      rowSelection,
    }
  })

  const handleBulkDelete = async (row: TData) => {
    const id = (row as unknown as Event).id
    const res = await fetch('/api/delete-event', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const { error } = await res.json()
    if (error) {
      toast.error(error, { position: 'top-center' })
      throw new Error(error)
    }
  }

  return (
    <div>
        <div className="flex items-center py-4 gap-5">
            {showCreateButton ? <ButtonCreateEvent/> : null}
            <Input
            placeholder={filterPlaceholder}
            value={(table.getColumn(filterColumnId)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
                table.getColumn(filterColumnId)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
            />
        </div>

        <BulkDeleteToolbar
          table={table}
          entityLabel="event"
          onDelete={handleBulkDelete}
          className="mb-3"
        />

        <div className="overflow-hidden rounded-md border">
        <Table>
            <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                    return (
                    <TableHead key={header.id}>
                        {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                            )}
                    </TableHead>
                    )
                })}
                </TableRow>
            ))}
            </TableHeader>
            <TableBody>
            {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                >
                    {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                    ))}
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={columnsWithSelection.length} className="h-24 text-center">
                    No results.
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
        </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                >
                Previous
                </Button>
                <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                >
                Next
                </Button>
        </div>
    </div>
  )
}
