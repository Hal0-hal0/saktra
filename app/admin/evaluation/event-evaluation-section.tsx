'use client'

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { CalendarDays, ChartColumnBig, ChevronDown, ChevronUp, ClipboardCheck, DoorClosed, Eye, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCriteriaType } from "@/lib/evaluation"

type SortKey = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "responses-desc" | "responses-asc"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "Date (newest first)" },
  { value: "date-asc", label: "Date (oldest first)" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "responses-desc", label: "Most responses" },
  { value: "responses-asc", label: "Fewest responses" },
]

function sortEvents<T extends { name: string; date_start?: string | null; response_count: number }>(
  list: T[],
  key: SortKey,
): T[] {
  const copy = [...list]
  switch (key) {
    case "date-desc":
      return copy.sort((a, b) => (b.date_start ?? "").localeCompare(a.date_start ?? ""))
    case "date-asc":
      return copy.sort((a, b) => (a.date_start ?? "").localeCompare(b.date_start ?? ""))
    case "name-asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name))
    case "name-desc":
      return copy.sort((a, b) => b.name.localeCompare(a.name))
    case "responses-desc":
      return copy.sort((a, b) => b.response_count - a.response_count)
    case "responses-asc":
      return copy.sort((a, b) => a.response_count - b.response_count)
  }
}

type AdminCriteria = {
  id: string
  criteria_description: string
  criteria_type: string
}

type AdminAnswer = {
  id: string
  response_id: string
  criteria_id: string
  rating_value: number | null
  answer_text: string | null
}

type AdminResponse = {
  id: string
  user_id: string
  event_id: string
  status: string | null
  created_at: string
  answers: AdminAnswer[]
}

type AdminEvent = {
  id: string
  name: string
  status?: string
  evaluation_open?: boolean
  event_eval_score?: number | null
  date_start?: string | null
  date_end?: string | null
  evaluation_deadline?: string | null
  response_count: number
}

type AdminPayload = {
  error?: string
  events: AdminEvent[]
  openEvent: AdminEvent | null
  criteria: AdminCriteria[]
  responses: AdminResponse[]
}

type CriterionAverage = {
  criteriaId: string
  criteriaDescription: string
  criteriaType: string
  average: number | null
  totalRatings: number
}

function formatEventDateRange(dateStart?: string | null, dateEnd?: string | null) {
  if (!dateStart) return "Date unavailable"
  if (!dateEnd || dateStart === dateEnd) return format(new Date(dateStart), "MMMM d, yyyy")
  return `${format(new Date(dateStart), "MMMM d")} - ${format(new Date(dateEnd), "MMMM d, yyyy")}`
}

function formatScore(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "No score yet"
  return `${value.toFixed(1)} / 10`
}

function isAlreadyEvaluated(event: AdminEvent) {
  return event.response_count > 0 || event.event_eval_score !== null
}

export default function EventEvaluationSection() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [criteria, setCriteria] = useState<AdminCriteria[]>([])
  const [responses, setResponses] = useState<AdminResponse[]>([])
  const [selectedEventId, setSelectedEventId] = useState("")
  const [pickerOpen, setPickerOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [selectedPickerEventId, setSelectedPickerEventId] = useState("")
  const [selectedReopenEventId, setSelectedReopenEventId] = useState("")
  const [evaluationDeadline, setEvaluationDeadline] = useState("")
  const [reopenDeadline, setReopenDeadline] = useState("")
  const [loading, setLoading] = useState(true)
  // pendingAction keys: "open" | "reopen" | `close:${id}`
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [freshSort, setFreshSort] = useState<SortKey>("date-desc")
  const [reopenSort, setReopenSort] = useState<SortKey>("date-desc")
  const [closedSort, setClosedSort] = useState<SortKey>("date-desc")
  const [collapsedClosed, setCollapsedClosed] = useState<Set<string>>(new Set())

  const toggleClosedCollapse = (id: string) => {
    setCollapsedClosed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const query = selectedEventId ? `?eventId=${encodeURIComponent(selectedEventId)}` : ""
      const res = await fetch(`/api/evaluation/admin${query}`, { cache: "no-store" })
      const data = (await res.json()) as AdminPayload

      if (!res.ok) {
        toast.error(data.error || "Unable to load evaluation data.", { position: "top-center" })
        setLoading(false)
        return
      }

      const nextOpenEvents = (data.events ?? []).filter((event) => event.evaluation_open)
      const nextSelected = selectedEventId || nextOpenEvents[0]?.id || data.events?.[0]?.id || ""
      const firstFresh = (data.events ?? []).find((event) => !event.evaluation_open && !isAlreadyEvaluated(event))
      const firstReopenable = (data.events ?? []).find((event) => !event.evaluation_open && isAlreadyEvaluated(event))

      setEvents(data.events ?? [])
      setCriteria(data.criteria ?? [])
      setResponses(data.responses ?? [])
      setSelectedEventId(nextSelected)
      setSelectedPickerEventId(firstFresh?.id || "")
      setSelectedReopenEventId(firstReopenable?.id || "")
      setLoading(false)
    }

    fetchData()
  }, [refreshKey, selectedEventId])

  const openEvents = useMemo(() => events.filter((event) => event.evaluation_open), [events])
  const closedEvaluations = useMemo(
    () => events.filter((event) => !event.evaluation_open && isAlreadyEvaluated(event)),
    [events]
  )
  const freshEvents = useMemo(
    () => events.filter((event) => !event.evaluation_open && !isAlreadyEvaluated(event)),
    [events]
  )
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  )

  const criterionAverages = useMemo<CriterionAverage[]>(() => {
    const selectedResponses = responses.filter((response) => response.event_id === selectedEventId)

    return criteria
      .map((criterion) => {
        const ratings = selectedResponses
          .flatMap((response) => response.answers)
          .filter((answer) => answer.criteria_id === criterion.id)
          .map((answer) => answer.rating_value)
          .filter((value): value is number => typeof value === "number" && !Number.isNaN(value))

        const average = ratings.length
          ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2))
          : null

        return {
          criteriaId: criterion.id,
          criteriaDescription: criterion.criteria_description,
          criteriaType: criterion.criteria_type,
          average,
          totalRatings: ratings.length,
        }
      })
      .sort((first, second) => {
        if (first.criteriaType === second.criteriaType) {
          return first.criteriaDescription.localeCompare(second.criteriaDescription)
        }

        return first.criteriaType.localeCompare(second.criteriaType)
      })
  }, [criteria, responses, selectedEventId])

  const openEvaluation = async () => {
    if (!selectedPickerEventId || !evaluationDeadline) {
      toast.error("Pick an event and set a close date.", { position: "top-center" })
      return
    }

    setPendingAction("open")
    const res = await fetch("/api/evaluation/open", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: selectedPickerEventId, evaluationDeadline }),
    })
    const data = await res.json()
    setPendingAction(null)

    if (!res.ok) {
      toast.error(data.error || "Unable to open evaluation.", { position: "top-center" })
      return
    }

    setPickerOpen(false)
    setEvaluationDeadline("")
    setSelectedEventId(selectedPickerEventId)
    setRefreshKey((value) => value + 1)
    toast.success("Evaluation opened successfully.", { position: "top-center" })
  }

  const reopenEvaluation = async () => {
    if (!selectedReopenEventId || !reopenDeadline) {
      toast.error("Pick an event and set a close date.", { position: "top-center" })
      return
    }

    setPendingAction("reopen")
    const res = await fetch("/api/evaluation/reopen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: selectedReopenEventId, evaluationDeadline: reopenDeadline }),
    })
    const data = await res.json()
    setPendingAction(null)

    if (!res.ok) {
      toast.error(data.error || "Unable to reopen evaluation.", { position: "top-center" })
      return
    }

    setReopenOpen(false)
    setReopenDeadline("")
    setSelectedEventId(selectedReopenEventId)
    setRefreshKey((value) => value + 1)
    toast.success("Evaluation reopened successfully.", { position: "top-center" })
  }

  const closeEvaluation = async () => {
    if (!selectedEventId) return

    setPendingAction(`close:${selectedEventId}`)
    const res = await fetch("/api/evaluation/close", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: selectedEventId }),
    })
    const data = await res.json()
    setPendingAction(null)

    if (!res.ok) {
      toast.error(data.error || "Unable to end evaluation.", { position: "top-center" })
      return
    }

    setDetailsOpen(false)
    setRefreshKey((value) => value + 1)
    toast.success("Evaluation ended. Users can no longer submit.", { position: "top-center" })
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_38%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.6))] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Evaluation control center
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Event Evaluations</h2>
            <p className="text-sm text-muted-foreground">
              Open fresh evaluations with a close date, reopen older ones separately, and keep already evaluated events out of the normal opening flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
              <DialogTrigger asChild>
                <Button type="button" className="min-w-40">
                  Open Evaluation
                </Button>
              </DialogTrigger>
              <DialogContent className="!max-w-6xl">
                <DialogHeader>
                  <DialogTitle>Open A Fresh Evaluation</DialogTitle>
                  <DialogDescription>
                    Only events that have not been evaluated yet appear here. Set the close date before opening.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="max-w-xs space-y-2">
                      <p className="text-sm font-medium">Close date</p>
                      <Input type="date" value={evaluationDeadline} onChange={(event) => setEvaluationDeadline(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Sort by</p>
                      <Select value={freshSort} onValueChange={(v) => setFreshSort(v as SortKey)}>
                        <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SORT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto pr-2">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {freshEvents.length === 0 ? (
                        <div className="col-span-full rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                          No fresh events are ready to open.
                        </div>
                      ) : (
                        sortEvents(freshEvents, freshSort).map((event) => {
                          const active = selectedPickerEventId === event.id

                          return (
                            <button
                              key={event.id}
                              type="button"
                              className={`rounded-2xl border p-4 text-left transition ${
                                active
                                  ? "border-primary bg-primary/8 ring-2 ring-primary/20"
                                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                              }`}
                              onClick={() => setSelectedPickerEventId(event.id)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium">{event.name}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {formatEventDateRange(event.date_start, event.date_end)}
                                  </p>
                                </div>
                                {active ? <Badge>Selected</Badge> : <Badge variant="outline">Fresh</Badge>}
                              </div>
                              <div className="mt-4 rounded-xl bg-muted/50 p-3 text-sm">
                                <p className="text-muted-foreground">Evaluation history</p>
                                <p className="mt-1 font-medium">No previous evaluation data</p>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPickerOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={openEvaluation} disabled={pendingAction !== null || !selectedPickerEventId || !evaluationDeadline}>
                    {pendingAction === "open" && <Spinner data-icon="inline-start" />}
                    Open Selected Event
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="min-w-40">
                  Reopen Evaluation
                </Button>
              </DialogTrigger>
              <DialogContent className="!max-w-6xl">
                <DialogHeader>
                  <DialogTitle>Reopen A Closed Evaluation</DialogTitle>
                  <DialogDescription>
                    These events already have evaluation history. Reopening keeps them separate from the fresh opening flow.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="max-w-xs space-y-2">
                      <p className="text-sm font-medium">New close date</p>
                      <Input type="date" value={reopenDeadline} onChange={(event) => setReopenDeadline(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Sort by</p>
                      <Select value={reopenSort} onValueChange={(v) => setReopenSort(v as SortKey)}>
                        <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SORT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto pr-2">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {closedEvaluations.length === 0 ? (
                        <div className="col-span-full rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                          No evaluated events are available to reopen.
                        </div>
                      ) : (
                        sortEvents(closedEvaluations, reopenSort).map((event) => {
                          const active = selectedReopenEventId === event.id

                          return (
                            <button
                              key={event.id}
                              type="button"
                              className={`rounded-2xl border p-4 text-left transition ${
                                active
                                  ? "border-primary bg-primary/8 ring-2 ring-primary/20"
                                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                              }`}
                              onClick={() => setSelectedReopenEventId(event.id)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium">{event.name}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {formatEventDateRange(event.date_start, event.date_end)}
                                  </p>
                                </div>
                                {active ? <Badge>Selected</Badge> : <Badge variant="outline">Evaluated</Badge>}
                              </div>
                              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-xl bg-muted/50 p-3">
                                  <p className="text-muted-foreground">Votes</p>
                                  <p className="mt-1 font-medium">{event.response_count}</p>
                                </div>
                                <div className="rounded-xl bg-muted/50 p-3">
                                  <p className="text-muted-foreground">Score</p>
                                  <p className="mt-1 font-medium">{formatScore(event.event_eval_score)}</p>
                                </div>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setReopenOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={reopenEvaluation} disabled={pendingAction !== null || !selectedReopenEventId || !reopenDeadline}>
                    {pendingAction === "reopen" && <Spinner data-icon="inline-start" />}
                    Reopen Selected Event
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-60 items-center justify-center rounded-[24px] border bg-card">
          <Spinner />
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Open Evaluations</h2>
              <p className="text-sm text-muted-foreground">Users can submit only until the close date shown on each event card.</p>
            </div>

            {openEvents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {openEvents.map((event) => (
                  <Card key={event.id} className="overflow-hidden border-primary/20 bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--primary)/0.08))]">
                    <CardHeader className="gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge>Open Now</Badge>
                          <Badge variant="outline">{event.response_count} votes</Badge>
                        </div>
                        <CardTitle className="text-xl">{event.name}</CardTitle>
                        <CardDescription>{formatEventDateRange(event.date_start, event.date_end)}</CardDescription>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border bg-background/80 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Average score</p>
                          <p className="mt-1 text-lg font-semibold">{formatScore(event.event_eval_score)}</p>
                        </div>
                        <div className="rounded-2xl border bg-background/80 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Closes on</p>
                          <p className="mt-1 text-sm font-semibold">
                            {event.evaluation_deadline ? format(new Date(event.evaluation_deadline), "MMMM d, yyyy") : "Not set"}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter className="justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        Open the detail view to review analytics and end this evaluation.
                      </p>
                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedEventId(event.id)
                          setDetailsOpen(true)
                        }}
                      >
                        <Eye className="size-4" />
                        View Details
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                No events are currently open for evaluation.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Closed Evaluations</h2>
                <p className="text-sm text-muted-foreground">Review past evaluation rounds and reopen them from the dedicated reopen flow if needed.</p>
              </div>
              {closedEvaluations.length > 0 && (
                <div className="flex items-end gap-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Sort by</p>
                    <Select value={closedSort} onValueChange={(v) => setClosedSort(v as SortKey)}>
                      <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {closedEvaluations.length === 0 ? (
              <div className="rounded-[24px] border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                No closed evaluations yet.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sortEvents(closedEvaluations, closedSort).map((event) => {
                  const isCollapsed = collapsedClosed.has(event.id)
                  return (
                    <Card key={event.id} className="border-border/70 transition hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/20">
                      <CardHeader className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle>{event.name}</CardTitle>
                            <CardDescription>{formatEventDateRange(event.date_start, event.date_end)}</CardDescription>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline">Closed</Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0"
                              aria-label={isCollapsed ? "Expand" : "Collapse"}
                              onClick={() => toggleClosedCollapse(event.id)}
                            >
                              {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {!isCollapsed && (
                        <>
                          <CardContent className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Votes</p>
                              <p className="mt-1 font-medium">{event.response_count}</p>
                            </div>
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Score</p>
                              <p className="mt-1 font-medium">{formatScore(event.event_eval_score)}</p>
                            </div>
                          </CardContent>
                          <CardFooter className="justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setSelectedEventId(event.id)
                                setDetailsOpen(true)
                              }}
                            >
                              <Eye className="size-4" />
                              See Details
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setSelectedReopenEventId(event.id)
                                setReopenOpen(true)
                              }}
                            >
                              <RotateCcw className="size-4" />
                              Reopen
                            </Button>
                          </CardFooter>
                        </>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="!max-w-7xl">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.name || "Evaluation Details"}</DialogTitle>
            <DialogDescription>
              View participation, score, close date, and criterion averages for this evaluation.
            </DialogDescription>
          </DialogHeader>

          {selectedEvent ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-2xl border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ClipboardCheck className="size-4" />
                    Responses
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{selectedEvent.response_count}</p>
                </div>
                <div className="rounded-2xl border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ChartColumnBig className="size-4" />
                    Average Score
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{formatScore(selectedEvent.event_eval_score)}</p>
                </div>
                <div className="rounded-2xl border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="size-4" />
                    Event Date
                  </div>
                  <p className="mt-2 text-sm font-medium">{formatEventDateRange(selectedEvent.date_start, selectedEvent.date_end)}</p>
                </div>
                <div className="rounded-2xl border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="size-4" />
                    Closes On
                  </div>
                  <p className="mt-2 text-sm font-medium">
                    {selectedEvent.evaluation_deadline ? format(new Date(selectedEvent.evaluation_deadline), "MMMM d, yyyy") : "Not set"}
                  </p>
                </div>
                <div className="rounded-2xl border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DoorClosed className="size-4" />
                    Status
                  </div>
                  <p className="mt-2 text-sm font-medium">
                    {selectedEvent.evaluation_open ? "Open for submissions" : "Closed"}
                  </p>
                </div>
              </div>

              {criterionAverages.length === 0 || selectedEvent.response_count === 0 ? (
                <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                  No submitted responses for this event yet.
                </div>
              ) : (
                <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
                  {criterionAverages.map((item) => (
                    <Card key={item.criteriaId} className="border-dashed">
                      <CardHeader>
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <CardTitle className="text-base">{item.criteriaDescription}</CardTitle>
                            <CardDescription>{formatCriteriaType(item.criteriaType || "Other")}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{item.totalRatings} ratings</Badge>
                            <Badge>{item.average !== null ? `${item.average.toFixed(1)} / 10` : "No ratings"}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-xl bg-muted/40 p-4">
                          <p className="text-sm text-muted-foreground">Criterion average</p>
                          <p className="mt-2 text-2xl font-semibold">
                            {item.average !== null ? `${item.average.toFixed(1)} / 10` : "No score yet"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            {selectedEvent?.evaluation_open ? (
              <Button type="button" variant="destructive" onClick={closeEvaluation} disabled={pendingAction !== null}>
                {pendingAction === `close:${selectedEventId}` && <Spinner data-icon="inline-start" />}
                End Evaluation
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
