'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/supabase-client'
import SkeletonMembers from './skeleton-members'

const ProfileContext = createContext<any>(null)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState (true)

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*')
    setProfiles(data || [])
    setLoading(false)
  }

useEffect(() => {
  fetchProfiles()

  const channel = supabase
    .channel(`profiles-realtime-members`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles',  },
      (payload) => {
        console.log('Change received!', payload)
        fetchProfiles()
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
    <ProfileContext.Provider value={{ profiles }}>
      {loading ? <SkeletonMembers/> : children }
      
    </ProfileContext.Provider>
  )
}

export const useProfiles = () => useContext(ProfileContext)