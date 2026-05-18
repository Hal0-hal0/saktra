"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { formatEvaluationRole } from "@/lib/member-evaluation"

type Profile = {
  user_id: string
  user_name: string | null
  email: string | null
  role: string | null
  status: string | null
  department: string | null
  position: string | null
  user_scores?: { average_score: number | null }[]
}

const POSITION_COLORS = ["#7c3aed", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9"]

export function DepartmentAnalyticsModal({
  department,
  departmentLabel,
  profiles,
  children,
}: {
  department: string
  departmentLabel: string
  profiles: Profile[]
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)

  const deptProfiles = React.useMemo(
    () => profiles.filter((p) => p.department === department),
    [profiles, department],
  )

  const memberScores = React.useMemo(() => {
    return deptProfiles
      .map((p) => {
        const score = p.user_scores?.[0]?.average_score ?? null
        return {
          name: p.user_name && p.user_name !== "null" ? p.user_name : p.email ?? "Unknown",
          score: typeof score === "number" ? Number(score.toFixed(2)) : 0,
          role: formatEvaluationRole(p.role),
        }
      })
      .sort((a, b) => b.score - a.score)
  }, [deptProfiles])

  const scoredCount = memberScores.filter((m) => m.score > 0).length
  const avg = scoredCount
    ? Number(
        (memberScores.filter((m) => m.score > 0).reduce((s, m) => s + m.score, 0) / scoredCount).toFixed(2),
      )
    : null

  const positionPie = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of deptProfiles) {
      const key = p.position && p.position !== "null" ? p.position : "Member"
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
  }, [deptProfiles])

  const statusBreakdown = React.useMemo(() => {
    const active = deptProfiles.filter((p) => p.status === "active").length
    const inactive = deptProfiles.length - active
    return [
      { name: "Active", value: active },
      { name: "Inactive", value: inactive },
    ].filter((d) => d.value > 0)
  }, [deptProfiles])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="!max-w-5xl">
        <DialogHeader>
          <DialogTitle className="capitalize">{departmentLabel} — Analytics</DialogTitle>
          <DialogDescription>
            Score breakdown and composition for this department.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="Members" value={deptProfiles.length} />
          <Stat label="Scored" value={scoredCount} />
          <Stat label="Avg score" value={avg !== null ? `${avg} / 10` : "—"} />
          <Stat label="Status" value={`${statusBreakdown.find((s) => s.name === "Active")?.value ?? 0} active`} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-3">
            <p className="text-sm font-medium mb-2">Member scores</p>
            <div className="h-72">
              {memberScores.length === 0 ? (
                <Empty>No members in this department.</Empty>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberScores} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" domain={[0, 10]} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border p-3">
              <p className="text-sm font-medium mb-2">Positions</p>
              <div className="h-32">
                {positionPie.length === 0 ? (
                  <Empty>No data.</Empty>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={positionPie} dataKey="value" nameKey="name" outerRadius={50} label={false}>
                        {positionPie.map((_, i) => (
                          <Cell key={i} fill={POSITION_COLORS[i % POSITION_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-sm font-medium mb-2">Active vs inactive</p>
              <div className="h-32">
                {statusBreakdown.length === 0 ? (
                  <Empty>No data.</Empty>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusBreakdown} dataKey="value" nameKey="name" outerRadius={50} label>
                        {statusBreakdown.map((d, i) => (
                          <Cell key={i} fill={d.name === "Active" ? "#10b981" : "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border max-h-60 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Member</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-left font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {memberScores.map((m) => (
                <tr key={m.name} className="border-t">
                  <td className="px-4 py-2">{m.name}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{m.role}</td>
                  <td className="px-4 py-2 font-medium">
                    {m.score > 0 ? (
                      <Badge>{m.score.toFixed(2)} / 10</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      {children}
    </div>
  )
}
