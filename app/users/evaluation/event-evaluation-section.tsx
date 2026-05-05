'use client'

import { useEffect, useMemo, useState } from "react"
import { ClipboardCheck, Sparkles, Star } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { formatCriteriaType, groupCriteriaByType } from "@/lib/evaluation"

type Criteria = {
  id: string
  criteria_description: string
  criteria_type: string
}

type Answer = {
  id?: string
  response_id?: string
  criteria_id: string
  rating_value: number | null
  answer_text: string | null
}

type UserEvent = {
  id: string
  name: string
}

type UserResponse = {
  id: string
  event_id: string
}

type UserEvaluationPayload = {
  error?: string
  openEvents: UserEvent[]
  criteria: Criteria[]
  responses: UserResponse[]
  answers: Answer[]
}

const ratingScale = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export default function UserEventEvaluationSection() {
  const [events, setEvents] = useState<UserEvent[]>([])
  const [criteria, setCriteria] = useState<Criteria[]>([])
  const [responses, setResponses] = useState<UserResponse[]>([])
  const [allAnswers, setAllAnswers] = useState<Answer[]>([])
  const [selectedEventId, setSelectedEventId] = useState("")
  const [draftAnswersByEvent, setDraftAnswersByEvent] = useState<Record<string, Record<string, Answer>>>({})
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const res = await fetch("/api/evaluation/user", { cache: "no-store" })
      const data = (await res.json()) as UserEvaluationPayload

      if (!res.ok) {
        toast.error(data.error || "Unable to load evaluation.", { position: "top-center" })
        setLoading(false)
        return
      }

      const nextEvents = data.openEvents ?? []
      setEvents(nextEvents)
      setCriteria(data.criteria ?? [])
      setResponses(data.responses ?? [])
      setAllAnswers(data.answers ?? [])
      setSelectedEventId(nextEvents[0]?.id ?? "")
      setLoading(false)
    }

    fetchData()
  }, [])

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  )

  const selectedResponse = useMemo(
    () => responses.find((response) => response.event_id === selectedEventId) ?? null,
    [responses, selectedEventId]
  )

  const selectedEventSubmitted = Boolean(selectedResponse)

  const answers = useMemo(() => {
    if (!selectedEventId) {
      return {}
    }

    if (draftAnswersByEvent[selectedEventId]) {
      return draftAnswersByEvent[selectedEventId]
    }

    return criteria.reduce((acc: Record<string, Answer>, item) => {
      const existing = allAnswers.find(
        (answer) => answer.response_id === selectedResponse?.id && answer.criteria_id === item.id
      )

      acc[item.id] = {
        criteria_id: item.id,
        rating_value: existing?.rating_value ?? null,
        answer_text: existing?.answer_text ?? "",
      }

      return acc
    }, {})
  }, [allAnswers, criteria, draftAnswersByEvent, selectedEventId, selectedResponse?.id])

  const groupedCriteria = useMemo(() => groupCriteriaByType(criteria), [criteria])
  const answeredCount = useMemo(
    () => criteria.filter((item) => answers[item.id]?.rating_value).length,
    [answers, criteria]
  )
  const canSubmit = criteria.length > 0 && criteria.every((item) => answers[item.id]?.rating_value)

  const setRating = (criteriaId: string, rating: number) => {
    if (selectedEventSubmitted) return

    setDraftAnswersByEvent((current) => ({
      ...current,
      [selectedEventId]: {
        ...(current[selectedEventId] ?? answers),
        [criteriaId]: {
          criteria_id: criteriaId,
          rating_value: rating,
          answer_text: (current[selectedEventId] ?? answers)[criteriaId]?.answer_text ?? "",
        },
      },
    }))
  }

  const setComment = (criteriaId: string, value: string) => {
    if (selectedEventSubmitted) return

    setDraftAnswersByEvent((current) => ({
      ...current,
      [selectedEventId]: {
        ...(current[selectedEventId] ?? answers),
        [criteriaId]: {
          criteria_id: criteriaId,
          rating_value: (current[selectedEventId] ?? answers)[criteriaId]?.rating_value ?? null,
          answer_text: value,
        },
      },
    }))
  }

  const handleSubmit = async () => {
    if (!selectedEventId) {
      toast.error("Select an evaluation first.", { position: "top-center" })
      return
    }

    if (!canSubmit) {
      toast.error("Please rate every criterion before submitting.", { position: "top-center" })
      return
    }

    setSaving(true)
    const res = await fetch("/api/evaluation/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: selectedEventId,
        answers: Object.values(answers),
      }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(data.error || "Unable to submit evaluation.", { position: "top-center" })
      return
    }

    setResponses((current) => [...current, { id: `submitted-${selectedEventId}`, event_id: selectedEventId }])
    setFormOpen(false)
    toast.success("Evaluation submitted successfully.", { position: "top-center" })
  }

  if (loading) {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed bg-card px-6 py-16 text-center">
        <h2 className="text-xl font-bold">Evaluation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          There are no open evaluations right now. Please wait for an admin to open one.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <section className="rounded-[28px] border bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_38%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--muted)/0.55))] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4" />
              Share your feedback
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Open Evaluations</h2>
            <p className="text-sm text-muted-foreground">
              Multiple event evaluations can be active at the same time. Open any card below to submit or review your response.
            </p>
          </div>
          <Badge variant="outline">{events.length} open events</Badge>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => {
          const isSubmitted = responses.some((response) => response.event_id === event.id)

          return (
            <Card key={event.id} className="overflow-hidden border-primary/20 bg-[linear-gradient(145deg,hsl(var(--card)),hsl(var(--primary)/0.08))]">
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>Live Evaluation</Badge>
                      <Badge variant="outline">{criteria.length} criteria</Badge>
                    </div>
                    <CardTitle className="text-xl">{event.name}</CardTitle>
                    <CardDescription>
                      {isSubmitted
                        ? "Your response is already saved. You can still open the form to review it."
                        : "Open this evaluation to rate each criterion and submit your feedback."}
                    </CardDescription>
                  </div>
                  <Badge variant={isSubmitted ? "secondary" : "default"}>
                    {isSubmitted ? "Submitted" : "Waiting For You"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-muted/45 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ClipboardCheck className="size-4" />
                    What to do
                  </div>
                  <p className="mt-2 text-sm">Rate each criterion from 1 to 10 and add comments only when helpful.</p>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="size-4" />
                    Rating scale
                  </div>
                  <p className="mt-2 text-sm">Higher scores mean stronger performance based on the listed criteria.</p>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="size-4" />
                    Submission
                  </div>
                  <p className="mt-2 text-sm">Each event can only be submitted once, and then it becomes read-only.</p>
                </div>
              </CardContent>

              <CardFooter className="justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {isSubmitted ? "You already completed this evaluation." : "Open the form when you're ready."}
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setSelectedEventId(event.id)
                    setFormOpen(true)
                  }}
                >
                  {isSubmitted ? "Review Submission" : "Start Evaluation"}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="!max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selectedEventSubmitted ? "Your Submitted Evaluation" : "Evaluate Event"}</DialogTitle>
            <DialogDescription>
              {selectedEvent ? `Feedback form for ${selectedEvent.name}.` : "Complete the form below."}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{selectedEvent?.name || "Selected event"}</p>
                <p className="text-muted-foreground">
                  {selectedEventSubmitted ? "Submission saved for this event." : "Please answer all criteria before submitting."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{answeredCount}/{criteria.length} answered</Badge>
                <Badge variant={selectedEventSubmitted ? "secondary" : "default"}>
                  {selectedEventSubmitted ? "Submitted" : "Open"}
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
                                  disabled={selectedEventSubmitted}
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
                            disabled={selectedEventSubmitted}
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
            {!selectedEventSubmitted ? (
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
  )
}
