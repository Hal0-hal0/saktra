import { supabaseAdmin } from "@/lib/supabase/supabase-admin"
import { createRouteClient } from "@/lib/supabase/route-client"

async function requireAdmin() {
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) }

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

type ProfileLite = {
  user_id: string
  user_name: string | null
  email: string | null
  role: string | null
  department: string | null
}

type TargetSummary = ProfileLite & {
  averageRating: number | null
  totalRatings: number
  evaluatorCount: number
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  const url = new URL(request.url)
  const cycleId = url.searchParams.get("cycleId")
  if (!cycleId) {
    return Response.json({ error: "cycleId is required" }, { status: 400 })
  }

  const numericCycleId = Number(cycleId)
  if (Number.isNaN(numericCycleId)) {
    return Response.json({ error: "cycleId must be numeric" }, { status: 400 })
  }

  const { data: cycle, error: cycleError } = await supabaseAdmin
    .from("member_evaluation_cycle")
    .select("id, title, evaluation_open, evaluation_deadline, created_at, started_at")
    .eq("id", numericCycleId)
    .single()

  if (cycleError || !cycle) {
    return Response.json({ error: cycleError?.message ?? "Cycle not found" }, { status: 404 })
  }

  const { data: responses, error: responsesError } = await supabaseAdmin
    .from("member_evaluation_response")
    .select("id, evaluator_id, target_user_id, status, created_at")
    .eq("cycle_id", numericCycleId)

  if (responsesError) {
    return Response.json({ error: responsesError.message }, { status: 400 })
  }

  const responseRows = responses ?? []
  const responseIds = responseRows.map((r) => r.id)
  const evaluatorIds = Array.from(new Set(responseRows.map((r) => r.evaluator_id).filter(Boolean)))
  const targetIds = Array.from(new Set(responseRows.map((r) => r.target_user_id).filter(Boolean)))
  const profileIds = Array.from(new Set([...evaluatorIds, ...targetIds]))

  const [{ data: answers, error: answersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      responseIds.length
        ? supabaseAdmin
            .from("member_evaluation_answer")
            .select("id, member_response_id, criteria_id, rating_value")
            .in("member_response_id", responseIds)
        : Promise.resolve({ data: [], error: null } as any),
      profileIds.length
        ? supabaseAdmin
            .from("profiles")
            .select("user_id, user_name, email, role, department")
            .in("user_id", profileIds)
        : Promise.resolve({ data: [], error: null } as any),
    ])

  if (answersError || profilesError) {
    return Response.json(
      { error: answersError?.message ?? profilesError?.message ?? "Unable to load details" },
      { status: 400 },
    )
  }

  const profileById = new Map<string, ProfileLite>(
    (profiles ?? []).map((p: ProfileLite) => [p.user_id, p]),
  )

  // ratings keyed by response id
  const ratingsByResponse = new Map<number, number[]>()
  for (const answer of answers ?? []) {
    if (answer.rating_value === null || typeof answer.rating_value !== "number") continue
    const list = ratingsByResponse.get(answer.member_response_id) ?? []
    list.push(answer.rating_value)
    ratingsByResponse.set(answer.member_response_id, list)
  }

  // build per-target summary
  const perTarget = new Map<string, { ratings: number[]; evaluators: Set<string> }>()
  for (const r of responseRows) {
    if (!r.target_user_id) continue
    const bucket = perTarget.get(r.target_user_id) ?? { ratings: [], evaluators: new Set<string>() }
    const responseRatings = ratingsByResponse.get(r.id) ?? []
    bucket.ratings.push(...responseRatings)
    if (r.evaluator_id) bucket.evaluators.add(r.evaluator_id)
    perTarget.set(r.target_user_id, bucket)
  }

  const evaluatedSummaries: TargetSummary[] = Array.from(perTarget.entries()).map(
    ([targetId, { ratings, evaluators }]) => {
      const profile = profileById.get(targetId) ?? {
        user_id: targetId,
        user_name: null,
        email: null,
        role: null,
        department: null,
      }
      const average = ratings.length
        ? Number((ratings.reduce((s, v) => s + v, 0) / ratings.length).toFixed(2))
        : null
      return {
        ...profile,
        averageRating: average,
        totalRatings: ratings.length,
        evaluatorCount: evaluators.size,
      }
    },
  )

  const evaluatorSummaries: (ProfileLite & { submittedCount: number })[] = Array.from(
    responseRows.reduce((map, r) => {
      if (!r.evaluator_id) return map
      map.set(r.evaluator_id, (map.get(r.evaluator_id) ?? 0) + 1)
      return map
    }, new Map<string, number>()).entries(),
  ).map(([evaluatorId, count]) => {
    const profile = profileById.get(evaluatorId) ?? {
      user_id: evaluatorId,
      user_name: null,
      email: null,
      role: null,
      department: null,
    }
    return { ...profile, submittedCount: count }
  })

  const allRatings: number[] = []
  for (const list of ratingsByResponse.values()) allRatings.push(...list)
  const overallAverage = allRatings.length
    ? Number((allRatings.reduce((s, v) => s + v, 0) / allRatings.length).toFixed(2))
    : null

  return Response.json({
    cycle: { ...cycle, id: String(cycle.id) },
    overallAverage,
    totals: {
      responses: responseRows.length,
      evaluators: evaluatorSummaries.length,
      evaluated: evaluatedSummaries.length,
      ratings: allRatings.length,
    },
    evaluators: evaluatorSummaries.sort((a, b) =>
      (a.user_name ?? a.email ?? "").localeCompare(b.user_name ?? b.email ?? ""),
    ),
    evaluated: evaluatedSummaries.sort((a, b) => {
      const av = a.averageRating ?? -1
      const bv = b.averageRating ?? -1
      return bv - av
    }),
  })
}
