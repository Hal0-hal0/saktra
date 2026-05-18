"use client"

import * as React from "react"
import { toast } from "sonner"
import { Star, UsersRound, UserCheck, ClipboardCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatEvaluationRole } from "@/lib/member-evaluation"

type ProfileLite = {
  user_id: string
  user_name: string | null
  email: string | null
  role: string | null
  department: string | null
}

type DetailsPayload = {
  cycle: {
    id: string
    title: string
    evaluation_open: boolean
    evaluation_deadline: string | null
  }
  overallAverage: number | null
  totals: { responses: number; evaluators: number; evaluated: number; ratings: number }
  evaluators: (ProfileLite & { submittedCount: number })[]
  evaluated: (ProfileLite & {
    averageRating: number | null
    totalRatings: number
    evaluatorCount: number
  })[]
}

function nameOf(p: ProfileLite) {
  if (p.user_name && p.user_name !== "null") return p.user_name
  if (p.email) return p.email
  return "Member"
}

export function MemberEvalDetailsModal({
  cycleId,
  cycleTitle,
  children,
}: {
  cycleId: string
  cycleTitle: string
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [data, setData] = React.useState<DetailsPayload | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    let mounted = true
    const fetchDetails = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/member-evaluation/details?cycleId=${encodeURIComponent(cycleId)}`,
          { cache: "no-store" },
        )
        const json = await res.json()
        if (!mounted) return
        if (!res.ok) {
          toast.error(json.error ?? "Unable to load details", { position: "top-center" })
          return
        }
        setData(json)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchDetails()
    return () => {
      mounted = false
    }
  }, [open, cycleId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="!max-w-5xl">
        <DialogHeader>
          <DialogTitle>{cycleTitle}</DialogTitle>
          <DialogDescription>
            Who evaluated, who was evaluated, and the average rating per person.
          </DialogDescription>
        </DialogHeader>

        {loading || !data ? (
          <div className="flex min-h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <SummaryStat icon={<ClipboardCheck className="size-4" />} label="Responses" value={data.totals.responses} />
              <SummaryStat icon={<UserCheck className="size-4" />} label="Evaluators" value={data.totals.evaluators} />
              <SummaryStat icon={<UsersRound className="size-4" />} label="Evaluated" value={data.totals.evaluated} />
              <SummaryStat
                icon={<Star className="size-4" />}
                label="Overall average"
                value={data.overallAverage !== null ? `${data.overallAverage.toFixed(2)} / 10` : "—"}
              />
            </div>

            <Tabs defaultValue="evaluated" className="space-y-4">
              <TabsList>
                <TabsTrigger value="evaluated">Evaluated members ({data.evaluated.length})</TabsTrigger>
                <TabsTrigger value="evaluators">Evaluators ({data.evaluators.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="evaluated" className="space-y-2">
                {data.evaluated.length === 0 ? (
                  <EmptyHint>No one has been evaluated yet in this cycle.</EmptyHint>
                ) : (
                  <div className="max-h-[55vh] overflow-y-auto divide-y rounded-xl border">
                    {data.evaluated.map((p) => (
                      <div key={p.user_id} className="flex items-center gap-3 p-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {nameOf(p).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{nameOf(p)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatEvaluationRole(p.role)} {p.department ? `· ${p.department}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge>
                            {p.averageRating !== null ? `${p.averageRating.toFixed(2)} / 10` : "No score"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {p.evaluatorCount} {p.evaluatorCount === 1 ? "evaluator" : "evaluators"} · {p.totalRatings} ratings
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="evaluators" className="space-y-2">
                {data.evaluators.length === 0 ? (
                  <EmptyHint>No evaluator has submitted yet.</EmptyHint>
                ) : (
                  <div className="max-h-[55vh] overflow-y-auto divide-y rounded-xl border">
                    {data.evaluators.map((p) => (
                      <div key={p.user_id} className="flex items-center gap-3 p-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {nameOf(p).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{nameOf(p)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatEvaluationRole(p.role)} {p.department ? `· ${p.department}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline">{p.submittedCount} submitted</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SummaryStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
