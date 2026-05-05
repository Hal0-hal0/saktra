import { supabaseAdmin } from "@/lib/supabase/supabase-admin"
import { createRouteClient } from "@/lib/supabase/route-client"
import { canEvaluate, UNAUTHORIZED_EVALUATION_MESSAGE } from "@/lib/member-evaluation"

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

  const { targetUserId, cycleId } = (await request.json()) as { targetUserId?: string; cycleId?: string }
  const cycleIdNumber = cycleId ? Number(cycleId) : NaN

  if (!targetUserId || !cycleId || Number.isNaN(cycleIdNumber)) {
    return Response.json({ error: "Target member and active evaluation cycle are required." }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const [{ data: evaluator }, { data: target }, { data: activeCycle }] = await Promise.all([
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

  await logAttempt({
    evaluator: evaluator as ProfileRow | null,
    target: target as ProfileRow | null,
    action: "open_form",
    result: allowed ? "success" : "denied",
    reason: allowed ? undefined : cycleOpen ? UNAUTHORIZED_EVALUATION_MESSAGE : "Member evaluation is not open.",
  })

  if (!allowed) {
    console.warn("Unauthorized member evaluation form attempt", { evaluatorId: userId, targetUserId })
    return Response.json(
      { error: cycleOpen ? UNAUTHORIZED_EVALUATION_MESSAGE : "Member evaluation is not open right now." },
      { status: 403 }
    )
  }

  return Response.json({ success: true })
}
