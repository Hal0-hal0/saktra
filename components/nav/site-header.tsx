'use client'
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase/supabase-client"
import { useEffect, useState } from "react"

export function SiteHeader() {
    const [userId, setUserId] = useState<string | null>(null)

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const getUser = async () => {
    const { data } = await supabase.auth.getClaims()
    const id = data?.claims?.sub
    setUserId(id ?? null)

    const { data: details } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single()
    setUser(details)
    setLoading(false)
  }

  useEffect(() => {
    getUser()
  }, [])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('site-header-profile')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` },
        (payload) => {
          setUser(payload.new)
          setLoading(false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 my-2 data-[orientation=vertical]:h-5"
        />
        {!loading ? (
          <h1 className="text-base font-bold capitalize">
            {user?.role} | <span className="text-base capitalize font-normal">{user?.user_name}</span>
          </h1>
        ) : (
          <>Loading...</>
        )}
      </div>
    </header>
  )
}