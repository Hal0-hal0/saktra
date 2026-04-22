'use client'
import { columns, Event } from "./columns"
import { DataTable } from "./data-table"
import { useEvent } from './event-provider'

export default function CreateUserPage() {
  const {events} = useEvent()

  return (
    <div>
      <div>
        <h1 className='font-bold text-xl'>Manage Events</h1>

      </div>
      <div className="container mx-auto py-5">
        <DataTable columns={columns} data={events} />
      </div>
    </div>
  )
}