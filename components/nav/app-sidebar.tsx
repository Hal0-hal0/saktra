"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/supabase-client"
import { NavOperations } from "@/components/nav/nav-operations"
import { NavMain } from "@/components/nav/nav-main"
import { NavSecondary } from "@/components/nav/nav-secondary"
import { NavUser } from "@/components/nav/nav-user"
import Image from "next/image"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboardIcon, ListIcon, ChartBarIcon, FolderIcon, UsersIcon, CameraIcon, FileTextIcon, Settings2Icon, CircleHelpIcon, SearchIcon, DatabaseIcon, FileChartColumnIcon, FileIcon, CommandIcon } from "lucide-react"
import { Skeleton } from "../ui/skeleton"

const adminNav = [
  { title: "Dashboard", url: "/admin", icon: <LayoutDashboardIcon /> },
  { title: "Manage Members", url: "/admin/members", icon: <ListIcon /> },
  { title: "Department", url: "/admin/department", icon: <ChartBarIcon /> },
  { title: "Create Events", url: "/admin/eventsPage", icon: <FolderIcon /> },
]

const execNav = [
  { title: "Dashboard Exec", url: "/admin", icon: <LayoutDashboardIcon /> },
  { title: "Placeholder", url: "#", icon: <FolderIcon /> },
]

const userNav = [
  { title: "Dashboard User", url: "/admin", icon: <LayoutDashboardIcon /> },
  { title: "Placeholder", url: "#", icon: <FolderIcon /> },
]

const adminOperations = [
  { name: "Evaluations", url: "/admin/evaluation", icon: <DatabaseIcon /> },
  { name: "Attendance", url: "/admin/attendance", icon: <FileChartColumnIcon /> },
  { name: "Membership", url: "#", icon: <FileChartColumnIcon /> },
  { name: "Reports", url: "/admin/reportsPage", icon: <FileIcon /> },
]

const execOperations = [
  { name: "Placeholder", url: "#", icon: <DatabaseIcon /> },
]

const userOperations = [
  { name: "Placeholder", url: "#", icon: <DatabaseIcon /> },
]

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navSecondary: [
    { title: "Settings", url: "#", icon: (<Settings2Icon />) },
    { title: "Get Help", url: "#", icon: (<CircleHelpIcon />) },
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [role, setRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    const getRole = async () => {
      const { data } = await supabase.auth.getClaims()
      const userId = data?.claims?.sub
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .single()
      setRole(profile?.role)
      setRoleLoading(false)
    }
    getRole()
  }, [])

  if (roleLoading) return null

  const navItems = role === 'executive' ? execNav : role === 'user' ? userNav : adminNav
  const operationItems = role === 'executive' ? execOperations : role === 'user' ? userOperations : adminOperations

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5! "
            >
              <Link href="/admin" className="group flex items-center">
                <Image
                  src="/images/saktra-hor-logo-pur.png"
                  alt="SAKTRA Logo"
                  width={120}
                  height={40}
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavOperations items={operationItems} /> 
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}