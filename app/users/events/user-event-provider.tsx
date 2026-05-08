'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/supabase-client'

export type EventStatus = 'accepted' | 'declined' | 'pending'

export type UserEvent = {
    id: string
    name: string
    description: string
    location: string
    venue: string
    date_start: string
    date_end: string
    time_start: string
    time_end: string
    status?: string // admin-set: 'done' | undefined
    rsvp?: EventStatus
    hasEvaluated?: boolean
}

type UserEventContextValue = {
    events: UserEvent[]
    userId: string | null
    loading: boolean
    updateRsvp: (eventId: string, rsvp: EventStatus) => Promise<void>
}

const UserEventContext = createContext<UserEventContextValue>({
    events: [],
    userId: null,
    loading: true,
    updateRsvp: async () => { },
})

export function UserEventProvider({ children }: { children: React.ReactNode }) {
    const [events, setEvents] = useState<UserEvent[]>([])
    const [userId, setUserId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = async (uid: string) => {
        // Fetch all events
        const { data: eventsData } = await supabase
            .from('events')
            .select('*')
            .order('date_start', { ascending: true })

        // Fetch this user's RSVPs
        const { data: rsvpData } = await supabase
            .from('event_rsvp')
            .select('event_id, status')
            .eq('user_id', uid)

        // Fetch this user's evaluations
        const { data: evalData } = await supabase
            .from('event_evaluations')
            .select('event_id')
            .eq('user_id', uid)

        const rsvpMap = new Map<string, EventStatus>(
            (rsvpData ?? []).map((r) => [r.event_id, r.status as EventStatus])
        )
        const evaluatedSet = new Set<string>(
            (evalData ?? []).map((e) => e.event_id)
        )

        const merged: UserEvent[] = (eventsData ?? []).map((event) => ({
            ...event,
            rsvp: rsvpMap.get(event.id) ?? 'pending',
            hasEvaluated: evaluatedSet.has(event.id),
        }))

        setEvents(merged)
        setLoading(false)
    }

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            const uid = data.user?.id ?? null
            setUserId(uid)
            if (uid) fetchData(uid)
            else setLoading(false)
        })
    }, [])

    useEffect(() => {
        if (!userId) return

        const channel = supabase
            .channel('user-events-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
                fetchData(userId)
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_rsvp' }, () => {
                fetchData(userId)
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_evaluations' }, () => {
                fetchData(userId)
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [userId])

    const updateRsvp = async (eventId: string, rsvp: EventStatus) => {
        if (!userId) return

        await supabase.from('event_rsvp').upsert(
            { user_id: userId, event_id: eventId, status: rsvp },
            { onConflict: 'user_id,event_id' }
        )

        // Optimistic update
        setEvents((prev) =>
            prev.map((e) => (e.id === eventId ? { ...e, rsvp } : e))
        )
    }

    return (
        <UserEventContext.Provider value={{ events, userId, loading, updateRsvp }}>
            {children}
        </UserEventContext.Provider>
    )
}

export const useUserEvent = () => useContext(UserEventContext)