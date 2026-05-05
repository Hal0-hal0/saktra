import { supabaseAdmin } from "@/lib/supabase/supabase-admin"
import { createRouteClient } from "@/lib/supabase/route-client"
import { canEvaluate, UNAUTHORIZED_EVALUATION_MESSAGE } from "@/lib/member-evaluation"

type SubmitAnswer = {
  criteria_id: string
  rating_value: number | null
  answer_text?: string | null
}

type ProfileRow = {
  user_id: string
  role: string | null
  department: string | null
  position: string | null
}

async function logAttempt({
  evaluator,
  target,
  action,
  result,
  reason,
}: {
  evaluator?: ProfileRow | null
  target?: ProfileRow | null
  action: string
  result: "success" | "denied"
  reason?: string
}) {
  const { error } = await supabaseAdmin.from("member_evaluation_attempt_log").insert({
    evaluator_id: evaluator?.user_id ?? null,
    target_user_id: target?.user_id ?? null,
    user_role: evaluator?.role ?? null,
    user_department: evaluator?.department ?? null,
    target_role: target?.role ?? null,
    target_department: target?.department ?? null,
    action,
    result,
    reason: reason ?? null,
  })

  if (error) {
    console.warn("Unable to log member evaluation attempt:", error.message)
  }
}

export async function POST(request: Request) {
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { targetUserId, cycleId, answers } = (await request.json()) as {
    targetUserId?: string
    cycleId?: string
    answers?: SubmitAnswer[]
  }
  const cycleIdNumber = cycleId ? Number(cycleId) : NaN

  if (!targetUserId || !cycleId || Number.isNaN(cycleIdNumber) || !Array.isArray(answers) || answers.length === 0) {
    return Response.json({ error: "Target member, evaluation cycle, and answers are required." }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const [{ data: evaluator }, { data: target }, { data: activeCycle }, { data: criteria, error: criteriaError }] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("user_id, role, department, position")
        .eq("user_id", userId)
        .single(),
      supabaseAdmin
        .from("profiles")
        .select("user_id, role, department, position")
        .eq("user_id", targetUserId)
        .single(),
      supabaseAdmin
        .from("member_evaluation_cycle")
        .select("id, evaluation_open, evaluation_deadline")
        .eq("id", cycleIdNumber)
        .single(),
      supabaseAdmin
        .from("member_eval_criteria")
        .select("id")
        .eq("is_active", true)
        .order("id"),
    ])

  const cycleOpen = Boolean(
    activeCycle?.evaluation_open &&
      (!activeCycle.evaluation_deadline || activeCycle.evaluation_deadline >= today)
  )

  const allowed =
    cycleOpen &&
    canEvaluate({
      evaluatorId: evaluator?.user_id,
      evaluatorRole: evaluator?.role,
      evaluatorDepartment: evaluator?.department,
      evaluatorPosition: evaluator?.position,
      targetId: target?.user_id,
      targetRole: target?.role,
      targetDepartment: target?.department,
      targetPosition: target?.position,
    })

  if (!allowed) {
    await logAttempt({
      evaluator: evaluator as ProfileRow | null,
      target: target as ProfileRow | null,
      action: "submit",
      result: "denied",
      reason: cycleOpen ? UNAUTHORIZED_EVALUATION_MESSAGE : "Member evaluation is not open.",
    })
    console.warn("Unauthorized member evaluation submit attempt", { evaluatorId: userId, targetUserId })
    return Response.json(
      { error: cycleOpen ? UNAUTHORIZED_EVALUATION_MESSAGE : "Member evaluation is not open right now." },
      { status: 403 }
    )
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
    .from("member_evaluation_response")
    .select("id")
    .eq("cycle_id", cycleIdNumber)
    .eq("evaluator_id", userId)
    .eq("target_user_id", targetUserId)
    .maybeSingle()

  if (existingResponse) {
    return Response.json({ error: "You have already submitted this member evaluation." }, { status: 400 })
  }

  const { data: response, error: responseError } = await supabaseAdmin
    .from("member_evaluation_response")
    .insert({
      cycle_id: cycleIdNumber,
      evaluator_id: userId,
      target_user_id: targetUserId,
      user_role: evaluator?.role ?? "",
      user_department: evaluator?.department ?? "",
      target_role: target?.role ?? "",
      target_department: target?.department ?? "",
      status: "submitted",
    })
    .select("id")
    .single()

  if (responseError || !response) {
    return Response.json({ error: responseError?.message || "Unable to save member evaluation." }, { status: 400 })
  }

  const answerRows = Array.from(uniqueAnswers.values()).map((answer) => ({
    member_response_id: response.id,
    criteria_id: Number(answer.criteria_id),
    rating_value: answer.rating_value,
    answer_text: answer.answer_text?.trim() || null,
  }))

  const { error: answerError } = await supabaseAdmin.from("member_evaluation_answer").insert(answerRows)

  if (answerError) {
    await supabaseAdmin.from("member_evaluation_response").delete().eq("id", response.id)
    return Response.json({ error: answerError.message }, { status: 400 })
  }

  await logAttempt({
    evaluator: evaluator as ProfileRow | null,
    target: target as ProfileRow | null,
    action: "submit",
    result: "success",
  })

  return Response.json({ success: true })
}
