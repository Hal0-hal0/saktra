'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Trophy, Star, CalendarCheck, ScanLine, Award, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/supabase-client'
import { formatEvaluationRole } from '@/lib/member-evaluation'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts'

type Profile = {
  user_id: string
  user_name: string | null
  email: string | null
  role: string | null
  department: string | null
  position: string | null
  eval_total_score: number | null
  membership_status: string | null
}

type ScoreRow = {
  user_id: string
  event_id: number
  event_evaluation_score: number | null
  member_evaluation_score: number | null
  average_score: number | null
  created_at: string | null
}

type EventLite = { id: number; name: string; date_start: string | null }

type RsvpRow = {
  event_id: number
  status: string | null
  checked_in_at: string | null
  points_awarded: number | null
}

export default function UserDashboard() {
  const [me, setMe] = useState<Profile | null>(null)
  const [myScores, setMyScores] = useState<ScoreRow[]>([])
  const [eventMap, setEventMap] = useState<Map<number, string>>(new Map())
  const [myRsvp, setMyRsvp] = useState<RsvpRow[]>([])
  const [rank, setRank] = useState<{ position: number; total: number; myAvg: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      const { data: claims } = await supabase.auth.getClaims()
      const myId = claims?.claims?.sub
      if (!myId) return

      const [meRes, myScoresRes, eventsRes, rsvpRes, allScoresRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', myId).single(),
        supabase.from('user_scores').select('user_id, event_id, event_evaluation_score, member_evaluation_score, average_score, created_at').eq('user_id', myId).order('created_at', { ascending: true }),
        supabase.from('events').select('id, name, date_start'),
        supabase.from('event_rsvp').select('event_id, status, checked_in_at, points_awarded').eq('user_id', myId),
        supabase.from('user_scores').select('user_id, average_score'),
      ])

      setMe(meRes.data as Profile | null)
      setMyScores((myScoresRes.data ?? []) as ScoreRow[])
      setEventMap(new Map(((eventsRes.data ?? []) as EventLite[]).map((e) => [e.id, e.name])))
      setMyRsvp((rsvpRes.data ?? []) as RsvpRow[])

      // Compute leaderboard rank
      const byUser = new Map<string, number[]>()
      for (const s of (allScoresRes.data ?? []) as ScoreRow[]) {
        if (typeof s.average_score !== 'number') continue
        const list = byUser.get(s.user_id) ?? []
        list.push(s.average_score)
        byUser.set(s.user_id, list)
      }
      const averages = Array.from(byUser.entries())
        .map(([uid, xs]) => ({ uid, avg: xs.reduce((a, b) => a + b, 0) / xs.length }))
        .sort((a, b) => b.avg - a.avg)
      const idx = averages.findIndex((row) => row.uid === myId)
      if (idx >= 0) {
        setRank({ position: idx + 1, total: averages.length, myAvg: Number(averages[idx].avg.toFixed(2)) })
      } else {
        setRank({ position: 0, total: averages.length, myAvg: 0 })
      }

      setLoading(false)
    }
    run()
  }, [])

  const stats = useMemo(() => {
    const totalPoints = Number(me?.eval_total_score ?? 0)
    const attended = myRsvp.filter((r) => r.checked_in_at).length
    const accepted = myRsvp.filter((r) => r.status === 'accepted').length
    const myAvg = myScores.length
      ? Number((myScores.reduce((a, s) => a + (s.average_score ?? 0), 0) / myScores.length).toFixed(2))
      : null
    return { totalPoints, attended, accepted, myAvg }
  }, [me, myRsvp, myScores])

  const scoreTrend = useMemo(() => {
    return myScores
      .filter((s) => s.created_at && typeof s.average_score === 'number')
      .slice(-12)
      .map((s) => ({
        name: eventMap.get(s.event_id) ?? `Event #${s.event_id}`,
        score: Number((s.average_score ?? 0).toFixed(2)),
      }))
  }, [myScores, eventMap])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-28" />))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hi, {me?.user_name && me.user_name !== 'null' ? me.user_name : me?.email}</h1>
          <p className="text-sm text-muted-foreground">
            <Badge variant="outline" className="mr-2">{formatEvaluationRole(me?.role)}</Badge>
            {me?.department && me.department !== 'null' ? <span className="capitalize">{me.department}</span> : 'No department'} · {me?.membership_status === 'paid' ? 'Paid' : 'Unpaid'} member
          </p>
        </div>
        <Link href="/users/scan">
          <Button>
            <ScanLine className="size-4" />
            Scan Attendance QR
          </Button>
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Award className="size-4" />} label="Total points" value={stats.totalPoints} sub="Earned from check-ins & evaluations" />
        <StatCard icon={<Star className="size-4" />} label="Average score" value={stats.myAvg !== null ? `${stats.myAvg} / 10` : '—'} sub={`${myScores.length} evaluations`} />
        <StatCard icon={<CalendarCheck className="size-4" />} label="Events attended" value={stats.attended} sub={`${stats.accepted} accepted in total`} />
        <StatCard icon={<Trophy className="size-4" />} label="Leaderboard" value={rank && rank.position > 0 ? `#${rank.position} of ${rank.total}` : '—'} sub="Across all scored members" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4" /> My score over time</CardTitle>
            <CardDescription>Your last {scoreTrend.length} evaluated events.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {scoreTrend.length === 0 ? (
              <EmptyHint>You don't have any scored events yet.</EmptyHint>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreTrend} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <defs>
                    <linearGradient id="myScoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2.5} fill="url(#myScoreFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent check-ins</CardTitle>
            <CardDescription>Events where you scanned the QR.</CardDescription>
          </CardHeader>
          <CardContent>
            {myRsvp.filter((r) => r.checked_in_at).length === 0 ? (
              <EmptyHint>You haven't checked into any event yet. Use the Scan button above.</EmptyHint>
            ) : (
              <div className="divide-y rounded-xl border max-h-72 overflow-y-auto">
                {myRsvp
                  .filter((r) => r.checked_in_at)
                  .sort((a, b) => (b.checked_in_at ?? '').localeCompare(a.checked_in_at ?? ''))
                  .map((r) => (
                    <div key={r.event_id} className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium text-sm">{eventMap.get(r.event_id) ?? `Event #${r.event_id}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.checked_in_at!).toLocaleString()}
                        </p>
                      </div>
                      <Badge>+{Number(r.points_awarded ?? 0)} pts</Badge>
                    </div>
                  ))}
              </div>
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
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
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground p-6 text-center">
      {children}
    </div>
  )
}
