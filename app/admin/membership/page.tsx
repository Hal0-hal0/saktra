'use client'
import { useState, useEffect, useMemo } from 'react'
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

interface MemberRecord {
  id: string
  user_id: string
  user_name: string
  email: string
  membership_status: 'paid' | 'unpaid'
  membership_expires_at: string | null
}

export default function MembershipPage() {
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [settingPaid, setSettingPaid] = useState<string | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, user_name, email, membership_status, membership_expires_at')
      .order('user_name', { ascending: true })

    if (error) {
      toast.error('Failed to load members', { position: 'top-center' })
    } else {
      setMembers(data || [])
    }
    setLoading(false)
  }

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch = member.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
      
      if (statusFilter === 'all') {
        return matchesSearch
      }
      return matchesSearch && member.membership_status === statusFilter
    })
  }, [members, searchTerm, statusFilter])

  const handleSetPaid = async (userId: string) => {
    setSettingPaid(userId)
    const res = await fetch('/api/set-membership-paid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId })
    })

    const data = await res.json()
    if (data.error) {
      toast.error(data.error, { position: 'top-center' })
    } else {
      toast.success('Membership set to paid', { position: 'top-center' })
      await fetchMembers()
    }
    setSettingPaid(null)
  }

  const paidCount = members.filter((m) => m.membership_status === 'paid').length
  const unpaidCount = members.filter((m) => m.membership_status === 'unpaid').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-xl">Membership Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage member membership status and expiry dates
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{paidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Members with active membership
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unpaidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Members without active membership
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            View and manage member membership status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <Label htmlFor="search">Search by name or email</Label>
                <Input
                  id="search"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="status-filter">Filter by status</Label>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger id="status-filter" className="mt-1">
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

            {/* Table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Expires</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-center text-muted-foreground">
                        No members found
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.user_id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <TruncatedCell content={member.user_name} />
                        </td>
                        <td className="px-4 py-3">
                          <TruncatedCell content={member.email} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            member.membership_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {member.membership_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {member.membership_expires_at
                            ? new Date(member.membership_expires_at).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {member.membership_status === 'unpaid' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetPaid(member.user_id)}
                              disabled={settingPaid === member.user_id}
                            >
                              {settingPaid === member.user_id ? 'Setting...' : 'Set as Paid'}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Active</span>
                          )}
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