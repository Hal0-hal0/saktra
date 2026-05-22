'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/supabase-client'
import { TruncatedCell } from '@/components/ui/truncated-cell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RotateCcw, History, ChartBarIcon, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

interface MemberScoreSummary {
  user_id: string
  user_name: string
  membership_status: string
  average_score: number
  total_events: number
  highest_score: number
  event_attendance: number
  scores: any[]
}

interface ResetLogRow {
  id: string
  cycle_id: string
  cycle_label: string
  cycle_year: number
  trigger: 'manual' | 'yearly'
  triggered_by: string | null
  archived_rows: number
  affected_users: number
  created_at: string
}

interface EventScoreRow {
  id: number
  name: string
  status: string | null
  event_eval_score: number | null
  date_start: string | null
  date_end: string | null
  response_count: number
}

interface HistoryDetailRow {
  id: string
  user_id: string
  event_id: number | null
  event_evaluation_score: number | null
  member_evaluation_score: number | null
  average_score: number | null
  source_created_at: string | null
  user_name: string | null
  user_email: string | null
  event_name: string | null
}

export default function AdminScoresPage() {
  const [summaries, setSummaries] = useState<MemberScoreSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('score')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedMember, setSelectedMember] = useState<MemberScoreSummary | null>(null)
  const [resetHistory, setResetHistory] = useState<ResetLogRow[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [eventScores, setEventScores] = useState<EventScoreRow[]>([])
  const [eventSortBy, setEventSortBy] = useState<'name' | 'status' | 'date' | 'responses' | 'score'>('score')
  const [eventSortDir, setEventSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null)
  const [cycleDetails, setCycleDetails] = useState<Record<string, HistoryDetailRow[]>>({})
  const [cycleDetailsLoading, setCycleDetailsLoading] = useState<Record<string, boolean>>({})

  const handleEventSort = (key: typeof eventSortBy) => {
    if (eventSortBy === key) {
      setEventSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setEventSortBy(key)
      setEventSortDir(key === 'name' || key === 'status' ? 'asc' : 'desc')
    }
  }

  const sortedEventScores = useMemo(() => {
    const dir = eventSortDir === 'asc' ? 1 : -1
    const compareNumberWithNull = (a: number | null, b: number | null) => {
      if (a === b) return 0
      if (a === null) return 1
      if (b === null) return -1
      return a - b
    }
    return [...eventScores].sort((a, b) => {
      switch (eventSortBy) {
        case 'name':
          return dir * a.name.localeCompare(b.name)
        case 'status':
          return dir * (a.status ?? '').localeCompare(b.status ?? '')
        case 'date':
          return dir * (a.date_start ?? '').localeCompare(b.date_start ?? '')
        case 'responses':
          return dir * (a.response_count - b.response_count)
        case 'score':
        default:
          return dir * compareNumberWithNull(a.event_eval_score, b.event_eval_score)
      }
    })
  }, [eventScores, eventSortBy, eventSortDir])

  const SortIcon = ({ active }: { active: boolean }) => {
    if (!active) return <ArrowUpDown className="size-3.5 text-muted-foreground/60" />
    return eventSortDir === 'asc'
      ? <ArrowUp className="size-3.5" />
      : <ArrowDown className="size-3.5" />
  }

  useEffect(() => {
    fetchScores()
    fetchResetHistory()
    fetchEventScores()
  }, [])

  const fetchEventScores = async () => {
    // Server-side endpoint bypasses RLS on `response` so admins see the full
    // count across every user (not just rows their own role can read).
    const res = await fetch('/api/scores/event-scores', { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json?.error ?? 'Failed to load event scores', { position: 'top-center' })
      return
    }
    setEventScores((json.rows ?? []) as EventScoreRow[])
  }

  const handleResetEventScores = async () => {
    const res = await fetch('/api/scores/reset-events', { method: 'POST' })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error ?? 'Event scores reset failed')
    toast.success(`Archived ${json.archivedRows} event score(s).`, { position: 'top-center' })
    await Promise.all([fetchEventScores(), fetchResetHistory()])
  }

  const toggleCycleDetails = async (cycleId: string) => {
    if (expandedCycleId === cycleId) {
      setExpandedCycleId(null)
      return
    }
    setExpandedCycleId(cycleId)
    if (cycleDetails[cycleId]) return
    setCycleDetailsLoading((prev) => ({ ...prev, [cycleId]: true }))
    try {
      const res = await fetch(`/api/scores/history/${cycleId}`, { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) setCycleDetails((prev) => ({ ...prev, [cycleId]: json.rows ?? [] }))
    } finally {
      setCycleDetailsLoading((prev) => ({ ...prev, [cycleId]: false }))
    }
  }

  const fetchResetHistory = async () => {
    try {
      const res = await fetch('/api/scores/reset', { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) setResetHistory(json.resets ?? [])
    } catch {
      // non-fatal
    }
  }

  const handleResetScores = async () => {
    const res = await fetch('/api/scores/reset', { method: 'POST' })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error ?? 'Reset failed')
    toast.success(
      `Scores reset. Archived ${json.archivedRows} rows for ${json.affectedUsers} users.`,
      { position: 'top-center' }
    )
    await Promise.all([fetchScores(), fetchResetHistory()])
  }

  const fetchScores = async () => {
    setLoading(true)

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, user_name, membership_status')

    if (profilesError) {
      toast.error('Failed to load profiles')
      setLoading(false)
      return
    }

    // Fetch all user scores
    const { data: scoresData, error: scoresError } = await supabase
      .from('user_scores')
      .select(`
        id,
        user_id,
        event_id,
        event_evaluation_score,
        member_evaluation_score,
        average_score,
        created_at
      `)

    if (scoresError) {
      toast.error('Failed to load scores')
      setLoading(false)
      return
    }

    // Fetch event names
    const { data: eventsData } = await supabase.from('events').select('id, name')
    const eventMap = new Map(eventsData?.map(e => [e.id, e.name]) || [])

    // Process data
    const summaryMap = new Map<string, MemberScoreSummary>()

    // Fetch attendance counts (event_rsvp.checked_in_at not null)
    const { data: rsvpData } = await supabase
      .from('event_rsvp')
      .select('user_id, checked_in_at')
      .not('checked_in_at', 'is', null)

    const attendanceByUser = new Map<string, number>()
    rsvpData?.forEach(r => {
      if (!r.user_id) return
      attendanceByUser.set(r.user_id, (attendanceByUser.get(r.user_id) ?? 0) + 1)
    })

    profiles?.forEach(profile => {
      summaryMap.set(profile.user_id, {
        user_id: profile.user_id,
        user_name: profile.user_name || 'Unknown User',
        membership_status: profile.membership_status || 'unpaid',
        average_score: 0,
        total_events: 0,
        highest_score: 0,
        event_attendance: attendanceByUser.get(profile.user_id) ?? 0,
        scores: []
      })
    })

    scoresData?.forEach(score => {
      const summary = summaryMap.get(score.user_id)
      if (summary) {
        const enrichedScore = {
          ...score,
          event_name: eventMap.get(score.event_id) || 'Unknown Event'
        }
        summary.scores.push(enrichedScore)
        summary.total_events += 1

        const validScore = Number(score.average_score) || 0
        if (validScore > summary.highest_score) {
          summary.highest_score = validScore
        }
      }
    })

    // Calculate averages
    const finalSummaries = Array.from(summaryMap.values()).map(summary => {
      if (summary.scores.length > 0) {
        const sum = summary.scores.reduce((acc, curr) => acc + (Number(curr.average_score) || 0), 0)
        summary.average_score = sum / summary.scores.length
      }
      return summary
    })

    setSummaries(finalSummaries)
    setLoading(false)
  }

  const filteredAndSorted = useMemo(() => {
    let filtered = summaries.filter(s => {
      const matchesSearch = s.user_name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || s.membership_status === statusFilter
      return matchesSearch && matchesStatus
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.average_score - a.average_score
        case 'events':
          return b.total_events - a.total_events
        case 'name':
        default:
          return a.user_name.localeCompare(b.user_name)
      }
    })
  }, [summaries, searchTerm, sortBy, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Scores</h1>
          <p className="text-muted-foreground mt-2">
            Scores reset every year. Reset early if needed — the current snapshot is archived to <strong>Scores History</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setHistoryOpen(true)}>
            <History className="size-4" />
            Scores History ({resetHistory.length})
          </Button>
        </div>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Member Scores</TabsTrigger>
          <TabsTrigger value="events">Event Scores</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ChartBarIcon className="size-4" />
                  Per-event scores
                </CardTitle>
                <CardDescription>
                  Average evaluation score for every event. Reset archives the current snapshot to <strong>Scores History</strong> and clears all event scores back to none.
                </CardDescription>
              </div>
              <DeleteConfirmDialog
                title="Reset all event scores now?"
                description="All current event evaluation scores will be archived to Scores History, then cleared. This does not affect member scores."
                confirmLabel="Reset event scores"
                onConfirm={handleResetEventScores}
              >
                <Button type="button" variant="destructive">
                  <RotateCcw className="size-4" />
                  Reset Event Scores
                </Button>
              </DeleteConfirmDialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => handleEventSort('name')}
                          className="inline-flex items-center gap-1.5 hover:text-foreground"
                        >
                          Event
                          <SortIcon active={eventSortBy === 'name'} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => handleEventSort('status')}
                          className="inline-flex items-center gap-1.5 hover:text-foreground"
                        >
                          Status
                          <SortIcon active={eventSortBy === 'status'} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => handleEventSort('date')}
                          className="inline-flex items-center gap-1.5 hover:text-foreground"
                        >
                          Date
                          <SortIcon active={eventSortBy === 'date'} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => handleEventSort('responses')}
                          className="inline-flex items-center gap-1.5 hover:text-foreground"
                        >
                          Responses
                          <SortIcon active={eventSortBy === 'responses'} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        <button
                          type="button"
                          onClick={() => handleEventSort('score')}
                          className="inline-flex items-center gap-1.5 hover:text-foreground"
                        >
                          Avg Score
                          <SortIcon active={eventSortBy === 'score'} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEventScores.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-center text-muted-foreground">
                          No events with scores yet.
                        </td>
                      </tr>
                    ) : (
                      sortedEventScores.map((row) => (
                        <tr key={row.id} className="border-t hover:bg-muted/50">
                          <td className="px-4 py-3 font-medium capitalize">{row.name}</td>
                          <td className="px-4 py-3">
                            <Badge variant={row.status === 'done' ? 'secondary' : 'default'}>
                              {row.status ?? 'ongoing'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.date_start ? new Date(row.date_start).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3">{row.response_count}</td>
                          <td className="px-4 py-3 font-bold">
                            {row.event_eval_score !== null ? `${row.event_eval_score.toFixed(2)} / 10` : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {eventScores.length > 0 && (() => {
                    const scored = eventScores.filter((r) => r.event_eval_score !== null)
                    const avg = scored.length
                      ? scored.reduce((a, r) => a + (r.event_eval_score ?? 0), 0) / scored.length
                      : null
                    return (
                      <tfoot className="bg-muted/60 border-t-2 font-semibold">
                        <tr>
                          <td className="px-4 py-3" colSpan={3}>
                            Total — {eventScores.length} event{eventScores.length === 1 ? '' : 's'}
                          </td>
                          <td className="px-4 py-3">
                            {eventScores.reduce((a, r) => a + r.response_count, 0)}
                          </td>
                          <td className="px-4 py-3">{avg !== null ? `${avg.toFixed(2)} / 10` : '—'}</td>
                        </tr>
                      </tfoot>
                    )
                  })()}
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-end">
            <DeleteConfirmDialog
              title="Reset all member scores now?"
              description="The current snapshot will be archived to Scores History, all user_scores rows will be deleted, and every user's total score returns to 0. This cannot be undone."
              confirmLabel="Reset scores"
              onConfirm={handleResetScores}
            >
              <Button type="button" variant="destructive">
                <RotateCcw className="size-4" />
                Reset Member Scores
              </Button>
            </DeleteConfirmDialog>
          </div>

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            All members and their performance statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <Label htmlFor="search">Search member</Label>
                <Input
                  id="search"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="sort">Sort by</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger id="sort" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Highest Score</SelectItem>
                    <SelectItem value="events">Most Events</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="status">Membership Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium w-16">Rank</th>
                    <th className="px-4 py-3 text-left font-medium">Member Name</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Avg Score</th>
                    <th className="px-4 py-3 text-left font-medium">Total Events</th>
                    <th className="px-4 py-3 text-left font-medium">Event Attendance</th>
                    <th className="px-4 py-3 text-left font-medium">Highest Score</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-3 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredAndSorted.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-3 text-center text-muted-foreground">
                        No members found
                      </td>
                    </tr>
                  ) : (
                    filteredAndSorted.map((summary, index) => (
                      <tr key={summary.user_id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3 font-semibold text-muted-foreground">
                          #{index + 1}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {summary.user_name}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={summary.membership_status === 'paid' ? 'default' : 'secondary'}>
                            {summary.membership_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {summary.average_score > 0 ? summary.average_score.toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {summary.total_events}
                        </td>
                        <td className="px-4 py-3">
                          {summary.event_attendance}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {summary.highest_score > 0 ? summary.highest_score.toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="outline" size="sm" onClick={() => setSelectedMember(summary)}>
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {!loading && filteredAndSorted.length > 0 && (
                  <tfoot className="bg-muted/60 border-t-2 font-semibold">
                    <tr>
                      <td className="px-4 py-3" colSpan={3}>Total</td>
                      <td className="px-4 py-3">
                        {(() => {
                          const scored = filteredAndSorted.filter(s => s.average_score > 0)
                          if (!scored.length) return '-'
                          const sum = scored.reduce((a, s) => a + s.average_score, 0)
                          return (sum / scored.length).toFixed(2)
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {filteredAndSorted.reduce((a, s) => a + s.total_events, 0)}
                      </td>
                      <td className="px-4 py-3">
                        {filteredAndSorted.reduce((a, s) => a + s.event_attendance, 0)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(() => {
                          const highs = filteredAndSorted.filter(s => s.highest_score > 0).map(s => s.highest_score)
                          if (!highs.length) return '-'
                          return Math.max(...highs).toFixed(2)
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {filteredAndSorted.length} member{filteredAndSorted.length === 1 ? '' : 's'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Scores History Dialog — each summary row is expandable to show the
          archived per-row details for that reset cycle. */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Scores History</DialogTitle>
            <DialogDescription>
              Click any reset to see the full archived rows from that cycle.
            </DialogDescription>
          </DialogHeader>

          {resetHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
              No resets have occurred yet.
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium w-8"></th>
                    <th className="px-4 py-3 text-left font-medium">When</th>
                    <th className="px-4 py-3 text-left font-medium">Label</th>
                    <th className="px-4 py-3 text-left font-medium">Trigger</th>
                    <th className="px-4 py-3 text-left font-medium">Rows</th>
                    <th className="px-4 py-3 text-left font-medium">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {resetHistory.map((row) => {
                    const expanded = expandedCycleId === row.cycle_id
                    const details = cycleDetails[row.cycle_id] ?? []
                    const detailsLoading = cycleDetailsLoading[row.cycle_id] ?? false
                    return (
                      <>
                        <tr
                          key={row.id}
                          className="border-t cursor-pointer hover:bg-muted/40"
                          onClick={() => toggleCycleDetails(row.cycle_id)}
                        >
                          <td className="px-4 py-3 text-muted-foreground">
                            <ChevronDown
                              className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">{new Date(row.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3 font-medium">{row.cycle_label}</td>
                          <td className="px-4 py-3">
                            <Badge variant={row.trigger === 'yearly' ? 'default' : 'secondary'}>
                              {row.trigger}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{row.archived_rows}</td>
                          <td className="px-4 py-3">{row.affected_users}</td>
                        </tr>
                        {expanded && (
                          <tr key={`${row.id}-detail`} className="border-t bg-muted/20">
                            <td colSpan={6} className="px-4 py-3">
                              {detailsLoading ? (
                                <div className="py-6 text-center text-muted-foreground text-sm">Loading details…</div>
                              ) : details.length === 0 ? (
                                <div className="py-6 text-center text-muted-foreground text-sm">No archived rows.</div>
                              ) : (
                                <div className="border rounded-lg bg-background">
                                  <table className="w-full text-xs">
                                    <thead className="bg-muted">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-medium">User</th>
                                        <th className="px-3 py-2 text-left font-medium">Event</th>
                                        <th className="px-3 py-2 text-left font-medium">Event score</th>
                                        <th className="px-3 py-2 text-left font-medium">Member score</th>
                                        <th className="px-3 py-2 text-left font-medium">Average</th>
                                        <th className="px-3 py-2 text-left font-medium">Archived at</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {details.map((d) => (
                                        <tr key={d.id} className="border-t">
                                          <td className="px-3 py-2">
                                            {d.user_name ?? d.user_email ?? <span className="text-muted-foreground">(event-level)</span>}
                                          </td>
                                          <td className="px-3 py-2">{d.event_name ?? '—'}</td>
                                          <td className="px-3 py-2">
                                            {d.event_evaluation_score !== null ? Number(d.event_evaluation_score).toFixed(2) : '—'}
                                          </td>
                                          <td className="px-3 py-2">
                                            {d.member_evaluation_score !== null ? Number(d.member_evaluation_score).toFixed(2) : '—'}
                                          </td>
                                          <td className="px-3 py-2 font-semibold">
                                            {d.average_score !== null ? Number(d.average_score).toFixed(2) : '—'}
                                          </td>
                                          <td className="px-3 py-2 text-muted-foreground">
                                            {d.source_created_at ? new Date(d.source_created_at).toLocaleString() : '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detailed Member View Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMember?.user_name}&apos;s Score History</DialogTitle>
            <DialogDescription>
              Detailed breakdown of scores across all attended events
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-sm text-muted-foreground">Overall Average</div>
                <div className="text-2xl font-bold">{selectedMember?.average_score.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-sm text-muted-foreground">Events Attended</div>
                <div className="text-2xl font-bold">{selectedMember?.total_events}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-sm text-muted-foreground">Highest Score</div>
                <div className="text-2xl font-bold">{selectedMember?.highest_score.toFixed(2)}</div>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Event Name</th>
                    <th className="px-4 py-3 text-left font-medium">Event Score</th>
                    <th className="px-4 py-3 text-left font-medium">Member Score</th>
                    <th className="px-4 py-3 text-left font-medium">Average</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMember?.scores.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-center text-muted-foreground">
                        No scores recorded
                      </td>
                    </tr>
                  ) : (
                    selectedMember?.scores.map((score: any) => (
                      <tr key={score.id} className="border-t">
                        <td className="px-4 py-3 font-medium">
                          <TruncatedCell content={score.event_name} />
                        </td>
                        <td className="px-4 py-3">
                          {score.event_evaluation_score !== null ? Number(score.event_evaluation_score).toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {score.member_evaluation_score !== null ? Number(score.member_evaluation_score).toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {score.average_score !== null ? Number(score.average_score).toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(score.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
