import { createRouteClient } from "@/lib/supabase/route-client"
import { supabaseAdmin } from "@/lib/supabase/supabase-admin"

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

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) {
    return auth.error
  }

  const { eventId, evaluationDeadline } = await request.json()
  const eventIdNumber = Number(eventId)

  if (!eventId || Number.isNaN(eventIdNumber)) {
    return Response.json({ error: "Event is required." }, { status: 400 })
  }

  if (!evaluationDeadline) {
    return Response.json({ error: "Evaluation close date is required." }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("events")
    .update({
      evaluation_open: true,
      evaluation_deadline: evaluationDeadline,
    })
    .eq("id", eventIdNumber)

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
