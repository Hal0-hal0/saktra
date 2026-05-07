"use client"

import React, { useMemo, useState } from "react"
import { ArrowUpDown, Mail, Search, UserRound } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useProfiles } from "./realtime-fetch"

type DepartmentProfile = {
  user_id?: string
  user_name: string
  email: string
  role: string
  status: string
  department: string
  position: string
}

const normalizeUserName = (value?: string) => {
  if (!value || value === "null") {
    return "Member"
  }

  return value
}

const DepartmentDrawer = ({
  children,
  department,
}: {
  children: React.ReactNode
  department: string
}) => {
  const { profiles = [] } = useProfiles()
  const [searchValue, setSearchValue] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedUser, setSelectedUser] = useState<DepartmentProfile | null>(null)

  const departmentProfiles = useMemo(() => {
    return (profiles as DepartmentProfile[]).filter(
      (profile) => profile.department === department
    )
  }, [department, profiles])

  const filteredProfiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    const filtered = departmentProfiles.filter((profile) => {
      const userName = normalizeUserName(profile.user_name).toLowerCase()
      const email = (profile.email ?? "").toLowerCase()

      if (!query) {
        return true
      }

      return userName.includes(query) || email.includes(query)
    })

    return filtered.sort((a, b) => {
      const first = normalizeUserName(a.user_name).toLowerCase()
      const second = normalizeUserName(b.user_name).toLowerCase()

      return sortDirection === "asc"
        ? first.localeCompare(second)
        : second.localeCompare(first)
    })
  }, [departmentProfiles, searchTerm, sortDirection])

  const handleSearch = () => {
    setSearchTerm(searchValue)
  }

  return (
    <>
      <Drawer direction="left">
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent className="!h-full !max-w-none !w-full lg:!w-1/2 xl:!w-1/3">
          <DrawerHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <DrawerTitle className="capitalize">
                  {department} Department
                </DrawerTitle>
                <DrawerDescription>
                  View and browse the members assigned to this department.
                </DrawerDescription>
              </div>
              <Badge variant="secondary">
                {departmentProfiles.length} Members
              </Badge>
            </div>
          </DrawerHeader>

          <div className="space-y-4 overflow-y-auto px-5 pb-5">
            <Card>
              <CardHeader>
                <CardTitle>Member Directory</CardTitle>
                <CardDescription>
                  Search by username or email, then click a member to view full details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Search username or email"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        handleSearch()
                      }
                    }}
                  />
                  <Button type="button" onClick={handleSearch}>
                    <Search className="size-4" />
                    Search
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-background/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Sort members</p>
                    <p className="text-xs text-muted-foreground">
                      Username order: {sortDirection === "asc" ? "A to Z" : "Z to A"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setSortDirection((current) =>
                        current === "asc" ? "desc" : "asc"
                      )
                    }
                  >
                    <ArrowUpDown className="size-4" />
                    Sort by Username
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Members</CardTitle>
                <CardDescription>
                  Showing only username and email for quick scanning.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredProfiles.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                    No members matched your search.
                  </div>
                ) : (
                  filteredProfiles.map((profile) => (
                    <button
                      key={`${profile.email}-${profile.user_id ?? "member"}`}
                      type="button"
                      onClick={() => setSelectedUser(profile)}
                      className="w-full rounded-lg border bg-background/60 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {normalizeUserName(profile.user_name)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {profile.email}
                          </p>
                        </div>
                        <Badge variant="outline">View</Badge>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <DrawerFooter>
            <p className="text-sm text-muted-foreground">
              Select a member from the list to view complete account details.
            </p>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? normalizeUserName(selectedUser.user_name) : "Member details"}
            </DialogTitle>
            <DialogDescription>
              Full member information for the selected department user.
            </DialogDescription>
          </DialogHeader>

          {selectedUser ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserRound className="size-4" />
                    Account Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border bg-background/60 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Username
                    </p>
                    <p className="mt-1 font-medium">
                      {normalizeUserName(selectedUser.user_name)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background/60 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Email
                    </p>
                    <p className="mt-1 font-medium">{selectedUser.email}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="size-4" />
                    Organization Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-background/60 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Role
                      </p>
                      <p className="mt-1 font-medium capitalize">
                        {selectedUser.role || "Not set"}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-background/60 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Status
                      </p>
                      <p className="mt-1 font-medium capitalize">
                        {selectedUser.status || "Not set"}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-background/60 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Department
                      </p>
                      <p className="mt-1 font-medium capitalize">
                        {selectedUser.department || "Not set"}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-background/60 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Position
                      </p>
                      <p className="mt-1 font-medium">
                        {selectedUser.position || "Not set"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default DepartmentDrawer
