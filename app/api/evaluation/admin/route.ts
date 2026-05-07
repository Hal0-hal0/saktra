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

  if (profile?.role !== "admin") {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { userId }
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) {
    return auth.error
  }

  const today = new Date().toISOString().slice(0, 10)

  await supabaseAdmin
    .from("events")
    .update({ evaluation_open: false })
    .eq("evaluation_open", true)
    .lt("evaluation_deadline", today)

  const url = new URL(request.url)
  const eventId = url.searchParams.get("eventId")
  const selectedEventIdNumber = eventId ? Number(eventId) : null

  const [{ data: events, error: eventsError }, { data: criteria, error: criteriaError }] =
    await Promise.all([
      supabaseAdmin
        .from("events")
        .select("id, name, status, evaluation_open, event_eval_score, date_start, date_end, evaluation_deadline")
        .eq("status", "done")
        .order("name"),
      supabaseAdmin
        .from("event_eval_criteria")
        .select("id, criteria_description, criteria_type")
        .order("criteria_type")
        .order("criteria_description"),
    ])

  if (eventsError || criteriaError) {
    return Response.json(
      { error: eventsError?.message || criteriaError?.message || "Unable to load evaluation data." },
      { status: 400 }
    )
  }

  const openEvent = events?.find((event) => event.evaluation_open) ?? null
  const selectedEventId = selectedEventIdNumber ?? openEvent?.id ?? events?.[0]?.id ?? null

  const eventIds = (events ?? []).map((event) => event.id)

  const { data: eventResponses, error: eventResponsesError } = eventIds.length
    ? await supabaseAdmin
        .from("response")
        .select("id, event_id")
        .in("event_id", eventIds)
    : { data: [], error: null }

  if (eventResponsesError) {
    return Response.json({ error: eventResponsesError.message }, { status: 400 })
  }

  const responseCountByEvent = (eventResponses ?? []).reduce<Record<number, number>>((acc, response) => {
    acc[response.event_id] = (acc[response.event_id] ?? 0) + 1
    return acc
  }, {})

  const allResponseIds = (eventResponses ?? []).map((response) => response.id)
  const { data: allAnswerRatings, error: allAnswerRatingsError } = allResponseIds.length
    ? await supabaseAdmin
        .from("event_eval_answer")
        .select("response_id, rating_value")
        .in("response_id", allResponseIds)
    : { data: [], error: null }

  if (allAnswerRatingsError) {
    return Response.json({ error: allAnswerRatingsError.message }, { status: 400 })
  }

  const eventIdByResponseId = new Map((eventResponses ?? []).map((response) => [response.id, response.event_id]))
  const scoreBuckets = (allAnswerRatings ?? []).reduce<Record<number, number[]>>((acc, answer) => {
    const eventId = eventIdByResponseId.get(answer.response_id)
    const rating = Number(answer.rating_value)

    if (!eventId || Number.isNaN(rating)) {
      return acc
    }

    if (!acc[eventId]) {
      acc[eventId] = []
    }

    acc[eventId].push(rating)
    return acc
  }, {})

  const computedScoreByEvent = Object.fromEntries(
    Object.entries(scoreBuckets).map(([eventId, ratings]) => {
      const average = ratings.length
        ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2))
        : null

      return [Number(eventId), average]
    })
  ) as Record<number, number | null>

  const withDisplayScore = (event: (typeof events)[number]) => ({
    ...event,
    event_eval_score: event.event_eval_score ?? computedScoreByEvent[event.id] ?? null,
  })

  if (!selectedEventId) {
    return Response.json({
      events: (events ?? []).map((event) => ({
        ...withDisplayScore(event),
        id: String(event.id),
        response_count: responseCountByEvent[event.id] ?? 0,
      })),
      openEvent: openEvent
        ? {
            ...withDisplayScore(openEvent),
            id: String(openEvent.id),
            response_count: responseCountByEvent[openEvent.id] ?? 0,
          }
        : null,
      criteria: criteria ?? [],
      responses: [],
    })
  }

  const { data: responses, error: responsesError } = await supabaseAdmin
    .from("response")
    .select("id, user_id, event_id, status, created_at")
    .eq("event_id", selectedEventId)
    .order("created_at", { ascending: false })

  if (responsesError) {
    return Response.json({ error: responsesError.message }, { status: 400 })
  }

  const responseIds = (responses ?? []).map((response) => response.id)
  const userIds = Array.from(new Set((responses ?? []).map((response) => response.user_id)))

  const [{ data: answers, error: answersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      responseIds.length
        ? supabaseAdmin
            .from("event_eval_answer")
            .select("id, response_id, criteria_id, user_id, rating_value, answer_text, created_at")
            .in("response_id", responseIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? supabaseAdmin
            .from("profiles")
            .select("user_id, user_name, department, position")
            .in("user_id", userIds)
        : Promise.resolve({ data: [], error: null }),
    ])

  if (answersError || profilesError) {
    return Response.json(
      { error: answersError?.message || profilesError?.message || "Unable to load response details." },
      { status: 400 }
    )
  }

  type AnswerRow = {
    id: number
    response_id: number
    criteria_id: number
    user_id: string
    rating_value: number | null
    answer_text: string | null
    created_at: string
  }

  const answersByResponse = ((answers ?? []) as AnswerRow[]).reduce<Record<number, AnswerRow[]>>((acc, answer) => {
    if (!acc[answer.response_id]) {
      acc[answer.response_id] = []
    }

    acc[answer.response_id].push(answer)
    return acc
  }, {})

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]))

  return Response.json({
    events: (events ?? []).map((event) => ({
      ...withDisplayScore(event),
      id: String(event.id),
      response_count: responseCountByEvent[event.id] ?? 0,
    })),
    openEvent: openEvent
      ? {
          ...withDisplayScore(openEvent),
          id: String(openEvent.id),
          response_count: responseCountByEvent[openEvent.id] ?? 0,
        }
      : null,
    criteria: (criteria ?? []).map((item) => ({
      ...item,
      id: String(item.id),
    })),
    responses: (responses ?? []).map((response) => ({
      ...response,
      id: String(response.id),
      event_id: String(response.event_id),
      answers: (answersByResponse[response.id] ?? []).map((answer) => ({
        ...answer,
        id: String(answer.id),
        response_id: String(answer.response_id),
        criteria_id: String(answer.criteria_id),
      })),
      profile: profileMap.get(response.user_id) ?? null,
    })),
  })
}
