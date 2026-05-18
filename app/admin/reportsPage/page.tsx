'use client'
import { useEffect, useMemo, useState } from 'react'
import { Download, Users, CalendarDays, Wallet, ShieldCheck, Trophy } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/supabase-client'
import { formatEvaluationRole, departmentOptions } from '@/lib/member-evaluation'

type Profile = {
  user_id: string
  user_name: string | null
  email: string | null
  role: string | null
  status: string | null
  department: string | null
  position: string | null
  membership_status: string | null
  membership_expires_at: string | null
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
  event_evaluation_score: number | null
  member_evaluation_score: number | null
  average_score: number | null
}

export default function ReportsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      const [pRes, eRes, sRes] = await Promise.all([
        supabase.from('profiles').select('user_id, user_name, email, role, status, department, position, membership_status, membership_expires_at, eval_total_score, created_at'),
        supabase.from('events').select('id, name, status, date_start, date_end, event_eval_score, evaluation_open, is_hidden').or('is_hidden.is.null,is_hidden.eq.false'),
        supabase.from('user_scores').select('user_id, event_id, event_evaluation_score, member_evaluation_score, average_score'),
      ])
      setProfiles((pRes.data ?? []) as Profile[])
      setEvents((eRes.data ?? []) as EventRow[])
      setScores((sRes.data ?? []) as ScoreRow[])
      setLoading(false)
    }
    run()
  }, [])

  const stats = useMemo(() => {
    const total = profiles.length
    const active = profiles.filter((p) => p.status === 'active').length
    const inactive = total - active
    const bod = profiles.filter((p) => p.role === 'admin' || p.role === 'bod').length
    const execs = profiles.filter((p) => p.role === 'executive').length
    const members = profiles.filter((p) => p.role === 'user').length
    const paid = profiles.filter((p) => p.membership_status === 'paid').length
    const unpaid = total - paid
    const totalEvents = events.length
    const ongoing = events.filter((e) => e.status === 'ongoing').length
    const done = events.filter((e) => e.status === 'done').length
    const evalScores = events.map((e) => e.event_eval_score).filter((v): v is number => typeof v === 'number')
    const avgEventScore = evalScores.length
      ? Number((evalScores.reduce((a, b) => a + b, 0) / evalScores.length).toFixed(2))
      : null

    const userScores = scores.filter((s) => typeof s.average_score === 'number').map((s) => s.average_score!)
    const avgMemberScore = userScores.length
      ? Number((userScores.reduce((a, b) => a + b, 0) / userScores.length).toFixed(2))
      : null

    return { total, active, inactive, bod, execs, members, paid, unpaid, totalEvents, ongoing, done, avgEventScore, avgMemberScore }
  }, [profiles, events, scores])

  const membersByDept = useMemo(() => {
    return departmentOptions.map((dept) => {
      const list = profiles.filter((p) => p.department === dept.value)
      return {
        key: dept.value,
        label: dept.label,
        total: list.length,
        active: list.filter((p) => p.status === 'active').length,
        paid: list.filter((p) => p.membership_status === 'paid').length,
      }
    })
  }, [profiles])

  const topScorers = useMemo(() => {
    const byUser = new Map<string, number[]>()
    for (const s of scores) {
      if (typeof s.average_score !== 'number') continue
      const list = byUser.get(s.user_id) ?? []
      list.push(s.average_score)
      byUser.set(s.user_id, list)
    }
    return Array.from(byUser.entries())
      .map(([uid, xs]) => {
        const p = profiles.find((x) => x.user_id === uid)
        const avg = Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2))
        return {
          name: p?.user_name && p.user_name !== 'null' ? p.user_name : p?.email ?? 'Unknown',
          role: formatEvaluationRole(p?.role),
          dept: p?.department ?? '—',
          events: xs.length,
          avg,
        }
      })
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 20)
  }, [scores, profiles])

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 40
      let cursorY = margin

      // Header
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('SAKTRA — Organization Report', margin, cursorY)
      cursorY += 18
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120)
      doc.text(`Generated on ${new Date().toLocaleString()}`, margin, cursorY)
      doc.setTextColor(0)
      cursorY += 16
      doc.setLineWidth(0.5)
      doc.line(margin, cursorY, pageWidth - margin, cursorY)
      cursorY += 14

      // Summary section
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Summary', margin, cursorY)
      cursorY += 6

      autoTable(doc, {
        startY: cursorY + 4,
        head: [['Metric', 'Value']],
        body: [
          ['Total members', String(stats.total)],
          ['Active members', String(stats.active)],
          ['Inactive members', String(stats.inactive)],
          ['Board of Directors (BOD)', String(stats.bod)],
          ['Executives', String(stats.execs)],
          ['Regular members', String(stats.members)],
          ['Paid memberships', String(stats.paid)],
          ['Unpaid memberships', String(stats.unpaid)],
          ['Total events', String(stats.totalEvents)],
          ['Ongoing events', String(stats.ongoing)],
          ['Completed events', String(stats.done)],
          ['Average event evaluation score', stats.avgEventScore !== null ? `${stats.avgEventScore} / 10` : '—'],
          ['Average member evaluation score', stats.avgMemberScore !== null ? `${stats.avgMemberScore} / 10` : '—'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 10 },
        margin: { left: margin, right: margin },
      })
      cursorY = (doc as any).lastAutoTable.finalY + 20

      // Members by department
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Members by department', margin, cursorY)
      autoTable(doc, {
        startY: cursorY + 6,
        head: [['Department', 'Total', 'Active', 'Paid']],
        body: membersByDept.map((d) => [d.label, String(d.total), String(d.active), String(d.paid)]),
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 10 },
        margin: { left: margin, right: margin },
      })
      cursorY = (doc as any).lastAutoTable.finalY + 20

      // Events
      doc.addPage()
      cursorY = margin
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(`Events (${stats.totalEvents})`, margin, cursorY)
      autoTable(doc, {
        startY: cursorY + 6,
        head: [['Name', 'Status', 'Start', 'End', 'Eval score']],
        body: events.map((e) => [
          e.name,
          e.status,
          e.date_start ? new Date(e.date_start).toLocaleDateString() : '—',
          e.date_end ? new Date(e.date_end).toLocaleDateString() : '—',
          e.event_eval_score !== null ? Number(e.event_eval_score).toFixed(2) : '—',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      })

      // Membership status per member
      doc.addPage()
      cursorY = margin
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Membership status', margin, cursorY)
      autoTable(doc, {
        startY: cursorY + 6,
        head: [['Member', 'Role', 'Department', 'Status', 'Membership', 'Expires']],
        body: profiles.map((p) => [
          p.user_name && p.user_name !== 'null' ? p.user_name : (p.email ?? '—'),
          formatEvaluationRole(p.role),
          p.department && p.department !== 'null' ? p.department : '—',
          p.status ?? '—',
          p.membership_status ?? 'unpaid',
          p.membership_expires_at ? new Date(p.membership_expires_at).toLocaleDateString() : '—',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      })

      // Top scorers
      doc.addPage()
      cursorY = margin
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(`Top scorers — ${topScorers.length} members`, margin, cursorY)
      autoTable(doc, {
        startY: cursorY + 6,
        head: [['#', 'Member', 'Role', 'Department', 'Events', 'Avg score']],
        body: topScorers.map((row, i) => [
          String(i + 1),
          row.name,
          row.role,
          row.dept ?? '—',
          String(row.events),
          `${row.avg.toFixed(2)} / 10`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      })

      // Page footer with page numbers + timestamp
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
          `SAKTRA — Confidential · Page ${i} of ${pageCount}`,
          pageWidth - margin,
          doc.internal.pageSize.getHeight() - 20,
          { align: 'right' },
        )
      }

      const stamp = new Date().toISOString().slice(0, 10)
      doc.save(`saktra-report-${stamp}.pdf`)
      toast.success('Report downloaded', { position: 'top-center' })
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not generate PDF', { position: 'top-center' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { background: white !important; }
          /* Hide sidebar, header, toaster, any nav chrome */
          [data-slot="sidebar-container"],
          [data-slot="sidebar"],
          aside,
          header,
          [data-sonner-toaster],
          .no-print { display: none !important; }
          /* Strip layout padding so we get full-width A4 */
          [data-slot="sidebar-inset"],
          main {
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            background: white !important;
          }
          .print-area { background: white !important; color: black !important; }
          .print-area .border,
          .print-area .bg-muted,
          .print-area [class*="bg-card"] { background: white !important; }
          .page-break { break-after: page; page-break-after: always; }
          /* Shrink large headings on paper */
          .print-area h1 { font-size: 18pt; }
          .print-area h2 { font-size: 14pt; }
          .print-area table { font-size: 10pt; }
          .print-area td, .print-area th { padding: 4pt 6pt !important; }
        }
      `}</style>

      <div className="space-y-6 print-area">
        <div className="flex flex-wrap items-start justify-between gap-3 no-print">
          <div>
            <h1 className="text-2xl font-bold">Organization Report</h1>
            <p className="text-sm text-muted-foreground">
              Full breakdown of members, events, evaluation scores and membership.
              Click <strong>Download PDF</strong> to save the report as a file.
            </p>
          </div>
          <Button type="button" onClick={handleDownloadPdf}>
            <Download className="size-4" />
            Download PDF
          </Button>
        </div>

        {/* Report header — visible only on the printed page */}
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">SAKTRA — Organization Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generated on {new Date().toLocaleString()}
          </p>
          <hr className="my-3" />
        </div>

        {/* Summary stats */}
        <section className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 print:grid-cols-3">
          <StatCard icon={<Users />} label="Total members" value={stats.total} />
          <StatCard icon={<ShieldCheck />} label="Board of Directors" value={stats.bod} />
          <StatCard icon={<Users />} label="Executives" value={stats.execs} />
          <StatCard icon={<Users />} label="Members" value={stats.members} />
          <StatCard icon={<CalendarDays />} label="Events" value={stats.totalEvents} />
          <StatCard icon={<Wallet />} label="Paid memberships" value={`${stats.paid} / ${stats.total}`} />
        </section>

        {/* Members by department */}
        <Card>
          <CardHeader>
            <CardTitle>Members by department</CardTitle>
            <CardDescription>Counts, active status, and paid membership per department.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Total members</th>
                  <th className="px-3 py-2 font-medium">Active</th>
                  <th className="px-3 py-2 font-medium">Paid memberships</th>
                </tr>
              </thead>
              <tbody>
                {membersByDept.map((d) => (
                  <tr key={d.key} className="border-t">
                    <td className="px-3 py-2">{d.label}</td>
                    <td className="px-3 py-2">{d.total}</td>
                    <td className="px-3 py-2">{d.active}</td>
                    <td className="px-3 py-2">{d.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Events */}
        <Card>
          <CardHeader>
            <CardTitle>Events ({stats.totalEvents})</CardTitle>
            <CardDescription>
              {stats.ongoing} ongoing · {stats.done} done · avg evaluation score{' '}
              {stats.avgEventScore !== null ? `${stats.avgEventScore} / 10` : '—'}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Dates</th>
                  <th className="px-3 py-2 font-medium">Eval score</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No events recorded yet.</td></tr>
                ) : events.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{e.name}</td>
                    <td className="px-3 py-2 capitalize">{e.status}</td>
                    <td className="px-3 py-2">
                      {e.date_start ? new Date(e.date_start).toLocaleDateString() : '—'}
                      {e.date_end && e.date_end !== e.date_start ? ` – ${new Date(e.date_end).toLocaleDateString()}` : ''}
                    </td>
                    <td className="px-3 py-2">{e.event_eval_score !== null ? Number(e.event_eval_score).toFixed(2) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="page-break" />

        {/* Membership status */}
        <Card>
          <CardHeader>
            <CardTitle>Membership status</CardTitle>
            <CardDescription>Per-member paid/unpaid breakdown.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Member</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Membership</th>
                  <th className="px-3 py-2 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.user_id} className="border-t">
                    <td className="px-3 py-2">
                      {p.user_name && p.user_name !== 'null' ? p.user_name : p.email}
                    </td>
                    <td className="px-3 py-2">{formatEvaluationRole(p.role)}</td>
                    <td className="px-3 py-2 capitalize">{p.department && p.department !== 'null' ? p.department : '—'}</td>
                    <td className="px-3 py-2 capitalize">{p.status ?? '—'}</td>
                    <td className="px-3 py-2 capitalize">
                      <Badge variant={p.membership_status === 'paid' ? 'default' : 'secondary'}>
                        {p.membership_status ?? 'unpaid'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {p.membership_expires_at ? new Date(p.membership_expires_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="page-break" />

        {/* Top scorers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4" /> Top scorers
            </CardTitle>
            <CardDescription>
              Top {topScorers.length} members by average evaluation score
              {stats.avgMemberScore !== null && ` · org-wide avg ${stats.avgMemberScore} / 10`}.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-medium w-12">#</th>
                  <th className="px-3 py-2 font-medium">Member</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Events</th>
                  <th className="px-3 py-2 font-medium">Avg score</th>
                </tr>
              </thead>
              <tbody>
                {topScorers.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">No evaluation scores recorded yet.</td></tr>
                ) : topScorers.map((row, i) => (
                  <tr key={`${row.name}-${i}`} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">#{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2">{row.role}</td>
                    <td className="px-3 py-2 capitalize">{row.dept}</td>
                    <td className="px-3 py-2">{row.events}</td>
                    <td className="px-3 py-2 font-semibold">{row.avg.toFixed(2)} / 10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="hidden print:block text-xs text-muted-foreground mt-6">
          SAKTRA — Confidential. Generated from current Supabase state.
        </div>
      </div>
    </>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}
