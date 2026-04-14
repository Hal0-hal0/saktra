'use client'
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase/supabase-client"
import { useEffect, useState } from "react"

export function SiteHeader() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true)

  const getUser = async () => {
    const {data: user} = await supabase.auth.getClaims();
  
    const {data:details} = await supabase 
    .from('profiles')
    .select('*')
    .eq('user_id', user?.claims?.sub)
    .single();
    setUser(details);
    setLoading(false)

    console.log('role',details)
  }

  useEffect (() => {
    getUser()
  },[])

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 my-2 data-[orientation=vertical]:h-5"
        />

          {!loading ? (
            <>
              <h1 className="text-base font-bold capitalize">{user?.role} | <span className="text-base capitalize font-normal">{user?.user_name}</span> </h1>
            </>
          ) : (
            <>Loading...</>
          )}
        
      </div>


    </header>
  )
}
