'use client'

import { ClipboardCheck, UsersRound } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import UserEventEvaluationSection from "./event-evaluation-section"
import MemberEvaluationList from "./member-evaluation-list"

export default function UserEvaluationTabs() {
  return (
    <Tabs defaultValue="events" className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Evaluations</h1>
          <p className="text-sm text-muted-foreground">
            Complete event feedback or evaluate members within your approved scope.
          </p>
        </div>

        <TabsList className="grid h-auto w-full grid-cols-2 lg:w-fit">
          <TabsTrigger value="events" className="gap-2 px-4 py-2">
            <ClipboardCheck className="size-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2 px-4 py-2">
            <UsersRound className="size-4" />
            Members
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="events" className="mt-0">
        <UserEventEvaluationSection />
      </TabsContent>

      <TabsContent value="members" className="mt-0">
        <MemberEvaluationList />
      </TabsContent>
    </Tabs>
  )
}
