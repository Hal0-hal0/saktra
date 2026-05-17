'use client'
import { useMemo } from "react"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { useEvent } from './event-provider'

import { isBefore, startOfDay, parseISO } from "date-fns"

export default function CreateUserPage() {
  const {events} = useEvent()
  const ongoingEvents = useMemo(() => {
    const today = startOfDay(new Date())
    return events.filter((event: any) => {
      if (event.status === 'done') return false
      
      if (event.date_end) {
        const endDate = startOfDay(parseISO(event.date_end))
        if (isBefore(endDate, today)) {
          return false
        }
      }
      return true
    })
  }, [events])

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
