import { createRouteClient } from "@/lib/supabase/route-client"
import { supabaseAdmin } from "@/lib/supabase/supabase-admin"

export async function GET() {
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)

  await supabaseAdmin
    .from("events")
    .update({ evaluation_open: false })
    .eq("evaluation_open", true)
    .lt("evaluation_deadline", today)

  const [{ data: openEvents, error: eventError }, { data: criteria, error: criteriaError }, { data: rsvps, error: rsvpError }] =
    await Promise.all([
      supabaseAdmin
        .from("events")
        .select("id, name, status, evaluation_open, evaluation_deadline")
        .eq("evaluation_open", true)
        .order("name"),
      supabaseAdmin
        .from("event_eval_criteria")
        .select("id, criteria_description, criteria_type")
        .order("criteria_type")
        .order("criteria_description"),
      supabaseAdmin
        .from("event_rsvp")
        .select("event_id")
        .eq("user_id", userId)
        .eq("status", "accepted")
    ])

  if (eventError || criteriaError || rsvpError) {
    return Response.json(
      { error: eventError?.message || criteriaError?.message || rsvpError?.message || "Unable to load evaluation." },
      { status: 400 }
    )
  }

  const acceptedEventIds = new Set((rsvps || []).map(r => r.event_id))
  const filteredOpenEvents = (openEvents || []).filter(e => acceptedEventIds.has(e.id))

  if (filteredOpenEvents.length === 0) {
    return Response.json({
      openEvents: [],
      criteria: criteria ?? [],
      responses: [],
      answers: [],
    })
  }

  const eventIds = filteredOpenEvents.map((event) => event.id)

  const { data: responses, error: responseError } = await supabaseAdmin
    .from("response")
    .select("id, user_id, event_id, status, created_at")
    .in("event_id", eventIds)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (responseError) {
    return Response.json({ error: responseError.message }, { status: 400 })
  }

  const responseIds = (responses ?? []).map((response) => response.id)

  const { data: answers, error: answersError } = responseIds.length
    ? await supabaseAdmin
        .from("event_eval_answer")
        .select("id, response_id, criteria_id, user_id, rating_value, answer_text, created_at")
        .in("response_id", responseIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null }

  if (answersError) {
    return Response.json({ error: answersError.message }, { status: 400 })
  }

  return Response.json({
    openEvents: filteredOpenEvents.map((event) => ({
      ...event,
      id: String(event.id),
    })),
    criteria: (criteria ?? []).map((item) => ({
      ...item,
      id: String(item.id),
    })),
    responses: (responses ?? []).map((response) => ({
      ...response,
      id: String(response.id),
      event_id: String(response.event_id),
    })),
    answers: (answers ?? []).map((answer) => ({
      ...answer,
      id: String(answer.id),
      response_id: String(answer.response_id),
      criteria_id: String(answer.criteria_id),
    })),
  })
}
