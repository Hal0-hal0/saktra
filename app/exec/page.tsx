'use client'
import { useEffect, useState, useMemo } from 'react'
import { Building2, Users, CalendarDays, Star, Trophy } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/supabase-client'
import { formatEvaluationRole } from '@/lib/member-evaluation'
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
} from 'recharts'

type Profile = {
  user_id: string
  user_name: string | null
  email: string | null
  role: string | null
  status: string | null
  department: string | null
  position: string | null
  eval_total_score: number | null
}

type ScoreRow = {
  user_id: string
  event_id: number
  average_score: number | null
}

type EventRow = { id: number; name: string; status: string; date_start: string | null }

export default function ExecDashboard() {
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      const { data: claims } = await supabase.auth.getClaims()
      const myId = claims?.claims?.sub
      if (!myId) return

      const { data: me } = await supabase.from('profiles').select('*').eq('user_id', myId).single()
      setMyProfile(me as Profile | null)
      const dept = me?.department ?? ''

      const [pRes, sRes, eRes] = await Promise.all([
        supabase.from('profiles').select('user_id, user_name, email, role, status, department, position, eval_total_score').eq('department', dept),
        supabase.from('user_scores').select('user_id, event_id, average_score'),
        supabase.from('events').select('id, name, status, date_start').or('is_hidden.is.null,is_hidden.eq.false'),
      ])

      setProfiles((pRes.data ?? []) as Profile[])
      setScores((sRes.data ?? []) as ScoreRow[])
      setEvents((eRes.data ?? []) as EventRow[])
      setLoading(false)
    }
    run()
  }, [])

  const deptName = myProfile?.department ?? 'your department'

  const deptStats = useMemo(() => {
    const members = profiles.length
    const active = profiles.filter((p) => p.status === 'active').length
    const userIds = new Set(profiles.map((p) => p.user_id))
    const deptScores = scores.filter((s) => userIds.has(s.user_id) && typeof s.average_score === 'number')
    const avg = deptScores.length
      ? Number((deptScores.reduce((a, b) => a + (b.average_score ?? 0), 0) / deptScores.length).toFixed(2))
      : null
    return { members, active, avg, scored: deptScores.length }
  }, [profiles, scores])

  const positionPie = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of profiles) {
      const key = p.position && p.position !== 'null' ? p.position : 'Member'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
  }, [profiles])

  const memberLeaderboard = useMemo(() => {
    const byUser = new Map<string, number[]>()
    for (const s of scores) {
      if (typeof s.average_score !== 'number') continue
      const list = byUser.get(s.user_id) ?? []
      list.push(s.average_score)
      byUser.set(s.user_id, list)
    }
    return profiles
      .map((p) => {
        const r = byUser.get(p.user_id) ?? []
        const avg = r.length ? Number((r.reduce((a, b) => a + b, 0) / r.length).toFixed(2)) : 0
        return {
          userId: p.user_id,
          name: p.user_name && p.user_name !== 'null' ? p.user_name : p.email ?? 'Unknown',
          avg,
        }
      })
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10)
  }, [profiles, scores])

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
      <div>
        <h1 className="text-2xl font-bold capitalize">Executive Dashboard — {deptName}</h1>
        <p className="text-sm text-muted-foreground">
          Hi {myProfile?.user_name || myProfile?.email}, here's how your department is doing.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="size-4" />} label="Members in dept." value={deptStats.members} sub={`${deptStats.active} active`} />
        <StatCard icon={<Star className="size-4" />} label="Avg member score" value={deptStats.avg !== null ? `${deptStats.avg} / 10` : '—'} sub={`${deptStats.scored} scored entries`} />
        <StatCard icon={<CalendarDays className="size-4" />} label="Events visible" value={events.length} sub={`${events.filter((e) => e.status === 'ongoing').length} ongoing`} />
        <StatCard icon={<Building2 className="size-4" />} label="Department" value={(deptName).split(' ').slice(0, 2).join(' ')} sub={formatEvaluationRole(myProfile?.role)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="size-4" /> Department leaderboard</CardTitle>
            <CardDescription>Top scoring members in your department.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {memberLeaderboard.length === 0 ? (
              <EmptyHint>No scores recorded yet for your department.</EmptyHint>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberLeaderboard} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 10]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Positions in dept.</CardTitle>
            <CardDescription>Officer/member breakdown.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {positionPie.length === 0 ? (
              <EmptyHint>No members yet.</EmptyHint>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={positionPie} dataKey="value" nameKey="name" outerRadius={84} label>
                    {positionPie.map((_, i) => (
                      <Cell key={i} fill={['#7c3aed', '#a855f7', '#ec4899', '#f59e0b', '#10b981'][i % 5]} />
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
        <p className="text-3xl font-bold capitalize">{value}</p>
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
