'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/supabase-client'
import SkeletonMembers from './skeleton-members'

const EventContext = createContext<any>(null)

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').eq('is_hidden', false)
    setEvents(data || [])
    
    const { data: profilesData } = await supabase.from('profiles').select('*')
    setProfiles(profilesData || [])
    
    setLoading(false)
  }
  console.log('Events Data:', events)

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
    <EventContext.Provider value={{events, profiles}}>
      {loading ? <SkeletonMembers/> : children }
    </EventContext.Provider>
  )
}

export const useEvent = () => useContext(EventContext)