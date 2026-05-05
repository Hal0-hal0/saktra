'use client'

import { useMemo } from "react"
import { useEvent } from "../eventsPage/event-provider"
import { DataTable } from "../eventsPage/data-table"
import { historyColumns } from "./columns"

const EventHistory = () => {
  const { events } = useEvent()
  const completedEvents = useMemo(
    () => events.filter((event: { status?: string }) => event.status === "done"),
    [events]
  )

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
