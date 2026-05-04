import { createRouteClient } from "@/lib/supabase/route-client"
import { supabaseAdmin } from "@/lib/supabase/supabase-admin"

type SubmitAnswer = {
  criteria_id: string
  rating_value: number | null
  answer_text?: string | null
}

export async function POST(request: Request) {
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { eventId, answers } = (await request.json()) as {
    eventId?: string
    answers?: SubmitAnswer[]
  }
  const eventIdNumber = eventId ? Number(eventId) : NaN

  if (!eventId || Number.isNaN(eventIdNumber) || !Array.isArray(answers) || answers.length === 0) {
    return Response.json({ error: "Event and answers are required." }, { status: 400 })
  }

  const [{ data: event, error: eventError }, { data: criteria, error: criteriaError }] =
    await Promise.all([
      supabaseAdmin
        .from("events")
        .select("id, evaluation_open, evaluation_deadline")
        .eq("id", eventIdNumber)
        .single(),
      supabaseAdmin
        .from("event_eval_criteria")
        .select("id")
        .order("id"),
    ])

  if (eventError || !event) {
    return Response.json({ error: "Event not found." }, { status: 404 })
  }

  if (!event.evaluation_open) {
    return Response.json({ error: "This evaluation is not open right now." }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)

  if (event.evaluation_deadline && event.evaluation_deadline < today) {
    await supabaseAdmin
      .from("events")
      .update({ evaluation_open: false })
      .eq("id", eventIdNumber)

    return Response.json({ error: "This evaluation is already closed." }, { status: 400 })
  }

  if (criteriaError) {
    return Response.json({ error: criteriaError.message }, { status: 400 })
  }

  const criteriaIds = new Set((criteria ?? []).map((item) => String(item.id)))

  if (criteriaIds.size === 0) {
    return Response.json({ error: "No evaluation criteria found." }, { status: 400 })
  }

  const uniqueAnswers = new Map<string, SubmitAnswer>()

  for (const answer of answers) {
    if (!criteriaIds.has(answer.criteria_id)) {
      return Response.json({ error: "An answer contains an invalid criterion." }, { status: 400 })
    }

    if (
      answer.rating_value === null ||
      Number.isNaN(answer.rating_value) ||
      answer.rating_value < 1 ||
      answer.rating_value > 10
    ) {
      return Response.json({ error: "Ratings must be between 1 and 10." }, { status: 400 })
    }

    uniqueAnswers.set(answer.criteria_id, answer)
  }

  if (uniqueAnswers.size !== criteriaIds.size) {
    return Response.json({ error: "Please answer every criterion before submitting." }, { status: 400 })
  }

  const { data: existingResponse } = await supabaseAdmin
    .from("response")
    .select("id")
    .eq("event_id", eventIdNumber)
    .eq("user_id", userId)
    .maybeSingle()

  if (existingResponse) {
    return Response.json({ error: "You have already submitted this evaluation." }, { status: 400 })
  }

  const { data: response, error: responseError } = await supabaseAdmin
    .from("response")
    .insert({
      event_id: eventIdNumber,
      user_id: userId,
      status: "submitted",
    })
    .select("id")
    .single()

  if (responseError || !response) {
    return Response.json({ error: responseError?.message || "Unable to save response." }, { status: 400 })
  }

  const answerRows = Array.from(uniqueAnswers.values()).map((answer) => ({
    response_id: response.id,
    criteria_id: Number(answer.criteria_id),
    user_id: userId,
    rating_value: answer.rating_value,
    answer_text: answer.answer_text?.trim() || null,
  }))

  const { error: answerError } = await supabaseAdmin.from("event_eval_answer").insert(answerRows)

  if (answerError) {
    await supabaseAdmin.from("response").delete().eq("id", response.id)
    return Response.json({ error: answerError.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
