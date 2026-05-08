'use client'

import { format, parse, isAfter, isBefore, isToday, parseISO } from 'date-fns'
import {
    CalendarDays,
    Clock,
    MapPin,
    Building2,
    CheckCircle2,
    XCircle,
    ClipboardList,
    Clock3,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { EvaluateModal } from './evaluate-modal'
import type { UserEvent, EventStatus } from './user-event-provider'

type Props = {
    event: UserEvent
    userId: string
    onRsvp: (eventId: string, rsvp: EventStatus) => Promise<void>
}

const formatDate = (val: string) =>
    format(parse(val, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')

const formatTime = (val: string) =>
    format(parse(val, 'HH:mm:ss', new Date()), 'h:mm a')

export type EventCategory = 'ongoing' | 'upcoming' | 'past'

export function getEventCategory(event: UserEvent): EventCategory {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const start = parse(event.date_start, 'yyyy-MM-dd', new Date())
    const end = parse(event.date_end, 'yyyy-MM-dd', new Date())

    // Date-based category takes priority — don't mark future events as past
    // just because an admin set status to 'done' prematurely
    if (isAfter(start, today)) return 'upcoming'
    if (isBefore(end, today) || event.status === 'done') return 'past'
    return 'ongoing'
}

const categoryConfig: Record<EventCategory, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    ongoing: { label: 'Ongoing', variant: 'default' },
    upcoming: { label: 'Upcoming', variant: 'secondary' },
    past: { label: 'Past', variant: 'outline' },
}

const rsvpConfig: Record<EventStatus, {
    border: string
    bg: string
    dot: string
    label: string
    labelClass: string
}> = {
    accepted: {
        border: 'border-emerald-200 dark:border-emerald-800',
        bg: 'bg-emerald-50/60 dark:bg-emerald-950/30',
        dot: 'bg-emerald-500',
        label: 'Accepted',
        labelClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    },
    declined: {
        border: 'border-red-200 dark:border-red-800',
        bg: 'bg-red-50/60 dark:bg-red-950/30',
        dot: 'bg-red-500',
        label: 'Declined',
        labelClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    },
    pending: {
        border: 'border-border',
        bg: '',
        dot: 'bg-muted-foreground/40',
        label: 'Pending',
        labelClass: 'bg-muted text-muted-foreground',
    },
}

export function EventCard({ event, userId, onRsvp }: Props) {
    const category = getEventCategory(event)
    const rsvp = event.rsvp ?? 'pending'
    const config = rsvpConfig[rsvp]
    const catConfig = categoryConfig[category]

    const isPast = category === 'past'
    const canEvaluate = isPast && rsvp === 'accepted' && !event.hasEvaluated
    const hasEvaluated = isPast && rsvp === 'accepted' && event.hasEvaluated

    const dateRange =
        event.date_start === event.date_end
            ? formatDate(event.date_start)
            : `${formatDate(event.date_start)} – ${formatDate(event.date_end)}`

    const timeRange = `${formatTime(event.time_start)} – ${formatTime(event.time_end)}`

    return (
        <Card
            className={cn(
                'flex flex-col transition-all duration-200 border',
                config.border,
                config.bg,
                'hover:shadow-md'
            )}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        {/* RSVP indicator dot + label */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className={cn('inline-flex h-2 w-2 rounded-full shrink-0', config.dot)} />
                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', config.labelClass)}>
                                {config.label}
                            </span>
                        </div>
                        <h3 className="font-semibold text-base capitalize leading-tight line-clamp-2">
                            {event.name}
                        </h3>
                    </div>
                    <Badge variant={catConfig.variant} className="shrink-0 text-xs">
                        {catConfig.label}
                    </Badge>
                </div>

                {event.description?.trim() ? (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {event.description}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground/50 italic mt-1">No description provided.</p>
                )}
            </CardHeader>

            <CardContent className="flex-1 space-y-2 pb-3">
                <Separator />
                <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="size-3.5 shrink-0" />
                        <span>{dateRange}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="size-3.5 shrink-0" />
                        <span>{timeRange}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">{event.location || 'Location not set'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="size-3.5 shrink-0" />
                        <span className="truncate">{event.venue || 'Venue not set'}</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-0 flex flex-col gap-2">
                {/* RSVP Buttons — only for non-past events */}
                {!isPast && (
                    <div className="flex gap-2 w-full">
                        <Button
                            size="sm"
                            variant={rsvp === 'accepted' ? 'default' : 'outline'}
                            className={cn(
                                'flex-1 gap-1.5 text-xs font-medium transition-all',
                                rsvp === 'accepted'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white'
                                    : 'hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            )}
                            onClick={() => onRsvp(event.id, rsvp === 'accepted' ? 'pending' : 'accepted')}
                        >
                            <CheckCircle2 className="size-3.5" />
                            Accept
                        </Button>
                        <Button
                            size="sm"
                            variant={rsvp === 'declined' ? 'default' : 'outline'}
                            className={cn(
                                'flex-1 gap-1.5 text-xs font-medium transition-all',
                                rsvp === 'declined'
                                    ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white'
                                    : 'hover:border-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                            )}
                            onClick={() => onRsvp(event.id, rsvp === 'declined' ? 'pending' : 'declined')}
                        >
                            <XCircle className="size-3.5" />
                            Decline
                        </Button>
                    </div>
                )}

                {/* Past event states */}
                {isPast && canEvaluate && (
                    <EvaluateModal eventId={event.id} eventName={event.name} userId={userId}>
                        <Button
                            size="sm"
                            className="w-full gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                        >
                            <ClipboardList className="size-3.5" />
                            Evaluate Event
                        </Button>
                    </EvaluateModal>
                )}

                {isPast && hasEvaluated && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-1">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        Evaluation submitted
                    </div>
                )}

                {isPast && rsvp === 'declined' && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-1">
                        <XCircle className="size-3.5 text-red-400" />
                        You did not attend this event
                    </div>
                )}

                {isPast && rsvp === 'pending' && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-1">
                        <Clock3 className="size-3.5" />
                        No response recorded
                    </div>
                )}
            </CardFooter>
        </Card>
    )
}