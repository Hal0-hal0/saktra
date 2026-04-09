'use client'
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase/supabase-client"
import { useEffect, useState } from "react"

export function SiteHeader() {
  const [user, setUser] = useState<any>(null);

  const getUser = async () => {
    const {data: user} = await supabase.auth.getClaims();

    const {data:details} = await supabase 
    .from('profiles')
    .select('*')
    .eq('user_id', user?.claims?.sub)
    .single();
    setUser(details);

    console.log('role',details)
  }

  useEffect (() => {
    getUser()
  },[])


  //steps sto get user role:
  //1. Get the user claims to get the user id
  //2. Use the user id to query the profiles table to get the role
  //whats wrong here? I am getting the user claims but when I try to get the role, I am getting an error that says "Cannot read properties of null (reading 'claims')". This is because the user variable is not defined in the getUserRole function. I need to define the user variable in the getUserRole function or pass it as a parameter from the getUser function.

  

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 my-2 data-[orientation=vertical]:h-5"
        />
        <h1 className="text-base font-bold capitalize">{user?.role} | <span className="text-base capitalize font-normal">{user?.user_name}</span> </h1>

        <div className="absolute inset-y-0 right-0 mx-6 my-2">
        </div>
        
      </div>


    </header>
  )
}
