'use client'

import { useEffect, useState } from 'react'
import { Users, CheckCircle2, XCircle, Clock3, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type RsvpStatus = 'accepted' | 'declined' | 'pending'

type Participant = {
    user_id: string
    status: RsvpStatus
    user_name: string | null
    email: string | null
    avatar_url: string | null
}

type Props = {
    children: React.ReactNode
    eventId: string
    eventName: string
}

const statusConfig: Record<RsvpStatus, {
    icon: React.ReactNode
    label: string
    badgeClass: string
    emptyText: string
}> = {
    accepted: {
        icon: <CheckCircle2 className="size-3.5 text-emerald-500" />,
        label: 'Accepted',
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
        emptyText: 'No one has accepted this event yet.',
    },
    declined: {
        icon: <XCircle className="size-3.5 text-red-400" />,
        label: 'Declined',
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
        emptyText: 'No one has declined this event.',
    },
    pending: {
        icon: <Clock3 className="size-3.5 text-muted-foreground" />,
        label: 'Pending',
        badgeClass: 'bg-muted text-muted-foreground',
        emptyText: 'No pending responses.',
    },
}

function getInitials(name: string | null, email: string | null): string {
    if (name?.trim()) {
        return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    }
    return (email?.[0] ?? '?').toUpperCase()
}

function ParticipantRow({ participant }: { participant: Participant }) {
    const config = statusConfig[participant.status]
    const initials = getInitials(participant.user_name, participant.email)
    const displayName = participant.user_name?.trim() || participant.email || 'Unknown User'

    return (
        <div className="flex items-center gap-3 rounded-lg border bg-background/60 px-3 py-2.5 hover:bg-muted/40 transition-colors">
            <Avatar className="size-8 shrink-0">
                {participant.avatar_url && <AvatarImage src={participant.avatar_url} alt={displayName} />}
                <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                {participant.user_name && participant.email && (
                    <p className="text-xs text-muted-foreground truncate">{participant.email}</p>
                )}
            </div>
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1', config.badgeClass)}>
                {config.icon}
                {config.label}
            </span>
        </div>
    )
}

function ParticipantList({ participants, emptyText, search }: {
    participants: Participant[]
    emptyText: string
    search: string
}) {
    const filtered = participants.filter((p) => {
        const q = search.toLowerCase()
        return !q ||
            p.user_name?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q)
    })

    if (filtered.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Users className="size-8 mb-2 opacity-30" />
                <p className="text-sm">{search ? 'No participants match your search.' : emptyText}</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {filtered.map((p) => (
                <ParticipantRow key={p.user_id} participant={p} />
            ))}
        </div>
    )
}

export function ParticipantsModal({ children, eventId, eventName }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [participants, setParticipants] = useState<Participant[]>([])
    const [search, setSearch] = useState('')

    const fetchParticipants = async () => {
        setLoading(true)

        // Fetch RSVPs joined with profile data
        const { data, error } = await supabase
            .from('event_rsvp')
            .select(`
                user_id,
                status,
                profiles (
                    user_name,
                    email
                )
            `)
            .eq('event_id', eventId)

        if (error || !data) {
            console.error('Failed to fetch participants:', error)
            setLoading(false)
            return
        }

        const mapped: Participant[] = data.map((row: any) => ({
            user_id: row.user_id,
            status: row.status as RsvpStatus,
            user_name: row.profiles?.user_name ?? null,
            email: row.profiles?.email ?? null,
            avatar_url: null,
        }))

        setParticipants(mapped)
        setLoading(false)
    }

    useEffect(() => {
        if (!open) return
        fetchParticipants()
    }, [open, eventId])

    const accepted = participants.filter((p) => p.status === 'accepted')
    const declined = participants.filter((p) => p.status === 'declined')
    const pending = participants.filter((p) => p.status === 'pending')

    return (
        <Dialog open={open} onOpenChange={(next) => {
            setOpen(next)
            if (!next) {
                setParticipants([])
                setSearch('')
            }
        }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="size-4" />
                        Participants
                    </DialogTitle>
                    <DialogDescription className="capitalize">
                        RSVP responses for{' '}
                        <span className="font-medium text-foreground">{eventName}</span>
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Spinner className="size-6" />
                    </div>
                ) : (
                    <>
                        {/* Summary badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="gap-1.5">
                                <CheckCircle2 className="size-3 text-emerald-500" />
                                {accepted.length} Accepted
                            </Badge>
                            <Badge variant="secondary" className="gap-1.5">
                                <XCircle className="size-3 text-red-400" />
                                {declined.length} Declined
                            </Badge>
                            <Badge variant="secondary" className="gap-1.5">
                                <Clock3 className="size-3 text-muted-foreground" />
                                {pending.length} Pending
                            </Badge>
                        </div>

                        <Separator />

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Search by name or email..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Tabs */}
                        <Tabs defaultValue="accepted" className="flex-1 flex flex-col min-h-0">
                            <TabsList className="w-full">
                                <TabsTrigger value="accepted" className="flex-1 gap-1.5 text-xs">
                                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                                    Accepted
                                    <span className="opacity-60 font-semibold">({accepted.length})</span>
                                </TabsTrigger>
                                <TabsTrigger value="declined" className="flex-1 gap-1.5 text-xs">
                                    <XCircle className="size-3.5 text-red-400" />
                                    Declined
                                    <span className="opacity-60 font-semibold">({declined.length})</span>
                                </TabsTrigger>
                                <TabsTrigger value="pending" className="flex-1 gap-1.5 text-xs">
                                    <Clock3 className="size-3.5" />
                                    Pending
                                    <span className="opacity-60 font-semibold">({pending.length})</span>
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-y-auto mt-3 pr-1">
                                <TabsContent value="accepted" className="mt-0">
                                    <ParticipantList
                                        participants={accepted}
                                        emptyText={statusConfig.accepted.emptyText}
                                        search={search}
                                    />
                                </TabsContent>
                                <TabsContent value="declined" className="mt-0">
                                    <ParticipantList
                                        participants={declined}
                                        emptyText={statusConfig.declined.emptyText}
                                        search={search}
                                    />
                                </TabsContent>
                                <TabsContent value="pending" className="mt-0">
                                    <ParticipantList
                                        participants={pending}
                                        emptyText={statusConfig.pending.emptyText}
                                        search={search}
                                    />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}