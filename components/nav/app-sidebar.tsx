"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/supabase-client"
import { NavOperations } from "@/components/nav/nav-operations"
import { NavMain } from "@/components/nav/nav-main"
import { NavSecondary } from "@/components/nav/nav-secondary"
import { NavUser } from "@/components/nav/nav-user"
import { GroupAddIcon } from "../icons/material-symbols-group-add"
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
import { LayoutDashboardIcon, ListIcon, ChartBarIcon, FolderIcon, Settings2Icon, CircleHelpIcon, FileIcon, ScanLineIcon } from "lucide-react"
import { HistoryRoundedIcon } from "@/components/icons/material-symbols-history-rounded"
import { CheckbookRoundedIcon } from "@/components/icons/material-symbols-checkbook-rounded"
import { Groups2Icon } from "@/components/icons/material-symbols-groups-2"
import { CalendarAddOnIcon } from "../icons/material-symbols-calendar-add-on"
import { DataCheckIcon } from "../icons/material-symbols-data-check"

const adminNav = [
  { title: "Dashboard", url: "/admin", icon: <LayoutDashboardIcon /> },
  { title: "Manage Members", url: "/admin/members", icon: <GroupAddIcon /> },
  { title: "Department", url: "/admin/department", icon: <ChartBarIcon /> },
  { title: "Manage Events", url: "/admin/eventsPage", icon: <CalendarAddOnIcon /> },
]

const execNav = [
  { title: "Dashboard Exec", url: "/admin", icon: <LayoutDashboardIcon /> },
  { title: "Placeholder", url: "#", icon: <FolderIcon /> },
  { title: "Events", url: "/users/events", icon: <LayoutDashboardIcon /> },
  { title: "My Performance", url: "/users/myPerformance", icon: <ChartBarIcon /> },
]

const userNav = [
  { title: "Dashboard User", url: "/users", icon: <LayoutDashboardIcon /> },
  { title: "Events", url: "/users/events", icon: <LayoutDashboardIcon /> },
  { title: "Scan Attendance", url: "/users/scan", icon: <ScanLineIcon /> },
  { title: "My Performance", url: "/users/myPerformance", icon: <ChartBarIcon /> },
]

const adminOperations = [
  { name: "Event History", url: "/admin/evHistory", icon: <HistoryRoundedIcon /> },
  { name: "Evaluations", url: "/admin/evaluation", icon: <DataCheckIcon /> },
  { name: "Attendance", url: "/admin/attendance", icon: <CheckbookRoundedIcon /> },
  { name: "Membership", url: "/admin/membership", icon: <Groups2Icon /> },
  { name: "Scores", url: "/admin/scores", icon: <ChartBarIcon /> },
  { name: "Reports", url: "/admin/reportsPage", icon: <FileIcon /> },
]

const execOperations = [
  { name: "Evaluation", url: "/users/evaluation", icon: <DataCheckIcon /> },

]

// Board of Directors (BOD) share the admin navigation — the rename is UI-only;
// the DB role may be 'bod' or legacy 'admin'.
const bodNav = adminNav
const bodOperations = adminOperations

const userOperations = [
  { name: "Evaluation", url: "/users/evaluation", icon: <DataCheckIcon /> },
]

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navSecondary: [
    // { title: "Settings", url: "#", icon: (<Settings2Icon />) },
    { title: "The Developers", url: "#", icon: (<CircleHelpIcon />) },
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

  const navItems = role === 'executive' ? execNav : role === 'bod' ? bodNav : role === 'user' ? userNav : adminNav
  const operationItems = role === 'executive' ? execOperations : role === 'bod' ? bodOperations : role === 'user' ? userOperations : adminOperations

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
