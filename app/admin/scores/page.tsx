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

interface MemberScoreSummary {
  user_id: string
  user_name: string
  membership_status: string
  average_score: number
  total_events: number
  highest_score: number
  scores: any[]
}

export default function AdminScoresPage() {
  const [summaries, setSummaries] = useState<MemberScoreSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('score')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedMember, setSelectedMember] = useState<MemberScoreSummary | null>(null)
  
  useEffect(() => {
    fetchScores()
  }, [])

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
    
    profiles?.forEach(profile => {
      summaryMap.set(profile.user_id, {
        user_id: profile.user_id,
        user_name: profile.user_name || 'Unknown User',
        membership_status: profile.membership_status || 'unpaid',
        average_score: 0,
        total_events: 0,
        highest_score: 0,
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
      <div>
        <h1 className="text-2xl font-bold">Member Scores Leaderboard</h1>
        <p className="text-muted-foreground mt-2">
          Track and rank members based on their evaluation scores
        </p>
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
                    <th className="px-4 py-3 text-left font-medium">Highest Score</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredAndSorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 text-center text-muted-foreground">
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
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

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
