"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import QRCode from "qrcode"
import { format, parse, isBefore, startOfDay, parseISO } from "date-fns"
import { QrCode, CalendarDays, Clock3, MapPin, Copy, ExternalLink } from "lucide-react"
import { supabase } from "@/lib/supabase/supabase-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

type EventRecord = {
  id: string
  name: string
  description: string
  date_start: string
  date_end: string
  time_start: string
  time_end: string
  location: string
  venue: string
  status?: string
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

const AttendancePage = () => {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [attendUrl, setAttendUrl] = useState("")
  const [qrLoading, setQrLoading] = useState(false)

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase.from("events").select("*")

      if (error) {
        toast.error("Unable to load events.", { position: "top-center" })
        setLoading(false)
        return
      }

      setEvents((data as EventRecord[]) ?? [])
      setLoading(false)
    }

    fetchEvents()

    const channel = supabase
      .channel("attendance-events-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          fetchEvents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const sortedEvents = useMemo(() => {
    const today = startOfDay(new Date())
    return [...events]
      .filter((event) => {
        if (event.status === "done") return false
        if (event.date_end) {
          const endDate = startOfDay(parseISO(event.date_end))
          if (isBefore(endDate, today)) {
            return false
          }
        }
        return true
      })
      .sort((first, second) => first.name.localeCompare(second.name))
  }, [events])

  const handleGenerateQr = async (event: EventRecord) => {
    setSelectedEvent(event)
    setQrLoading(true)
    setQrCodeUrl("")
    setAttendUrl("")

    try {
      const url = `${window.location.origin}/attend/${encodeURIComponent(event.id)}`
      const imageUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 320,
      })

      setAttendUrl(url)
      setQrCodeUrl(imageUrl)
    } catch {
      toast.error("Unable to generate QR code.", { position: "top-center" })
    } finally {
      setQrLoading(false)
    }
  }

  const copyUrl = async () => {
    if (!attendUrl) return
    try {
      await navigator.clipboard.writeText(attendUrl)
      toast.success("Check-in URL copied", { position: "top-center" })
    } catch {
      toast.error("Could not copy URL", { position: "top-center" })
    }
  }

  const closeDialog = () => {
    setSelectedEvent(null)
    setQrCodeUrl("")
    setAttendUrl("")
    setQrLoading(false)
  }

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Attendance Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Every event listed below has one unique QR code for attendance scanning.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border bg-card">
            <Spinner />
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            No events are available yet.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {sortedEvents.map((event) => {
              const dateSummary =
                event.date_start === event.date_end
                  ? formatEventDate(event.date_start)
                  : `${formatEventDate(event.date_start)} to ${formatEventDate(event.date_end)}`

              const timeSummary = `${formatEventTime(event.time_start)} to ${formatEventTime(event.time_end)}`

              return (
                <Card key={event.id} className="h-full">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="capitalize">{event.name}</CardTitle>
                        <CardDescription>
                          {event.description?.trim() || "No event description provided yet."}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">Attendance</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="size-4" />
                      <span>{dateSummary}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock3 className="size-4" />
                      <span>{timeSummary}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4" />
                      <span>
                        {event.location || "No location"}{event.venue ? `, ${event.venue}` : ""}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => handleGenerateQr(event)}
                    >
                      <QrCode className="size-4" />
                      Generate QR Code
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {selectedEvent?.name || "Event QR Code"}
            </DialogTitle>
            <DialogDescription>
              Scanning checks the user in to this event and awards them <strong>+10 points</strong>. The URL below is the same one encoded in the QR — open it in another browser to test the flow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4">
              {qrLoading ? (
                <div className="flex min-h-72 items-center justify-center">
                  <Spinner />
                </div>
              ) : qrCodeUrl ? (
                <div className="space-y-4">
                  <div className="flex justify-center rounded-lg bg-white p-4">
                    <Image
                      src={qrCodeUrl}
                      alt={`QR code for ${selectedEvent?.name}`}
                      width={288}
                      height={288}
                      className="h-72 w-72"
                      unoptimized
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Event:</span>{" "}
                      {selectedEvent?.name}
                    </p>
                    <div className="rounded-lg border bg-background p-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-in URL</p>
                      <p className="break-all font-mono text-xs">{attendUrl}</p>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={copyUrl}>
                          <Copy className="size-3.5" />
                          Copy
                        </Button>
                        <a href={attendUrl} target="_blank" rel="noreferrer">
                          <Button type="button" variant="outline" size="sm">
                            <ExternalLink className="size-3.5" />
                            Open in new tab
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
                  QR code unavailable.
                </div>
              )}
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={closeDialog}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AttendancePage
