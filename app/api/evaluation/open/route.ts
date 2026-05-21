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

  const body = await request.json()
  const { eventId, eventIds, evaluationDeadline } = body as {
    eventId?: string | number
    eventIds?: Array<string | number>
    evaluationDeadline?: string
  }

  const rawIds = Array.isArray(eventIds) && eventIds.length ? eventIds : eventId !== undefined ? [eventId] : []
  const eventIdNumbers = rawIds
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id))

  if (eventIdNumbers.length === 0) {
    return Response.json({ error: "At least one event is required." }, { status: 400 })
  }

  if (!evaluationDeadline) {
    return Response.json({ error: "Evaluation close date is required." }, { status: 400 })
  }

  const { data: targetEvents, error: targetError } = await supabaseAdmin
    .from("events")
    .select("id, status")
    .in("id", eventIdNumbers)

  if (targetError || !targetEvents || targetEvents.length === 0) {
    return Response.json({ error: "Selected events were not found." }, { status: 404 })
  }

  if (targetEvents.length !== eventIdNumbers.length) {
    return Response.json({ error: "One or more selected events could not be found." }, { status: 404 })
  }

  if (targetEvents.some((event) => event.status !== "done")) {
    return Response.json({ error: "Only completed events can be opened for evaluation." }, { status: 400 })
  }

  const { error: openError } = await supabaseAdmin
    .from("events")
    .update({
      evaluation_open: true,
      evaluation_deadline: evaluationDeadline,
    })
    .in("id", eventIdNumbers)

  if (openError) {
    return Response.json({ error: openError.message }, { status: 400 })
  }

  return Response.json({ success: true, count: eventIdNumbers.length })
}
