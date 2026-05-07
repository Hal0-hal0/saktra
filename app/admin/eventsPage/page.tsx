'use client'
import { useMemo } from "react"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { useEvent } from './event-provider'

export default function CreateUserPage() {
  const {events} = useEvent()
  const ongoingEvents = useMemo(
    () => events.filter((event: { status?: string }) => event.status !== 'done'),
    [events]
  )

  return (
    <div>
      <div>
        <h1 className='font-bold text-xl'>Manage Events</h1>

      </div>
      <div className="container mx-auto py-5">
        <DataTable columns={columns} data={ongoingEvents} />
      </div>
    </div>
  )
}
