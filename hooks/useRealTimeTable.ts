import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/supabase-client'

export function useRealtimeTables(tables: string[], onChange: () => void) {
  useEffect(() => {
    const channels = tables.map(table =>
      supabase
        .channel(`${table}-changes`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => onChange()
        )
        .subscribe()
    )

    return () => channels.forEach(channel => supabase.removeChannel(channel))
  }, [])
}


// USAGE EXAMPLE
/*
import { useState } from 'react'
import { useRealtimeTables } from '@/hooks/useRealtimeTable'

useRealtimeTables(['table'], fetchfunction) // ← just pass it in

OR

useRealtimeTables([
  { table: 'task', onChange: fetchTasks },
  { table: 'users', onChange: fetchUsers },
  { table: 'audit_log', onChange: fetchLogs },
])

*/