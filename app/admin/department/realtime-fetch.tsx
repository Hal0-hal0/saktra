'use client'
import React, { useEffect } from 'react'
import { supabase } from '@/lib/supabase/supabase-client'
import { useState,createContext,useContext } from 'react'
import SkeletonMembers from './skeleton-department'


const RealtimeContext = createContext<any>(null)

const RealtimeFetch = ({ children }: { children: React.ReactNode }) => {
    const [profiles, setProfiles] = useState<any[]>([])
    const [loading, setLoading] = useState (true)

    const fetchProfile = async ()=> {
        const {data:details} = await supabase
            .from('profiles')
            .select('*')
            setProfiles (details || [])
        setLoading(false)
    }

    useEffect (() => {
        fetchProfile()

        const channel = supabase
        .channel(`deopartment-realtime-details`)
        .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles',  },
        (payload) => {
            fetchProfile()
        }
        )
        .subscribe((status) => {
        }) 

    return () => {
        supabase.removeChannel(channel) 
    }
    }, []) 
  return (
    <RealtimeContext.Provider value={{ profiles }}>
      {loading ? <SkeletonMembers/> : children}
    </RealtimeContext.Provider>
  )
}

export const useProfiles = () => useContext(RealtimeContext)
export default RealtimeFetch