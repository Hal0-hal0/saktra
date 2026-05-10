'use client'

import { useMemo } from "react"
import { useEvent } from "../eventsPage/event-provider"
import { DataTable } from "../eventsPage/data-table"
import { historyColumns } from "./columns"

import { isBefore, startOfDay, parseISO } from "date-fns"

const EventHistory = () => {
  const { events } = useEvent()
  const completedEvents = useMemo(() => {
    const today = startOfDay(new Date())
    return events.filter((event: any) => {
      if (event.status === "done") return true
      
      if (event.date_end) {
        const endDate = startOfDay(parseISO(event.date_end))
        if (isBefore(endDate, today)) {
          return true
        }
      }
      return false
    })
  }, [events])

  return (
    <div>
      <div>
        <h1 className="text-xl font-bold">Event History</h1>
      </div>
      <div className="container mx-auto py-5">
        <DataTable
          columns={historyColumns}
          data={completedEvents}
          showCreateButton={false}
          filterColumnId="name"
          filterPlaceholder="Filter completed events..."
        />
      </div>
    </div>
  )
}

export default EventHistory
