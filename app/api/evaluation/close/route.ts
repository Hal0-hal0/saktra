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

  if (profile?.role !== "admin") {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { userId }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) {
    return auth.error
  }

  const { eventId } = await request.json()
  const eventIdNumber = Number(eventId)

  if (!eventId || Number.isNaN(eventIdNumber)) {
    return Response.json({ error: "Event is required." }, { status: 400 })
  }

  const { data: responses, error: responseError } = await supabaseAdmin
    .from("response")
    .select("id")
    .eq("event_id", eventIdNumber)

  if (responseError) {
    return Response.json({ error: responseError.message }, { status: 400 })
  }

  const responseIds = (responses ?? []).map((item) => item.id)
  const { data: answers, error: answersError } = responseIds.length
    ? await supabaseAdmin
        .from("event_eval_answer")
        .select("rating_value")
        .in("response_id", responseIds)
    : { data: [], error: null }

  if (answersError) {
    return Response.json({ error: answersError.message }, { status: 400 })
  }

  const ratings = (answers ?? [])
    .map((answer) => Number(answer.rating_value))
    .filter((value) => !Number.isNaN(value))

  const averageScore = ratings.length
    ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2))
    : null

  const { error: closeError } = await supabaseAdmin
    .from("events")
    .update({
      evaluation_open: false,
      event_eval_score: averageScore,
      evaluation_deadline: null,
    })
    .eq("id", eventIdNumber)

  if (closeError) {
    return Response.json({ error: closeError.message }, { status: 400 })
  }

  return Response.json({ success: true, event_eval_score: averageScore })
}
