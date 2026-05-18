import { supabaseAdmin } from "@/lib/supabase/supabase-admin"
import { createRouteClient } from "@/lib/supabase/route-client"

async function requireAdmin() {
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .single()

  if (profile?.role !== "admin" && profile?.role !== "bod") {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { userId }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) {
    return auth.error
  }

  const { title, evaluationDeadline, eventId } = (await request.json()) as {
    title?: string
    evaluationDeadline?: string
    eventId?: string | number
  }

  if (!evaluationDeadline) {
    return Response.json({ error: "Set a close date before starting member evaluation." }, { status: 400 })
  }

  const { data: cycle, error } = await supabaseAdmin
    .from("member_evaluation_cycle")
    .insert({
      title: title?.trim() || "Member Evaluation",
      evaluation_deadline: evaluationDeadline,
      evaluation_open: true,
      event_id: eventId ? Number(eventId) : null,
    })
    .select("id, title, evaluation_open, evaluation_deadline, created_at, started_at")
    .single()

  if (error || !cycle) {
    return Response.json({ error: error?.message || "Unable to start member evaluation." }, { status: 400 })
  }

  return Response.json({ cycle: { ...cycle, id: String(cycle.id), response_count: 0 } })
}
