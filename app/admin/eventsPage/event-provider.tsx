'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/supabase-client'
import SkeletonMembers from './skeleton-members'

const EventContext = createContext<any>(null)

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState (true)

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*')
    setEvents(data || [])
    setLoading(false)
  }
  console.log('Events Data:', events )

useEffect(() => {
  fetchEvents()

  const channel = supabase
    .channel(`profiles-realtime-members`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'events',  },
      (payload) => {
        console.log('Change received!', payload)
        fetchEvents()
      }
    )
    .subscribe((status) => {
      console.log('Realtime status:', status)
    }) 

  return () => {
    supabase.removeChannel(channel) 
  }
}, [])

  return (
    <EventContext.Provider value={{events }}>
      {loading ? <SkeletonMembers/> : children }
    </EventContext.Provider>
  )
}

export const useEvent = () => useContext(EventContext)