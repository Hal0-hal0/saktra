'use client'

import { Component, type ReactNode, useEffect, useMemo, useState } from "react"
import { AlertTriangle, Search, ShieldCheck, UsersRound } from "lucide-react"
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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { canEvaluate, formatEvaluationRole, UNAUTHORIZED_EVALUATION_MESSAGE } from "@/lib/member-evaluation"
import { formatCriteriaType, groupCriteriaByType } from "@/lib/evaluation"

type Criteria = {
  id: string
  criteria_description: string
  criteria_type: string
}

type Answer = {
  id?: string
  member_response_id?: string
  criteria_id: string
  rating_value: number | null
  answer_text: string | null
}

type EvaluationProfile = {
  user_id: string
  user_name: string | null
  email: string | null
  role: string | null
  role_label?: string | null
  status: string | null
  department: string | null
  position: string | null
}

type MemberResponse = {
  id: string
  cycle_id: string
  target_user_id: string
  status: string | null
  created_at: string
}

type MemberEvaluationCycle = {
  id: string
  title: string
  evaluation_open: boolean
  evaluation_deadline: string | null
  created_at: string
  started_at: string
  event_id?: number | null
}

type MemberEvaluationPayload = {
  error?: string
  evaluator: EvaluationProfile
  activeCycle: MemberEvaluationCycle | null
  activeCycles: MemberEvaluationCycle[]
  targets: EvaluationProfile[]
  criteria: Criteria[]
  responses: MemberResponse[]
  answers: Answer[]
  rsvps: { user_id: string; event_id: number }[]
}

type ErrorBoundaryState = {
  hasError: boolean
}

const ratingScale = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function hasProfileValue(value?: string | null): value is string {
  return Boolean(value && value !== "null")
}

function formatProfileValue(value?: string | null) {
  return hasProfileValue(value) ? value : "Not set"
}

function getProfileName(profile: EvaluationProfile) {
  if (hasProfileValue(profile.user_name)) return profile.user_name
  if (hasProfileValue(profile.email)) return profile.email
  return "Member"
}

function getInitials(profile: EvaluationProfile) {
  return getProfileName(profile)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

function MemberEvaluationAuthorizationError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4" />
        {message}
      </div>
    </div>
  )
}

class MemberEvaluationErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <MemberEvaluationAuthorizationError message={UNAUTHORIZED_EVALUATION_MESSAGE} />
    }

    return this.props.children
  }
}

export default function MemberEvaluationList() {
  const [evaluator, setEvaluator] = useState<EvaluationProfile | null>(null)
  const [activeCycles, setActiveCycles] = useState<MemberEvaluationCycle[]>([])
  const [selectedCycleId, setSelectedCycleId] = useState("")
  const [targets, setTargets] = useState<EvaluationProfile[]>([])
  const [criteria, setCriteria] = useState<Criteria[]>([])
  const [responses, setResponses] = useState<MemberResponse[]>([])
  const [allAnswers, setAllAnswers] = useState<Answer[]>([])
  const [rsvps, setRsvps] = useState<{ user_id: string; event_id: number }[]>([])
  const [selectedTargetId, setSelectedTargetId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [draftAnswersByTarget, setDraftAnswersByTarget] = useState<Record<string, Record<string, Answer>>>({})
  const [formOpen, setFormOpen] = useState(false)
  const [authError, setAuthError] = useState("")
  const [verifyingTargetId, setVerifyingTargetId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const res = await fetch("/api/member-evaluation/targets", { cache: "no-store" })
      const data = (await res.json()) as MemberEvaluationPayload

      if (!res.ok) {
        toast.error(data.error || "Unable to load member evaluations.", { position: "top-center" })
        setLoading(false)
        return
      }

      setEvaluator(data.evaluator)
      const nextActiveCycles = data.activeCycles ?? (data.activeCycle ? [data.activeCycle] : [])
      setActiveCycles(nextActiveCycles)
      setSelectedCycleId(nextActiveCycles[0]?.id ?? "")
      setTargets(data.targets ?? [])
      setCriteria(data.criteria ?? [])
      setResponses(data.responses ?? [])
      setAllAnswers(data.answers ?? [])
      setRsvps(data.rsvps ?? [])
      setSelectedTargetId(data.targets?.[0]?.user_id ?? "")
      setLoading(false)
    }

    fetchData()
  }, [])

  const selectedTarget = useMemo(
    () => targets.find((target) => target.user_id === selectedTargetId) ?? null,
    [selectedTargetId, targets]
  )

  const selectedCycle = useMemo(
    () => activeCycles.find((cycle) => cycle.id === selectedCycleId) ?? null,
    [activeCycles, selectedCycleId]
  )

  const visibleTargets = useMemo(() => {
    // 1. Filter by RSVP for the selected cycle's event
    let filtered = targets

    if (selectedCycle?.event_id) {
      const attendeeIds = new Set(
        rsvps
          .filter((r) => String(r.event_id) === String(selectedCycle.event_id))
          .map((r) => r.user_id)
      )
      filtered = targets.filter((t) => attendeeIds.has(t.user_id))
    }

    // 2. Filter by Search Query
    const query = searchTerm.trim().toLowerCase()
    if (!query) return filtered

    return filtered.filter((target) => {
      const searchable = [
        target.user_name,
        target.email,
        target.role_label,
        target.department,
        target.position,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [searchTerm, targets, selectedCycle, rsvps])

  const selectedResponse = useMemo(
    () => responses.find((response) => response.cycle_id === selectedCycleId && response.target_user_id === selectedTargetId) ?? null,
    [responses, selectedCycleId, selectedTargetId]
  )

  const selectedTargetSubmitted = Boolean(selectedResponse)

  const answers = useMemo(() => {
    if (!selectedTargetId) {
      return {}
    }

    const draftKey = `${selectedCycleId}:${selectedTargetId}`

    if (draftAnswersByTarget[draftKey]) {
      return draftAnswersByTarget[draftKey]
    }

    return criteria.reduce((acc: Record<string, Answer>, item) => {
      const existing = allAnswers.find(
        (answer) => answer.member_response_id === selectedResponse?.id && answer.criteria_id === item.id
      )

      acc[item.id] = {
        criteria_id: item.id,
        rating_value: existing?.rating_value ?? null,
        answer_text: existing?.answer_text ?? "",
      }

      return acc
    }, {})
  }, [allAnswers, criteria, draftAnswersByTarget, selectedCycleId, selectedResponse?.id, selectedTargetId])

  const groupedCriteria = useMemo(() => groupCriteriaByType(criteria), [criteria])
  const answeredCount = useMemo(
    () => criteria.filter((item) => answers[item.id]?.rating_value).length,
    [answers, criteria]
  )
  const canSubmit = criteria.length > 0 && criteria.every((item) => answers[item.id]?.rating_value)

  const setRating = (criteriaId: string, rating: number) => {
    if (selectedTargetSubmitted) return

    setDraftAnswersByTarget((current) => ({
      ...current,
      [`${selectedCycleId}:${selectedTargetId}`]: {
        ...(current[`${selectedCycleId}:${selectedTargetId}`] ?? answers),
        [criteriaId]: {
          criteria_id: criteriaId,
          rating_value: rating,
          answer_text: (current[`${selectedCycleId}:${selectedTargetId}`] ?? answers)[criteriaId]?.answer_text ?? "",
        },
      },
    }))
  }

  const setComment = (criteriaId: string, value: string) => {
    if (selectedTargetSubmitted) return

    setDraftAnswersByTarget((current) => ({
      ...current,
      [`${selectedCycleId}:${selectedTargetId}`]: {
        ...(current[`${selectedCycleId}:${selectedTargetId}`] ?? answers),
        [criteriaId]: {
          criteria_id: criteriaId,
          rating_value: (current[`${selectedCycleId}:${selectedTargetId}`] ?? answers)[criteriaId]?.rating_value ?? null,
          answer_text: value,
        },
      },
    }))
  }

  const openEvaluationForm = async (target: EvaluationProfile) => {
    setAuthError("")

    if (
      !evaluator ||
      !canEvaluate({
        evaluatorId: evaluator.user_id,
        evaluatorRole: evaluator.role,
        evaluatorDepartment: evaluator.department,
        evaluatorPosition: evaluator.position,
        targetId: target.user_id,
        targetRole: target.role,
        targetDepartment: target.department,
        targetPosition: target.position,
      })
    ) {
      setAuthError(UNAUTHORIZED_EVALUATION_MESSAGE)
      return
    }

    setVerifyingTargetId(target.user_id)
    const res = await fetch("/api/member-evaluation/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: target.user_id, cycleId: selectedCycleId }),
    })
    const data = await res.json()
    setVerifyingTargetId("")

    if (!res.ok) {
      setAuthError(data.error || UNAUTHORIZED_EVALUATION_MESSAGE)
      toast.error(data.error || UNAUTHORIZED_EVALUATION_MESSAGE, { position: "top-center" })
      return
    }

    setSelectedTargetId(target.user_id)
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedTargetId) {
      toast.error("Select a member first.", { position: "top-center" })
      return
    }

    if (!canSubmit) {
      toast.error("Please rate every criterion before submitting.", { position: "top-center" })
      return
    }

    setSaving(true)
    const res = await fetch("/api/member-evaluation/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: selectedTargetId,
        cycleId: selectedCycleId,
        answers: Object.values(answers),
      }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      const message = data.error || "Unable to submit member evaluation."
      if (message === UNAUTHORIZED_EVALUATION_MESSAGE) {
        setAuthError(message)
      }
      toast.error(message, { position: "top-center" })
      return
    }

    setResponses((current) => [
      ...current,
      {
        id: `submitted-${selectedCycleId}-${selectedTargetId}`,
        cycle_id: selectedCycleId,
        target_user_id: selectedTargetId,
        status: "submitted",
        created_at: new Date().toISOString(),
      },
    ])
    setFormOpen(false)
    toast.success("Member evaluation submitted successfully.", { position: "top-center" })
  }

  if (loading) {
    return (
      <div className="flex min-h-60 items-center justify-center rounded-[24px] border bg-card">
        <Spinner />
      </div>
    )
  }

  return (
    <MemberEvaluationErrorBoundary>
      <div className="space-y-6">
        <section className="rounded-[28px] border bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_38%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--muted)/0.55))] p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4" />
                Role-based evaluation
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Available To Evaluate</h2>
              <p className="text-sm text-muted-foreground">
                {evaluator?.role === "bod"
                  ? "Board of Directors can evaluate Executive Members across all departments."
                  : evaluator?.role === "executive"
                    ? "Executive Members can evaluate members in their assigned department only."
                    : "Members do not have member-evaluation access."}
              </p>
            </div>
            <Badge variant="outline">
              {evaluator ? formatEvaluationRole(evaluator.role) : "Unknown"}
            </Badge>
          </div>
        </section>

        {authError ? <MemberEvaluationAuthorizationError message={authError} /> : null}

        {activeCycles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            No member evaluation is open right now. Please wait for an admin to start a member evaluation round.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {activeCycles.map((cycle) => {
              const active = selectedCycleId === cycle.id

              return (
                <button
                  key={cycle.id}
                  type="button"
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-primary bg-primary/8 ring-2 ring-primary/20"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                  }`}
                  onClick={() => setSelectedCycleId(cycle.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{cycle.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Open until {cycle.evaluation_deadline || "no deadline set"}
                      </p>
                    </div>
                    {active ? <Badge>Selected</Badge> : <Badge variant="outline">Open</Badge>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {selectedCycle ? <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Evaluation Targets</CardTitle>
                <CardDescription>
                  Filtered by your role, department, and self-evaluation restrictions.
                </CardDescription>
              </div>
              <Badge variant="outline">{targets.length} available</Badge>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                className="pl-9"
                placeholder="Search by name, email, department, or position"
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </CardHeader>

          <CardContent>
            {visibleTargets.length === 0 ? (
              <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
                No members are available for you to evaluate.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {visibleTargets.map((target) => {
                  const isSubmitted = responses.some((response) => response.target_user_id === target.user_id && response.cycle_id === selectedCycleId)
                  const isVerifying = verifyingTargetId === target.user_id

                  return (
                    <Card key={target.user_id} className="border-border/70">
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {getInitials(target)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-base">{getProfileName(target)}</CardTitle>
                            <CardDescription className="truncate">{formatProfileValue(target.email)}</CardDescription>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge>{target.role_label || formatEvaluationRole(target.role)}</Badge>
                              <Badge variant="outline">{formatProfileValue(target.department)}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-muted/45 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Position</p>
                          <p className="mt-1 font-medium">{formatProfileValue(target.position)}</p>
                        </div>
                        <div className="rounded-xl bg-muted/45 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                          <p className="mt-1 font-medium capitalize">{isSubmitted ? "Submitted" : "Pending"}</p>
                        </div>
                      </CardContent>
                      <CardFooter className="justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <UsersRound className="size-4" />
                          Member evaluation
                        </div>
                        <Button
                          type="button"
                          className={
                            isSubmitted
                              ? "bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                              : undefined
                          }
                          onClick={() => openEvaluationForm(target)}
                          disabled={isVerifying}
                        >
                          {isVerifying && <Spinner data-icon="inline-start" />}
                          {isSubmitted ? "Review" : "Evaluate"}
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card> : null}

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="!max-w-5xl">
            <DialogHeader>
              <DialogTitle>{selectedTargetSubmitted ? "Submitted Member Evaluation" : "Evaluate Member"}</DialogTitle>
              <DialogDescription>
                {selectedTarget ? `Evaluation form for ${getProfileName(selectedTarget)}.` : "Complete the form below."}
              </DialogDescription>
            </DialogHeader>

            {authError ? <MemberEvaluationAuthorizationError message={authError} /> : null}

            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{selectedTarget ? getProfileName(selectedTarget) : "Selected member"}</p>
                  <p className="text-muted-foreground">
                    {selectedTargetSubmitted ? "Submission saved for this member." : "Please answer all criteria before submitting."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{answeredCount}/{criteria.length} answered</Badge>
                  <Badge variant={selectedTargetSubmitted ? "secondary" : "default"}>
                    {selectedTargetSubmitted ? "Submitted" : "Open"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
              {Object.entries(groupedCriteria).map(([type, items]) => (
                <Card key={type} className="border-border/70">
                  <CardHeader>
                    <CardTitle>{formatCriteriaType(type)}</CardTitle>
                    <CardDescription>Rate each item from 1 to 10.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {items.map((item) => {
                      const currentAnswer = answers[item.id]

                      return (
                        <div key={item.id} className="space-y-4">
                          <div className="space-y-2">
                            <p className="font-medium">{item.criteria_description}</p>
                            <div className="flex flex-wrap gap-2">
                              {ratingScale.map((rating) => {
                                const selected = currentAnswer?.rating_value === rating

                                return (
                                  <Button
                                    key={rating}
                                    type="button"
                                    variant={selected ? "default" : "outline"}
                                    className="min-w-10"
                                    disabled={selectedTargetSubmitted}
                                    onClick={() => setRating(item.id, rating)}
                                  >
                                    {rating}
                                  </Button>
                                )
                              })}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Optional comment</p>
                            <Textarea
                              value={currentAnswer?.answer_text ?? ""}
                              disabled={selectedTargetSubmitted}
                              placeholder="Share a short note if needed."
                              onChange={(event) => setComment(item.id, event.target.value)}
                            />
                          </div>

                          <Separator />
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter>
              {!selectedTargetSubmitted ? (
                <Button type="button" onClick={handleSubmit} disabled={saving || !canSubmit}>
                  {saving && <Spinner data-icon="inline-start" />}
                  Submit Evaluation
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MemberEvaluationErrorBoundary>
  )
}
