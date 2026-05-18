'use client'
import React, { useEffect } from 'react'
import { supabase } from '@/lib/supabase/supabase-client'
import { useState,createContext,useContext } from 'react'
import SkeletonMembers from './skeleton-department'


const RealtimeContext = createContext<any>(null)

const RealtimeFetch = ({ children }: { children: React.ReactNode }) => {
    const [profiles, setProfiles] = useState<any[]>([])
    const [loading, setLoading] = useState (true)

    const fetchProfile = async () => {
        // Fetch profiles
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
        
        if (profilesError) {
            console.error("Error fetching profiles:", profilesError)
            setLoading(false)
            return
        }

        // Fetch scores separately
        const { data: scoresData } = await supabase
            .from('user_scores')
            .select('user_id, average_score')

        // Merge them
        const scoreMap = new Map((scoresData || []).map(s => [s.user_id, s.average_score]))
        const merged = (profilesData || []).map(profile => ({
            ...profile,
            user_scores: scoreMap.has(profile.user_id) 
                ? [{ average_score: scoreMap.get(profile.user_id) }] 
                : []
        }))

        setProfiles(merged)
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