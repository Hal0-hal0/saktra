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

// POST: manual reset; the BOD is required to confirm with password client-side
// (DeleteConfirmDialog) before this endpoint is hit.
export async function POST() {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  return runReset({ trigger: "manual", triggeredBy: auth.userId })
}

// GET: lists past resets for the Scores History UI.
export async function GET() {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  const { data: log, error: logError } = await supabaseAdmin
    .from("scores_reset_log")
    .select("*")
    .order("created_at", { ascending: false })

  if (logError) return Response.json({ error: logError.message }, { status: 400 })
  return Response.json({ resets: log ?? [] })
}

async function runReset({ trigger, triggeredBy }: { trigger: "manual" | "yearly"; triggeredBy: string | null }) {
  const now = new Date()
  const cycleYear = now.getFullYear()
  const cycleLabel =
    trigger === "yearly"
      ? `${cycleYear} yearly reset`
      : `Manual reset on ${now.toLocaleString()}`

  // 1) Snapshot existing user_scores rows.
  const { data: currentScores, error: scoresError } = await supabaseAdmin
    .from("user_scores")
    .select("user_id, event_id, event_evaluation_score, member_evaluation_score, average_score, created_at")

  if (scoresError) {
    return Response.json({ error: scoresError.message }, { status: 400 })
  }

  const rows = (currentScores ?? []).map((s) => ({
    cycle_label: cycleLabel,
    cycle_year: cycleYear,
    user_id: s.user_id,
    event_id: s.event_id,
    event_evaluation_score: s.event_evaluation_score,
    member_evaluation_score: s.member_evaluation_score,
    average_score: s.average_score,
    source_created_at: s.created_at,
  }))

  // Generate a cycle_id by inserting the reset-log row first.
  const { data: logRow, error: logErr } = await supabaseAdmin
    .from("scores_reset_log")
    .insert({
      cycle_id: crypto.randomUUID(),
      cycle_label: cycleLabel,
      cycle_year: cycleYear,
      trigger,
      triggered_by: triggeredBy,
      archived_rows: rows.length,
      affected_users: new Set(rows.map((r) => r.user_id)).size,
    })
    .select("*")
    .single()

  if (logErr || !logRow) {
    return Response.json({ error: logErr?.message ?? "Could not create reset log row" }, { status: 400 })
  }

  if (rows.length > 0) {
    const insertRows = rows.map((r) => ({ ...r, cycle_id: logRow.cycle_id }))
    const { error: archiveErr } = await supabaseAdmin.from("scores_history").insert(insertRows)
    if (archiveErr) {
      return Response.json({ error: archiveErr.message }, { status: 400 })
    }
  }

  // 2) Zero current scores.
  //    user_scores rows are deleted (they'll be recreated as new evaluations happen).
  //    profiles.eval_total_score reset to 0 for everyone.
  if ((currentScores ?? []).length > 0) {
    const { error: delErr } = await supabaseAdmin
      .from("user_scores")
      .delete()
      .not("user_id", "is", null)
    if (delErr) {
      return Response.json({ error: delErr.message }, { status: 400 })
    }
  }

  const { error: profileErr } = await supabaseAdmin
    .from("profiles")
    .update({ eval_total_score: 0 })
    .not("user_id", "is", null)
  if (profileErr) {
    return Response.json({ error: profileErr.message }, { status: 400 })
  }

  return Response.json({
    success: true,
    cycle: logRow,
    archivedRows: rows.length,
    affectedUsers: new Set(rows.map((r) => r.user_id)).size,
  })
}
