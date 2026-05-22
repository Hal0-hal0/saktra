'use client'

import { ClipboardCheck, ShieldCheck, UsersRound } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EventEvaluationSection from "./event-evaluation-section"
import MemberEvaluationSection from "./member-evaluation-section"
import MemberEvaluationList from "@/app/users/evaluation/member-evaluation-list"

export default function EvaluationTabs() {
  return (
    <Tabs defaultValue="events" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Evaluation</h1>
          <p className="text-sm text-muted-foreground">
            Manage event and member evaluations, or evaluate executives who participated in an event.
          </p>
        </div>

        <TabsList className="grid h-auto w-full grid-cols-3 lg:w-fit">
          <TabsTrigger value="events" className="gap-2 px-4 py-2">
            <ClipboardCheck className="size-4" />
            Event
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2 px-4 py-2">
            <UsersRound className="size-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="evaluate-execs" className="gap-2 px-4 py-2">
            <ShieldCheck className="size-4" />
            Evaluate Executives
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="events" className="mt-0">
        <EventEvaluationSection />
      </TabsContent>

      <TabsContent value="members" className="mt-0">
        <MemberEvaluationSection />
      </TabsContent>

      <TabsContent value="evaluate-execs" className="mt-0">
        <MemberEvaluationList />
      </TabsContent>
    </Tabs>
  )
}
