'use client'

import { useMemo, useState } from 'react'
import { Search, CalendarClock, Calendar, History, LayoutGrid, ArrowUpDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EventCard, getEventCategory, type EventCategory } from './event-card'
import { useUserEvent } from './user-event-provider'
import { parse, compareAsc, compareDesc } from 'date-fns'

type Tab = 'all' | EventCategory
type RsvpFilter = 'all' | 'accepted' | 'declined' | 'pending'

const tabs: { value: Tab; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All Events', icon: <LayoutGrid className="size-3.5" /> },
    { value: 'ongoing', label: 'Ongoing', icon: <CalendarClock className="size-3.5" /> },
    { value: 'upcoming', label: 'Upcoming', icon: <Calendar className="size-3.5" /> },
    { value: 'past', label: 'Past', icon: <History className="size-3.5" /> },
]

const rsvpFilterLabels: Record<RsvpFilter, string> = {
    all: 'All Responses',
    accepted: 'Accepted',
    declined: 'Declined',
    pending: 'Pending',
}

export default function UserEventsPage() {
    const { events, userId, loading, updateRsvp } = useUserEvent()
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState<Tab>('all')
    const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('all')

    const filtered = useMemo(() => {
        const result = events.filter((event) => {
            const matchesTab =
                activeTab === 'all' || getEventCategory(event) === activeTab

            const matchesRsvp =
                rsvpFilter === 'all' || (event.rsvp ?? 'pending') === rsvpFilter

            const query = search.toLowerCase()
            const matchesSearch =
                !query ||
                event.name.toLowerCase().includes(query) ||
                event.location?.toLowerCase().includes(query) ||
                event.venue?.toLowerCase().includes(query) ||
                event.description?.toLowerCase().includes(query)

            return matchesTab && matchesRsvp && matchesSearch
        })

        return result
    }, [events, activeTab, search, rsvpFilter])

    const counts = useMemo(() => {
        const result: Record<string, number> = { all: events.length, ongoing: 0, upcoming: 0, past: 0 }
        events.forEach((e) => { result[getEventCategory(e)]++ })
        return result
    }, [events])

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
                <div className="h-10 w-full max-w-sm rounded-md bg-muted animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold">Events</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Browse and respond to upcoming and ongoing events.
                </p>
            </div>

            {/* Search + Sort + Filter */}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search events..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* RSVP filter dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2 shrink-0">
                            <ArrowUpDown className="size-4" />
                            Status: {rsvpFilterLabels[rsvpFilter]}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuLabel>Filter by response</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup value={rsvpFilter} onValueChange={(v) => setRsvpFilter(v as RsvpFilter)}>
                            {(Object.entries(rsvpFilterLabels) as [RsvpFilter, string][]).map(([key, label]) => (
                                <DropdownMenuRadioItem key={key} value={key}>
                                    {label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
                    <TabsList className="h-10">
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="flex items-center gap-1.5 text-xs"
                            >
                                {tab.icon}
                                {tab.label}
                                <span className="ml-0.5 text-[10px] font-semibold opacity-60">
                                    ({counts[tab.value]})
                                </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {/* Cards Grid */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    <CalendarClock className="size-10 mb-3 opacity-30" />
                    <p className="font-medium">No events found</p>
                    <p className="text-sm mt-1 opacity-70">
                        {search
                            ? 'Try adjusting your search terms.'
                            : 'Check back later for new events.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((event) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            userId={userId ?? ''}
                            onRsvp={updateRsvp}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
