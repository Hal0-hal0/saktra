'use client'

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Building2, CalendarDays, ChevronDown, ChevronUp, DoorClosed, Eye, PlayCircle, Search, ShieldCheck, Star, UserCheck, UsersRound } from "lucide-react"
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
import { supabase } from "@/lib/supabase/supabase-client"
import { MemberEvalDetailsModal } from "@/components/admin/member-eval-details-modal"

type CycleSortKey = "date-desc" | "date-asc" | "title-asc" | "title-desc" | "responses-desc" | "responses-asc"
type EventSortKey = "date-desc" | "date-asc" | "name-asc" | "name-desc"
type MemberSortKey = "name-asc" | "name-desc" | "role-asc" | "department-asc"

const CYCLE_SORTS: { value: CycleSortKey; label: string }[] = [
  { value: "date-desc", label: "Date (newest first)" },
  { value: "date-asc", label: "Date (oldest first)" },
  { value: "title-asc", label: "Title (A-Z)" },
  { value: "title-desc", label: "Title (Z-A)" },
  { value: "responses-desc", label: "Most responses" },
  { value: "responses-asc", label: "Fewest responses" },
]

const EVENT_SORTS: { value: EventSortKey; label: string }[] = [
  { value: "date-desc", label: "Date (newest first)" },
  { value: "date-asc", label: "Date (oldest first)" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
]

const MEMBER_SORTS: { value: MemberSortKey; label: string }[] = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "role-asc", label: "Role" },
  { value: "department-asc", label: "Department" },
]

type MemberProfile = {
  user_id: string
  user_name: string | null
  email: string | null
  role: string | null
  status: string | null
  department: string | null
  position: string | null
}

type MemberEvaluationCycle = {
  id: string
  title: string
  evaluation_open: boolean
  evaluation_deadline: string | null
  created_at: string
  started_at: string
  response_count: number
}

type AdminMemberEvaluationPayload = {
  error?: string
  cycles: MemberEvaluationCycle[]
  openCycle: MemberEvaluationCycle | null
  openCycles: MemberEvaluationCycle[]
}

function hasMemberValue(value?: string | null): value is string {
  return Boolean(value && value !== "null")
}

function formatMemberValue(value?: string | null) {
  if (!hasMemberValue(value)) return "Not set"
  return value
}

function getMemberName(profile: MemberProfile) {
  if (hasMemberValue(profile.user_name)) {
    return profile.user_name
  }

  if (hasMemberValue(profile.email)) {
    return profile.email
  }

  return "Member"
}

function getInitials(profile: MemberProfile) {
  const source = getMemberName(profile)
  const parts = source.split(/\s+/).filter(Boolean)

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

function formatCycleDate(value?: string | null) {
  if (!value) return "Not set"
  return format(new Date(value), "MMMM d, yyyy")
}

export default function MemberEvaluationSection() {
  const [profiles, setProfiles] = useState<MemberProfile[]>([])
  const [cycles, setCycles] = useState<MemberEvaluationCycle[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [startOpen, setStartOpen] = useState(false)
  const [cycleTitle, setCycleTitle] = useState("Member Evaluation")
  const [evaluationDeadline, setEvaluationDeadline] = useState("")
  const [loading, setLoading] = useState(true)
  // pendingAction keys: "start" | `close:${cycleId}`
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [completedEvents, setCompletedEvents] = useState<{id: number, name: string, date_start?: string | null, date_end?: string | null}[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [closedSort, setClosedSort] = useState<CycleSortKey>("date-desc")
  const [openSort, setOpenSort] = useState<CycleSortKey>("date-desc")
  const [eventPickerSort, setEventPickerSort] = useState<EventSortKey>("date-desc")
  const [memberSort, setMemberSort] = useState<MemberSortKey>("name-asc")
  const [collapsedClosed, setCollapsedClosed] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all")
  const [memberStatusFilter, setMemberStatusFilter] = useState<"all" | "active" | "inactive">("all")

  const toggleClosedCollapse = (id: string) => {
    setCollapsedClosed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sortCycles = (list: MemberEvaluationCycle[], key: CycleSortKey) => {
    const copy = [...list]
    switch (key) {
      case "date-desc": return copy.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
      case "date-asc": return copy.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))
      case "title-asc": return copy.sort((a, b) => a.title.localeCompare(b.title))
      case "title-desc": return copy.sort((a, b) => b.title.localeCompare(a.title))
      case "responses-desc": return copy.sort((a, b) => b.response_count - a.response_count)
      case "responses-asc": return copy.sort((a, b) => a.response_count - b.response_count)
    }
  }

  const sortPickerEvents = <T extends { name: string; date_start?: string | null }>(list: T[], key: EventSortKey): T[] => {
    const copy = [...list]
    switch (key) {
      case "date-desc": return copy.sort((a, b) => (b.date_start ?? "").localeCompare(a.date_start ?? ""))
      case "date-asc": return copy.sort((a, b) => (a.date_start ?? "").localeCompare(b.date_start ?? ""))
      case "name-asc": return copy.sort((a, b) => a.name.localeCompare(b.name))
      case "name-desc": return copy.sort((a, b) => b.name.localeCompare(a.name))
    }
  }

  const sortMembers = (list: MemberProfile[], key: MemberSortKey) => {
    const copy = [...list]
    const nameFor = (p: MemberProfile) => (p.user_name && p.user_name !== "null" ? p.user_name : p.email ?? "")
    switch (key) {
      case "name-asc": return copy.sort((a, b) => nameFor(a).localeCompare(nameFor(b)))
      case "name-desc": return copy.sort((a, b) => nameFor(b).localeCompare(nameFor(a)))
      case "role-asc": return copy.sort((a, b) => (a.role ?? "").localeCompare(b.role ?? ""))
      case "department-asc": return copy.sort((a, b) => (a.department ?? "").localeCompare(b.department ?? ""))
    }
  }

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      setLoading(true)
      const [profilesResult, cyclesResponse, eventsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, user_name, email, role, status, department, position")
          .order("user_name"),
        fetch("/api/member-evaluation/admin", { cache: "no-store" }),
        supabase
          .from("events")
          .select("id, name, date_start, date_end")
          .eq("status", "done")
          .eq("is_hidden", false)
          .order("name")
      ])

      if (!mounted) return

      const cyclesData = (await cyclesResponse.json()) as AdminMemberEvaluationPayload

      if (profilesResult.error || !cyclesResponse.ok) {
        toast.error(profilesResult.error?.message || cyclesData.error || "Unable to load member evaluations.", { position: "top-center" })
        setLoading(false)
        return
      }

      const nextProfiles = (profilesResult.data ?? []) as MemberProfile[]
      const evaluableProfiles = nextProfiles.filter((profile) => profile.role !== "admin")

      setProfiles(nextProfiles)
      setCycles(cyclesData.cycles ?? [])
      setCompletedEvents(eventsResult.data ?? [])
      setSelectedMemberId((current) => current || evaluableProfiles[0]?.user_id || "")
      setLoading(false)
    }

    fetchData()

    return () => {
      mounted = false
    }
  }, [refreshKey])

  const startMemberEvaluation = async () => {
    if (!selectedEventId || !evaluationDeadline) {
      toast.error("Select an event and close date before starting.", { position: "top-center" })
      return
    }

    const selectedEvent = completedEvents.find(e => String(e.id) === selectedEventId)
    const titleToUse = selectedEvent ? `Member Evaluation: ${selectedEvent.name}` : "Member Evaluation"

    setPendingAction("start")
    const res = await fetch("/api/member-evaluation/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleToUse, evaluationDeadline, eventId: selectedEventId }),
    })
    const data = await res.json()
    setPendingAction(null)

    if (!res.ok) {
      toast.error(data.error || "Unable to start member evaluation.", { position: "top-center" })
      return
    }

    setStartOpen(false)
    setSelectedEventId("")
    setEvaluationDeadline("")
    setRefreshKey((value) => value + 1)
    toast.success("Member evaluation started.", { position: "top-center" })
  }

  const closeMemberEvaluation = async (cycleId: string) => {
    setPendingAction(`close:${cycleId}`)
    const res = await fetch("/api/member-evaluation/close", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycleId }),
    })
    const data = await res.json()
    setPendingAction(null)

    if (!res.ok) {
      toast.error(data.error || "Unable to end member evaluation.", { position: "top-center" })
      return
    }

    setRefreshKey((value) => value + 1)
    toast.success("Member evaluation ended.", { position: "top-center" })
  }

  const evaluableProfiles = useMemo(
    () => profiles.filter((profile) => profile.role !== "admin"),
    [profiles]
  )

  const visibleProfiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    const byStatus = memberStatusFilter === "all"
      ? evaluableProfiles
      : evaluableProfiles.filter((profile) => (profile.status ?? "active") === memberStatusFilter)

    if (!query) {
      return byStatus
    }

    return byStatus.filter((profile) => {
      const searchable = [
        profile.user_name,
        profile.email,
        profile.role,
        profile.status,
        profile.department,
        profile.position,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [evaluableProfiles, searchTerm, memberStatusFilter])

  const selectedMember = useMemo(
    () => evaluableProfiles.find((profile) => profile.user_id === selectedMemberId) ?? null,
    [evaluableProfiles, selectedMemberId]
  )

  const activeMemberCount = useMemo(
    () => evaluableProfiles.filter((profile) => profile.status === "active").length,
    [evaluableProfiles]
  )

  const departmentCount = useMemo(() => {
    return new Set(
      evaluableProfiles
        .map((profile) => profile.department)
        .filter((department): department is string => Boolean(department && department !== "null"))
    ).size
  }, [evaluableProfiles])

  const executiveCount = useMemo(
    () => evaluableProfiles.filter((profile) => profile.role === "executive").length,
    [evaluableProfiles]
  )

  const openCycles = useMemo(
    () => cycles.filter((cycle) => cycle.evaluation_open),
    [cycles]
  )

  const closedCycles = useMemo(
    () => cycles.filter((cycle) => !cycle.evaluation_open),
    [cycles]
  )

  if (loading) {
    return (
      <div className="flex min-h-60 items-center justify-center rounded-[24px] border bg-card">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_38%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.55))] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Member evaluation center
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Member Evaluations</h2>
            <p className="text-sm text-muted-foreground">
              Review member-focused evaluation records separately from event feedback.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Dialog open={startOpen} onOpenChange={setStartOpen}>
              <DialogTrigger asChild>
                <Button type="button">
                  <PlayCircle className="size-4" />
                  Start Member Eval
                </Button>
              </DialogTrigger>
              <DialogContent className="!max-w-6xl">
                <DialogHeader>
                  <DialogTitle>Start Member Evaluation</DialogTitle>
                  <DialogDescription>
                    Select a completed event to evaluate its attendees. Each cycle is linked to a specific event to ensure accurate targeting.
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
                      <Select value={eventPickerSort} onValueChange={(v) => setEventPickerSort(v as EventSortKey)}>
                        <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EVENT_SORTS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto pr-2">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {completedEvents.length === 0 ? (
                        <div className="col-span-full rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                          No completed events are available to start an evaluation.
                        </div>
                      ) : (
                        sortPickerEvents(completedEvents, eventPickerSort).map((event) => {
                          const active = selectedEventId === String(event.id)

                          return (
                            <button
                              key={event.id}
                              type="button"
                              className={`rounded-2xl border p-4 text-left transition ${
                                active
                                  ? "border-primary bg-primary/8 ring-2 ring-primary/20"
                                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                              }`}
                              onClick={() => setSelectedEventId(String(event.id))}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium">{event.name}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {event.date_start ? format(new Date(event.date_start), "MMMM d, yyyy") : "Date unavailable"}
                                  </p>
                                </div>
                                {active ? <Badge>Selected</Badge> : <Badge variant="outline">Completed</Badge>}
                              </div>
                              <div className="mt-4 rounded-xl bg-muted/50 p-3 text-sm">
                                <p className="text-muted-foreground">Target Group</p>
                                <p className="mt-1 font-medium text-primary">Event Attendees only</p>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setStartOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={startMemberEvaluation} disabled={pendingAction !== null || !selectedEventId || !evaluationDeadline}>
                    {pendingAction === "start" && <Spinner data-icon="inline-start" />}
                    Start Evaluation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Badge variant="outline">{evaluableProfiles.length} members</Badge>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total members</CardDescription>
            <CardTitle className="text-3xl">{evaluableProfiles.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <UsersRound className="size-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active members</CardDescription>
            <CardTitle className="text-3xl">{activeMemberCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <UserCheck className="size-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Departments</CardDescription>
            <CardTitle className="text-3xl">{departmentCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <Building2 className="size-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Executives</CardDescription>
            <CardTitle className="text-3xl">{executiveCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ShieldCheck className="size-4" />
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">Show:</p>
        {([
          { key: "all", label: `All (${openCycles.length + closedCycles.length})` },
          { key: "open", label: `Open (${openCycles.length})` },
          { key: "closed", label: `Closed (${closedCycles.length})` },
        ] as const).map((option) => (
          <Button
            key={option.key}
            type="button"
            variant={statusFilter === option.key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {(statusFilter === "all" || statusFilter === "open") && (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Open Member Evaluation</h2>
          <p className="text-sm text-muted-foreground">
            Users can evaluate members only while a member evaluation round is open.
          </p>
        </div>

        {openCycles.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Sort by</p>
            <Select value={openSort} onValueChange={(v) => setOpenSort(v as CycleSortKey)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CYCLE_SORTS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {openCycles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {sortCycles(openCycles, openSort).map((cycle) => (
              <Card key={cycle.id} className="overflow-hidden border-primary/20 bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--primary)/0.08))]">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>Open Now</Badge>
                        <Badge variant="outline">{cycle.response_count} responses</Badge>
                      </div>
                      <CardTitle>{cycle.title}</CardTitle>
                      <CardDescription>
                        BOD evaluates Executive Members. Executives evaluate members in their department.
                      </CardDescription>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border bg-background/80 p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <CalendarDays className="size-4" />
                          Closes on
                        </div>
                        <p className="mt-1 text-sm font-semibold">{formatCycleDate(cycle.evaluation_deadline)}</p>
                      </div>
                      <div className="rounded-2xl border bg-background/80 p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <UsersRound className="size-4" />
                          Members
                        </div>
                        <p className="mt-1 text-sm font-semibold">{evaluableProfiles.length} in scope pool</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="justify-end gap-2">
                  <MemberEvalDetailsModal cycleId={cycle.id} cycleTitle={cycle.title}>
                    <Button type="button" variant="outline">
                      <Eye className="size-4" />
                      See Details
                    </Button>
                  </MemberEvalDetailsModal>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => closeMemberEvaluation(cycle.id)}
                    disabled={pendingAction !== null}
                  >
                    {pendingAction === `close:${cycle.id}` && <Spinner data-icon="inline-start" />}
                    End Member Eval
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            No member evaluation is currently open. Start one when you are ready for BOD and Executives to evaluate.
          </div>
        )}
      </section>
      )}

      {(statusFilter === "all" || statusFilter === "closed") && (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Closed Member Evaluations</h2>
          <p className="text-sm text-muted-foreground">Review previous member evaluation rounds.</p>
        </div>

        {closedCycles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Sort by</p>
            <Select value={closedSort} onValueChange={(v) => setClosedSort(v as CycleSortKey)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CYCLE_SORTS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {closedCycles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            No closed member evaluations yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortCycles(closedCycles, closedSort).map((cycle) => {
              const isCollapsed = collapsedClosed.has(cycle.id)
              return (
                <Card key={cycle.id} className="border-border/70">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{cycle.title}</CardTitle>
                        <CardDescription>Closed on {formatCycleDate(cycle.evaluation_deadline)}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">Closed</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0"
                          aria-label={isCollapsed ? "Expand" : "Collapse"}
                          onClick={() => toggleClosedCollapse(cycle.id)}
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
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Responses</p>
                          <p className="mt-1 font-medium">{cycle.response_count}</p>
                        </div>
                        <div className="rounded-xl bg-muted/50 p-3">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                            <DoorClosed className="size-4" />
                            Status
                          </div>
                          <p className="mt-1 font-medium">Closed</p>
                        </div>
                      </CardContent>
                      <CardFooter className="justify-end">
                        <MemberEvalDetailsModal cycleId={cycle.id} cycleTitle={cycle.title}>
                          <Button type="button" variant="outline">
                            <Eye className="size-4" />
                            See Details
                          </Button>
                        </MemberEvalDetailsModal>
                      </CardFooter>
                    </>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="min-h-[460px]">
          <CardHeader className="gap-4">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>Select a member to view their evaluation summary.</CardDescription>
            </div>
            <div className="space-y-2">
              <Select value={memberSort} onValueChange={(v) => setMemberSort(v as MemberSortKey)}>
                <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  {MEMBER_SORTS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-2">
                {([
                  { key: "all", label: `All (${evaluableProfiles.length})` },
                  { key: "active", label: `Active (${evaluableProfiles.filter((p) => (p.status ?? "active") === "active").length})` },
                  { key: "inactive", label: `Inactive (${evaluableProfiles.filter((p) => p.status === "inactive").length})` },
                ] as const).map((option) => (
                  <Button
                    key={option.key}
                    type="button"
                    variant={memberStatusFilter === option.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMemberStatusFilter(option.key)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  className="pl-9"
                  placeholder="Search members"
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {visibleProfiles.length === 0 ? (
              <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                No members found.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {sortMembers(visibleProfiles, memberSort).map((profile) => {
                  const active = selectedMemberId === profile.user_id

                  return (
                    <button
                      key={profile.user_id}
                      type="button"
                      className={`rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-primary bg-primary/8 ring-2 ring-primary/20"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                      }`}
                      onClick={() => setSelectedMemberId(profile.user_id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {getInitials(profile)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{getMemberName(profile)}</p>
                          <p className="truncate text-sm text-muted-foreground">{formatMemberValue(profile.email)}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={profile.status === "active" ? "default" : "secondary"}>
                              {formatMemberValue(profile.status)}
                            </Badge>
                            <Badge variant="outline">{formatMemberValue(profile.role)}</Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[460px]">
          <CardHeader>
            <CardTitle>{selectedMember ? getMemberName(selectedMember) : "Member Details"}</CardTitle>
            <CardDescription>Member evaluation summary and profile context.</CardDescription>
          </CardHeader>

          {selectedMember ? (
            <>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border bg-muted/40 p-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(selectedMember)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{formatMemberValue(selectedMember.email)}</p>
                    <p className="text-sm capitalize text-muted-foreground">
                      {formatMemberValue(selectedMember.department)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-muted/45 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Position</p>
                    <p className="mt-1 font-medium capitalize">{formatMemberValue(selectedMember.position)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/45 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
                    <p className="mt-1 font-medium capitalize">{formatMemberValue(selectedMember.role)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/45 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="mt-1 font-medium capitalize">{formatMemberValue(selectedMember.status)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/45 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Member score</p>
                    <p className="mt-1 font-medium">No score yet</p>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No member evaluation responses are recorded yet.
                </div>
              </CardContent>

              <CardFooter className="justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="size-4" />
                  Member evaluation
                </div>
                <Badge variant="outline">Pending</Badge>
              </CardFooter>
            </>
          ) : (
            <CardContent>
              <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                Select a member to view details.
              </div>
            </CardContent>
          )}
        </Card>
      </section>
    </div>
  )
}
