import { supabaseAdmin } from "@/lib/supabase/supabase-admin"
import { createRouteClient } from "@/lib/supabase/route-client"

// GET: returns per-event score rows for the Admin → Scores → Event Scores tab.
// Uses the service-role client so admins can see response counts across every
// user, not just rows their RLS lets through. Returns events that have either
// been evaluated (response_count > 0) or currently hold a score.
export async function GET() {
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .single()

  if (profile?.role !== "admin" && profile?.role !== "bod") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const [{ data: events, error: eventsErr }, { data: responses, error: respErr }] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("id, name, status, event_eval_score, date_start, date_end, is_hidden")
      .or("is_hidden.is.null,is_hidden.eq.false"),
    supabaseAdmin.from("response").select("event_id"),
  ])

  if (eventsErr) return Response.json({ error: eventsErr.message }, { status: 400 })
  if (respErr) return Response.json({ error: respErr.message }, { status: 400 })

  const responseCount = new Map<number, number>()
  responses?.forEach((r: any) => {
    const id = Number(r.event_id)
    if (!Number.isFinite(id)) return
    responseCount.set(id, (responseCount.get(id) ?? 0) + 1)
  })

  const rows = (events ?? [])
    .filter((e: any) => {
      const hasResponses = (responseCount.get(Number(e.id)) ?? 0) > 0
      const hasScore = e.event_eval_score !== null && e.event_eval_score !== undefined
      return hasResponses || hasScore
    })
    .map((e: any) => ({
      id: Number(e.id),
      name: e.name ?? "Untitled event",
      status: e.status,
      event_eval_score: e.event_eval_score !== null ? Number(e.event_eval_score) : null,
      date_start: e.date_start,
      date_end: e.date_end,
      response_count: responseCount.get(Number(e.id)) ?? 0,
    }))

  return Response.json({ rows })
}
