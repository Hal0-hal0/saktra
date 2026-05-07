'use client'

import { ClipboardCheck, UsersRound } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import EventEvaluationSection from "./event-evaluation-section"
import MemberEvaluationSection from "./member-evaluation-section"

export default function EvaluationTabs() {
  return (
    <Tabs defaultValue="events" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Evaluation</h1>
          <p className="text-sm text-muted-foreground">
            Switch between event evaluations and member evaluations.
          </p>
        </div>

        <TabsList className="grid h-auto w-full grid-cols-2 lg:w-fit">
          <TabsTrigger value="events" className="gap-2 px-4 py-2">
            <ClipboardCheck className="size-4" />
            Event
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2 px-4 py-2">
            <UsersRound className="size-4" />
            Members
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="events" className="mt-0">
        <EventEvaluationSection />
      </TabsContent>

      <TabsContent value="members" className="mt-0">
        <MemberEvaluationSection />
      </TabsContent>
    </Tabs>
  )
}
