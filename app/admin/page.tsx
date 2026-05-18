'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  Users,
  CalendarDays,
  Trophy,
  Star,
  ShieldCheck,
  BarChart3,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/supabase-client'
import { formatEvaluationRole, departmentOptions } from '@/lib/member-evaluation'
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
  LineChart,
  Line,
} from 'recharts'

const CHART_COLORS = ['#7c3aed', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9']

type Profile = {
  user_id: string
  user_name: string | null
  email: string | null
  role: string | null
  status: string | null
  department: string | null
  membership_status: string | null
  eval_total_score: number | null
  created_at: string
}

type EventRow = {
  id: number
  name: string
  status: string
  date_start: string | null
  date_end: string | null
  event_eval_score: number | null
  evaluation_open: boolean
  is_hidden: boolean | null
}

type ScoreRow = {
  user_id: string
  event_id: number
  average_score: number | null
  created_at: string | null
}

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const [pRes, eRes, sRes] = await Promise.all([
        supabase.from('profiles').select('user_id, user_name, email, role, status, department, membership_status, eval_total_score, created_at'),
        supabase.from('events').select('id, name, status, date_start, date_end, event_eval_score, evaluation_open, is_hidden').or('is_hidden.is.null,is_hidden.eq.false'),
        supabase.from('user_scores').select('user_id, event_id, average_score, created_at'),
      ])
      setProfiles((pRes.data ?? []) as Profile[])
      setEvents((eRes.data ?? []) as EventRow[])
      setScores((sRes.data ?? []) as ScoreRow[])
      setLoading(false)
    }
    fetch()
  }, [])

  const stats = useMemo(() => {
    const total = profiles.length
    const active = profiles.filter((p) => p.status === 'active').length
    const bod = profiles.filter((p) => p.role === 'admin' || p.role === 'bod').length
    const execs = profiles.filter((p) => p.role === 'executive').length
    const members = profiles.filter((p) => p.role === 'user').length
    const paid = profiles.filter((p) => p.membership_status === 'paid').length
    const totalEvents = events.length
    const ongoing = events.filter((e) => e.status === 'ongoing').length
    const done = events.filter((e) => e.status === 'done').length
    const avgEventScore = (() => {
      const xs = events.map((e) => e.event_eval_score).filter((v): v is number => typeof v === 'number')
      if (!xs.length) return null
      return Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2))
    })()
    return { total, active, bod, execs, members, paid, totalEvents, ongoing, done, avgEventScore }
  }, [profiles, events])

  const membersByDept = useMemo(() => {
    return departmentOptions.map((dept) => ({
      name: dept.label.replace(' Department', ''),
      members: profiles.filter((p) => p.department === dept.value).length,
    }))
  }, [profiles])

  const eventStatusPie = useMemo(
    () => [
      { name: 'Ongoing', value: stats.ongoing },
      { name: 'Done', value: stats.done },
    ].filter((d) => d.value > 0),
    [stats.ongoing, stats.done]
  )

  const membershipPie = useMemo(
    () => [
      { name: 'Paid', value: stats.paid },
      { name: 'Unpaid', value: stats.total - stats.paid },
    ].filter((d) => d.value > 0),
    [stats.paid, stats.total]
  )

  const eventScoreTrend = useMemo(() => {
    return events
      .filter((e) => e.date_start && typeof e.event_eval_score === 'number')
      .sort((a, b) => (a.date_start ?? '').localeCompare(b.date_start ?? ''))
      .slice(-12)
      .map((e) => ({
        name: e.name.length > 14 ? e.name.slice(0, 13) + '…' : e.name,
        score: Number((e.event_eval_score ?? 0).toFixed(2)),
      }))
  }, [events])

  const topScorers = useMemo(() => {
    const byUser = new Map<string, { ratings: number[]; events: Set<number> }>()
    for (const s of scores) {
      if (typeof s.average_score !== 'number') continue
      const bucket = byUser.get(s.user_id) ?? { ratings: [], events: new Set<number>() }
      bucket.ratings.push(s.average_score)
      bucket.events.add(s.event_id)
      byUser.set(s.user_id, bucket)
    }
    const rows = Array.from(byUser.entries())
      .map(([userId, { ratings, events }]) => {
        const p = profiles.find((x) => x.user_id === userId)
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
        return {
          userId,
          name: p?.user_name && p.user_name !== 'null' ? p.user_name : p?.email ?? 'Unknown',
          avg: Number(avg.toFixed(2)),
          events: events.size,
        }
      })
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8)
    return rows
  }, [scores, profiles])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">BOD Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Snapshot of members, events, scores and membership across the organization.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="size-4" />} label="Total Members" value={stats.total} sub={`${stats.active} active`} />
        <StatCard icon={<ShieldCheck className="size-4" />} label="Board of Directors" value={stats.bod} sub={`${stats.execs} executives · ${stats.members} members`} />
        <StatCard icon={<CalendarDays className="size-4" />} label="Events" value={stats.totalEvents} sub={`${stats.ongoing} ongoing · ${stats.done} done`} />
        <StatCard icon={<Star className="size-4" />} label="Avg Event Score" value={stats.avgEventScore !== null ? `${stats.avgEventScore} / 10` : '—'} sub={`${stats.paid} paid memberships`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="size-4" /> Members by department</CardTitle>
            <CardDescription>Distribution across the four departments.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={membersByDept} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="members" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events status</CardTitle>
            <CardDescription>Visible (non-hidden) events.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {eventStatusPie.length === 0 ? (
              <EmptyHint>No events yet.</EmptyHint>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={eventStatusPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={84} label>
                    {eventStatusPie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="size-4" /> Event evaluation trend</CardTitle>
            <CardDescription>Average score across the last 12 evaluated events.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {eventScoreTrend.length === 0 ? (
              <EmptyHint>No evaluation scores yet.</EmptyHint>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={eventScoreTrend} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership</CardTitle>
            <CardDescription>Paid vs unpaid status.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {membershipPie.length === 0 ? (
              <EmptyHint>No members yet.</EmptyHint>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={membershipPie} dataKey="value" nameKey="name" outerRadius={84} label>
                    {membershipPie.map((d, i) => (
                      <Cell key={i} fill={d.name === 'Paid' ? '#10b981' : '#f59e0b'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="size-4" /> Top scorers</CardTitle>
            <CardDescription>Members with the highest average evaluation score.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {topScorers.length === 0 ? (
              <EmptyHint>No scores recorded yet.</EmptyHint>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topScorers} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 10]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#a855f7" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
      {children}
    </div>
  )
}
