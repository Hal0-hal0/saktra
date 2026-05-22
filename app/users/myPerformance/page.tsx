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

interface UserScore {
  id: string
  user_id: string
  event_id: number
  event_name: string
  event_evaluation_score: number | null
  member_evaluation_score: number | null
  average_score: number | null
  attendance_score: number | null
  created_at: string
}

interface Statistics {
  overallAverage: number
  totalEventsAttended: number
  highestScore: number
  lowestScore: number
  standardDeviation: number
  averageAttendance: number
}

type SortBy = 'score' | 'date' | 'name'

export default function ScoresPage() {
  const [scores, setScores] = useState<UserScore[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [searchTerm, setSearchTerm] = useState('')
  const [minScore, setMinScore] = useState('')
  const [maxScore, setMaxScore] = useState('')

  useEffect(() => {
    fetchScores()
  }, [])

  const fetchScores = async () => {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if (!userId) {
      toast.error('User not found', { position: 'top-center' })
      setLoading(false)
      return
    }

    // Fetch user scores from our new user_scores table
    const { data: scoresData, error } = await supabase
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching scores:', error)
      toast.error('Failed to load scores', { position: 'top-center' })
      setLoading(false)
      return
    }

    // Fetch event names to join with scores
    if (scoresData && scoresData.length > 0) {
      const eventIds = [...new Set(scoresData.map(s => s.event_id))]
      const [{ data: eventsData }, { data: rsvpData }] = await Promise.all([
        supabase
          .from('events')
          .select('id, name, event_eval_score')
          .in('id', eventIds),
        supabase
          .from('event_rsvp')
          .select('event_id, points_awarded, checked_in_at')
          .eq('user_id', userId)
          .not('checked_in_at', 'is', null),
      ])

      const eventMap = new Map(eventsData?.map(e => [e.id, e.name]) || [])
      // Fallback: per-event average (events.event_eval_score) for rows where
      // user_scores.event_evaluation_score wasn't backfilled at close time.
      const eventScoreMap = new Map<number, number | null>(
        eventsData?.map((e: any) => [
          e.id,
          e.event_eval_score !== null && e.event_eval_score !== undefined
            ? Number(e.event_eval_score)
            : null,
        ]) || []
      )
      const attendanceMap = new Map<number, number>()
      rsvpData?.forEach((r: any) => {
        const id = Number(r.event_id)
        if (!Number.isFinite(id)) return
        attendanceMap.set(id, Number(r.points_awarded ?? 0))
      })

      const enrichedScores: UserScore[] = scoresData.map(score => {
        const eventEval =
          score.event_evaluation_score !== null && score.event_evaluation_score !== undefined
            ? Number(score.event_evaluation_score)
            : eventScoreMap.get(score.event_id) ?? null
        const memberEval =
          score.member_evaluation_score !== null && score.member_evaluation_score !== undefined
            ? Number(score.member_evaluation_score)
            : null
        const avg =
          eventEval !== null && memberEval !== null
            ? Number(((eventEval + memberEval) / 2).toFixed(2))
            : eventEval ?? memberEval ?? null

        return {
          ...score,
          event_evaluation_score: eventEval,
          average_score: avg,
          event_name: eventMap.get(score.event_id) || 'Unknown Event',
          attendance_score: attendanceMap.has(score.event_id)
            ? attendanceMap.get(score.event_id) ?? 0
            : null,
        }
      })

      setScores(enrichedScores)
    } else {
      setScores([])
    }

    setLoading(false)
  }

  const statistics = useMemo<Statistics>(() => {
    const attendancePoints = scores
      .map(s => s.attendance_score)
      .filter((v): v is number => typeof v === 'number')
    const averageAttendance = attendancePoints.length
      ? Number((attendancePoints.reduce((a, b) => a + b, 0) / attendancePoints.length).toFixed(2))
      : 0

    if (scores.length === 0) {
      return {
        overallAverage: 0,
        totalEventsAttended: 0,
        highestScore: 0,
        lowestScore: 0,
        standardDeviation: 0,
        averageAttendance,
      }
    }

    const validScores = scores
      .filter(s => s.average_score !== null && s.average_score !== undefined)
      .map(s => Number(s.average_score))

    if (validScores.length === 0) {
      return {
        overallAverage: 0,
        totalEventsAttended: scores.length,
        highestScore: 0,
        lowestScore: 0,
        standardDeviation: 0,
        averageAttendance,
      }
    }

    const sum = validScores.reduce((a, b) => a + b, 0)
    const average = sum / validScores.length
    const highest = Math.max(...validScores)
    const lowest = Math.min(...validScores)

    // Calculate standard deviation
    const squaredDiffs = validScores.map(score => Math.pow(score - average, 2))
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / validScores.length
    const stdDev = Math.sqrt(variance)

    return {
      overallAverage: Number(average.toFixed(2)),
      totalEventsAttended: scores.length,
      highestScore: highest,
      lowestScore: lowest,
      standardDeviation: Number(stdDev.toFixed(2)),
      averageAttendance,
    }
  }, [scores])

  const filteredAndSortedScores = useMemo(() => {
    let filtered = scores.filter(score => {
      const matchesSearch = score.event_name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesMinScore = !minScore || (score.average_score || 0) >= Number(minScore)
      const matchesMaxScore = !maxScore || (score.average_score || 0) <= Number(maxScore)
      return matchesSearch && matchesMinScore && matchesMaxScore
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return (b.average_score || 0) - (a.average_score || 0)
        case 'name':
          return a.event_name.localeCompare(b.event_name)
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  }, [scores, searchTerm, sortBy, minScore, maxScore])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Performance</h1>
        <p className="text-muted-foreground mt-2">
          Track your scores across all attended events
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.overallAverage.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Out of 5.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.averageAttendance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Avg points per check-in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Events Attended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.totalEventsAttended}</div>
            <p className="text-xs text-muted-foreground mt-1">Total events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.highestScore.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Best performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lowest Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.lowestScore.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs improvement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Std. Deviation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.standardDeviation.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Score variance</p>
          </CardContent>
        </Card>
      </div>

      {/* Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Score Breakdown by Event</CardTitle>
          <CardDescription>
            Detailed scores for each event you attended
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <Label htmlFor="search">Search event</Label>
                <Input
                  id="search"
                  placeholder="Search by event name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="sort">Sort by</Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger id="sort" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Latest First</SelectItem>
                    <SelectItem value="score">Highest Score</SelectItem>
                    <SelectItem value="name">Event Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="min-score">Min Score</Label>
                <Input
                  id="min-score"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="0.0"
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="max-score">Max Score</Label>
                <Input
                  id="max-score"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="5.0"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Event Name</th>
                    <th className="px-4 py-3 text-left font-medium">Event Score</th>
                    <th className="px-4 py-3 text-left font-medium">Member Score</th>
                    <th className="px-4 py-3 text-left font-medium">Attendance</th>
                    <th className="px-4 py-3 text-left font-medium">Average</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredAndSortedScores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-center text-muted-foreground">
                        {scores.length === 0 ? 'No scores yet. Attend more events!' : 'No matching scores'}
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedScores.map((score) => (
                      <tr key={score.id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <TruncatedCell content={score.event_name} />
                        </td>
                        <td className="px-4 py-3">
                          {score.event_evaluation_score !== null
                            ? Number(score.event_evaluation_score).toFixed(2)
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {score.member_evaluation_score !== null
                            ? Number(score.member_evaluation_score).toFixed(2)
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {score.attendance_score !== null
                            ? `+${Number(score.attendance_score).toFixed(0)}`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {score.average_score !== null && score.average_score !== undefined
                            ? Number(score.average_score).toFixed(2)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(score.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}