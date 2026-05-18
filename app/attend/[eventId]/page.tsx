"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Result = {
  success: true
  alreadyCheckedIn: boolean
  eventName: string
  pointsAwarded: number
  checkedInAt: string
} | {
  success: false
  error: string
}

export default function AttendPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params)
  const router = useRouter()
  const [state, setState] = useState<"loading" | "auth" | "done">("loading")
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        // Send to login, then bounce back here after sign-in.
        if (!cancelled) {
          setState("auth")
          const next = encodeURIComponent(`/attend/${eventId}`)
          router.replace(`/login?next=${next}`)
        }
        return
      }

      try {
        const res = await fetch("/api/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId }),
        })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setResult({ success: false, error: json?.error ?? "Check-in failed" })
        } else {
          setResult(json)
        }
      } catch (err: any) {
        if (!cancelled) setResult({ success: false, error: err?.message ?? "Network error" })
      } finally {
        if (!cancelled) setState("done")
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [eventId, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Event Check-in</CardTitle>
          <CardDescription>
            {state === "loading" && "Verifying your attendance…"}
            {state === "auth" && "Redirecting to sign in…"}
            {state === "done" && (result?.success ? "Recorded." : "Could not check you in.")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {state !== "done" ? (
            <div className="flex items-center justify-center min-h-32">
              <Loader2 className="size-8 animate-spin text-violet-600" />
            </div>
          ) : result?.success ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="size-6" />
                <span className="font-semibold">
                  {result.alreadyCheckedIn ? "Already checked in" : "You're in!"}
                </span>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Event</p>
                <p className="font-medium">{result.eventName}</p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Points</p>
                <div className="flex items-center gap-2">
                  <Badge>{result.alreadyCheckedIn ? `+${result.pointsAwarded} (already credited)` : `+${result.pointsAwarded}`}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Checked in at {new Date(result.checkedInAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="size-6" />
                <span className="font-semibold">Check-in failed</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {result?.success === false ? result.error : "Unknown error"}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.push("/users")}>
            Go to dashboard
          </Button>
          <Button type="button" className="flex-1" onClick={() => router.push("/users/events")}>
            View events
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
