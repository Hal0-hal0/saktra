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

export async function GET() {
  const auth = await requireAdmin()
  if ("error" in auth) {
    return auth.error
  }

  const today = new Date().toISOString().slice(0, 10)

  await supabaseAdmin
    .from("member_evaluation_cycle")
    .update({ evaluation_open: false })
    .eq("evaluation_open", true)
    .lt("evaluation_deadline", today)

  const [{ data: cycles, error: cyclesError }, { data: responses, error: responsesError }] =
    await Promise.all([
      supabaseAdmin
        .from("member_evaluation_cycle")
        .select("id, title, evaluation_open, evaluation_deadline, created_at, started_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("member_evaluation_response")
        .select("id, cycle_id"),
    ])

  if (cyclesError || responsesError) {
    return Response.json(
      { error: cyclesError?.message || responsesError?.message || "Unable to load member evaluation cycles." },
      { status: 400 }
    )
  }

  const responseCountByCycle = (responses ?? []).reduce<Record<number, number>>((acc, response) => {
    if (!response.cycle_id) return acc
    acc[response.cycle_id] = (acc[response.cycle_id] ?? 0) + 1
    return acc
  }, {})

  const formattedCycles = (cycles ?? []).map((cycle) => ({
    ...cycle,
    id: String(cycle.id),
    response_count: responseCountByCycle[cycle.id] ?? 0,
  }))

  return Response.json({
    cycles: formattedCycles,
    openCycle: formattedCycles.find((cycle) => cycle.evaluation_open) ?? null,
    openCycles: formattedCycles.filter((cycle) => cycle.evaluation_open),
  })
}
