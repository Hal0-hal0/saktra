"use client"
import { supabase } from "@/lib/supabase/supabase-client"
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { ModeToggle } from "../mode-toggle";
import { LogOutConfirmation } from "@/auth/logOutConfirmation";
import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { EllipsisVerticalIcon, CircleUserRoundIcon, CreditCardIcon, BellIcon, LogOutIcon } from "lucide-react"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const router = useRouter();
  const { isMobile } = useSidebar()


  const logout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
      }

  const [userDetails,setUser] = useState<any>(null) 

  const getUser = async() => {
    const {data:user} = await supabase.auth.getClaims();

    const {data:details} = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user?.claims?.sub)
    .single()
    setUser(details)
  }

  useEffect (() => {
    getUser()

    const channel = supabase
    .channel('profile')
    .on('postgres_changes',
      {event:'*', schema:'public', table:'profiles'},
      () => {
        getUser() //refetch when chnages
      }
    )
    .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground bg-muted border"
            
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userDetails?.user_name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {userDetails?.email}
                </span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userDetails?.user_name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userDetails?.email}
                  </span>
                </div>
                <ModeToggle />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href={'/admin/profile'}>
                <DropdownMenuItem >
                <CircleUserRoundIcon
                />
                Profile
              </DropdownMenuItem>
              </Link>
              
              <DropdownMenuItem>
                <CreditCardIcon
                />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BellIcon
                />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <LogOutConfirmation>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <LogOutIcon
                />
                Log out
              </DropdownMenuItem>
            </LogOutConfirmation>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
