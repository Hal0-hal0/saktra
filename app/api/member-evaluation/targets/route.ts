import { supabaseAdmin } from "@/lib/supabase/supabase-admin"
import { createRouteClient } from "@/lib/supabase/route-client"
import {
  EvaluationProfile,
  filterEvaluationTargets,
  formatEvaluationRole,
  normalizeEvaluationRole,
} from "@/lib/member-evaluation"

type ProfileRow = EvaluationProfile & {
  user_id: string
  user_name: string | null
  email: string | null
  status: string | null
}

export async function GET() {
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)

  await supabaseAdmin
    .from("member_evaluation_cycle")
    .update({ evaluation_open: false })
    .eq("evaluation_open", true)
    .lt("evaluation_deadline", today)

  const [
    { data: evaluator, error: evaluatorError },
    { data: profiles, error: profilesError },
    { data: criteria, error: criteriaError },
    { data: activeCycles, error: activeCyclesError },
  ] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("user_id, user_name, email, role, status, department, position")
        .eq("user_id", userId)
        .single(),
      supabaseAdmin
        .from("profiles")
        .select("user_id, user_name, email, role, status, department, position")
        .eq("status", "active")
        .order("user_name"),
      supabaseAdmin
        .from("member_eval_criteria")
        .select("id, criteria_description, criteria_type")
        .eq("is_active", true)
        .order("criteria_type")
        .order("criteria_description"),
      supabaseAdmin
        .from("member_evaluation_cycle")
        .select("id, title, evaluation_open, evaluation_deadline, created_at, started_at")
        .eq("evaluation_open", true)
        .order("created_at", { ascending: false })
    ])

  if (evaluatorError || !evaluator) {
    return Response.json({ error: "Unable to load evaluator profile." }, { status: 400 })
  }

  if (profilesError || criteriaError || activeCyclesError) {
    return Response.json(
      { error: profilesError?.message || criteriaError?.message || activeCyclesError?.message || "Unable to load member evaluations." },
      { status: 400 }
    )
  }

  if (!activeCycles || activeCycles.length === 0) {
    return Response.json({
      evaluator: {
        ...evaluator,
        role: normalizeEvaluationRole(evaluator.role),
        role_label: formatEvaluationRole(evaluator.role),
      },
      activeCycle: null,
      activeCycles: [],
      targets: [],
      criteria: (criteria ?? []).map((item) => ({
        ...item,
        id: String(item.id),
      })),
      responses: [],
      answers: [],
    })
  }

  const targets = filterEvaluationTargets(evaluator as ProfileRow, (profiles ?? []) as ProfileRow[])
  const activeCycleIds = activeCycles.map((cycle) => cycle.id)

  const { data: responses, error: responsesError } = await supabaseAdmin
    .from("member_evaluation_response")
    .select("id, cycle_id, target_user_id, status, created_at")
    .in("cycle_id", activeCycleIds)
    .eq("evaluator_id", userId)
    .order("created_at", { ascending: false })

  if (responsesError) {
    return Response.json({ error: responsesError.message }, { status: 400 })
  }

  const responseIds = (responses ?? []).map((response) => response.id)
  const { data: answers, error: answersError } = responseIds.length
    ? await supabaseAdmin
        .from("member_evaluation_answer")
        .select("id, member_response_id, criteria_id, rating_value, answer_text, created_at")
        .in("member_response_id", responseIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null }

  if (answersError) {
    return Response.json({ error: answersError.message }, { status: 400 })
  }

  return Response.json({
    evaluator: {
      ...evaluator,
      role: normalizeEvaluationRole(evaluator.role),
      role_label: formatEvaluationRole(evaluator.role),
    },
    activeCycle: {
      ...activeCycles[0],
      id: String(activeCycles[0].id),
    },
    activeCycles: activeCycles.map((cycle) => ({
      ...cycle,
      id: String(cycle.id),
    })),
    targets: targets.map((target) => ({
      ...target,
      role: normalizeEvaluationRole(target.role),
      role_label: formatEvaluationRole(target.role),
    })),
    criteria: (criteria ?? []).map((item) => ({
      ...item,
      id: String(item.id),
    })),
    responses: (responses ?? []).map((response) => ({
      ...response,
      id: String(response.id),
      cycle_id: String(response.cycle_id),
      target_user_id: String(response.target_user_id),
    })),
    answers: (answers ?? []).map((answer) => ({
      ...answer,
      id: String(answer.id),
      member_response_id: String(answer.member_response_id),
      criteria_id: String(answer.criteria_id),
    })),
  })
}
