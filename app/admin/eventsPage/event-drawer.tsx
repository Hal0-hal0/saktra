"use client"

import React from "react"
import { format, parse } from "date-fns"
import { CalendarDays, Clock3, FileText, MapPin } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useEvent } from "./event-provider"
import UpdateEvent from "./update-event"

type EventDetails = {
  id: string
  date_start: string
  date_end: string
  time_start: string
  time_end: string
  name: string
  description: string
  location: string
  venue: string
}

const formatEventDate = (value?: string) => {
  if (!value) {
    return "Not set"
  }

  return format(parse(value, "yyyy-MM-dd", new Date()), "MMMM d, yyyy")
}

const formatEventTime = (value?: string) => {
  if (!value) {
    return "Not set"
  }

  return format(parse(value, "HH:mm:ss", new Date()), "h:mm a")
}

const DetailRow = ({
  label,
  value,
}: {
  label: string
  value: string
}) => {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-background/60 px-4 py-3">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

const EventDrawer = ({
  children,
  eventId,
  showUpdateButton = true,
}: {
  children: React.ReactNode
  eventId: string
  showUpdateButton?: boolean
}) => {
  const { events = [] } = useEvent()
  const selectedEvent = (events as EventDetails[]).find((event) => event.id === eventId)

  if (!selectedEvent) {
    return (
      <Drawer direction="left">
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent className="!h-full !max-w-none !w-full lg:!w-1/2 xl:!w-1/3">
          <DrawerHeader>
            <DrawerTitle>Event not found</DrawerTitle>
            <DrawerDescription>
              The selected event details could not be loaded.
            </DrawerDescription>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    )
  }

  const eventDateSummary =
    selectedEvent.date_start === selectedEvent.date_end
      ? formatEventDate(selectedEvent.date_start)
      : `${formatEventDate(selectedEvent.date_start)} to ${formatEventDate(selectedEvent.date_end)}`

  const eventTimeSummary = `${formatEventTime(selectedEvent.time_start)} to ${formatEventTime(selectedEvent.time_end)}`

  return (
    <Drawer direction="left">
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="!h-full !max-w-none !w-full lg:!w-1/2 xl:!w-1/3">
        <DrawerHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DrawerTitle className="text-xl capitalize">
                {selectedEvent.name}
              </DrawerTitle>
              <DrawerDescription>
                Event details presented in a clear admin-friendly summary.
              </DrawerDescription>
            </div>
            <Badge variant="secondary">Event Overview</Badge>
          </div>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-5 pb-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                Schedule
              </CardTitle>
              <CardDescription>
                The date and time range for this event.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow label="Event dates" value={eventDateSummary} />
              <DetailRow label="Event time" value={eventTimeSummary} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4" />
                Venue Details
              </CardTitle>
              <CardDescription>
                Where the event will happen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow
                label="Location"
                value={selectedEvent.location || "Not set"}
              />
              <DetailRow
                label="Venue"
                value={selectedEvent.venue || "Not set"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4" />
                Description
              </CardTitle>
              <CardDescription>
                The main purpose or notes for the event.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-background/60 px-4 py-3 text-sm leading-6 text-foreground">
                {selectedEvent.description?.trim() || "No description provided for this event yet."}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-4" />
                Quick Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This event is scheduled for <span className="font-medium text-foreground">{eventDateSummary}</span> at{" "}
                <span className="font-medium text-foreground">{eventTimeSummary}</span>.
              </p>
              <Separator />
              <p className="text-sm text-muted-foreground">
                The event will take place in <span className="font-medium text-foreground">{selectedEvent.location || "an unspecified location"}</span>
                {selectedEvent.venue ? (
                  <>
                    {" "}at <span className="font-medium text-foreground">{selectedEvent.venue}</span>.
                  </>
                ) : (
                  "."
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {showUpdateButton ? (
          <DrawerFooter>
            <UpdateEvent event={selectedEvent}>
              <Button type="button">Update</Button>
            </UpdateEvent>
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

export default EventDrawer
