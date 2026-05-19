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

// POST: archives all current events.event_eval_score into scores_history (one row per event),
// records a 'manual' entry in scores_reset_log, then zeroes events.event_eval_score.
export async function POST() {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  const now = new Date()
  const cycleYear = now.getFullYear()
  const cycleLabel = `Manual event-scores reset on ${now.toLocaleString()}`
  const cycleId = crypto.randomUUID()

  const { data: events, error: evErr } = await supabaseAdmin
    .from("events")
    .select("id, name, event_eval_score, date_start, evaluation_deadline")
    .not("event_eval_score", "is", null)

  if (evErr) return Response.json({ error: evErr.message }, { status: 400 })

  // Archive into scores_history. We reuse the table — event_id maps directly,
  // user_id is left as a synthetic 'all-zeros' uuid (00000000-0000-0000-0000-000000000000)
  // to indicate this is an event-level snapshot, not a per-user one.
  const SENTINEL_USER = "00000000-0000-0000-0000-000000000000"
  const archiveRows = (events ?? []).map((e) => ({
    cycle_id: cycleId,
    cycle_label: cycleLabel,
    cycle_year: cycleYear,
    user_id: SENTINEL_USER,
    event_id: e.id,
    event_evaluation_score: e.event_eval_score,
    member_evaluation_score: null,
    average_score: e.event_eval_score,
    source_created_at: now.toISOString(),
  }))

  const { error: logErr } = await supabaseAdmin.from("scores_reset_log").insert({
    cycle_id: cycleId,
    cycle_label: cycleLabel,
    cycle_year: cycleYear,
    trigger: "manual",
    triggered_by: auth.userId,
    archived_rows: archiveRows.length,
    affected_users: 0,
  })
  if (logErr) return Response.json({ error: logErr.message }, { status: 400 })

  if (archiveRows.length > 0) {
    const { error: archErr } = await supabaseAdmin.from("scores_history").insert(archiveRows)
    if (archErr) return Response.json({ error: archErr.message }, { status: 400 })
  }

  const { error: clearErr } = await supabaseAdmin
    .from("events")
    .update({ event_eval_score: null })
    .not("event_eval_score", "is", null)
  if (clearErr) return Response.json({ error: clearErr.message }, { status: 400 })

  return Response.json({
    success: true,
    archivedRows: archiveRows.length,
    cycleId,
  })
}
