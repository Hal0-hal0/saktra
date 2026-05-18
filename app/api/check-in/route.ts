import { createRouteClient } from "@/lib/supabase/route-client"
import { supabaseAdmin } from "@/lib/supabase/supabase-admin"

const POINTS_PER_CHECKIN = 10

export async function POST(request: Request) {
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return Response.json({ error: "You must be signed in to check in." }, { status: 401 })
  }

  let body: { eventId?: number | string } = {}
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  const eventIdNum = Number(body.eventId)
  if (!Number.isFinite(eventIdNum)) {
    return Response.json({ error: "Missing or invalid eventId" }, { status: 400 })
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id, name, status, is_hidden, date_start, date_end")
    .eq("id", eventIdNum)
    .single()

  if (eventError || !event) {
    return Response.json({ error: "Event not found" }, { status: 404 })
  }
  if (event.is_hidden) {
    return Response.json({ error: "This event is no longer active." }, { status: 410 })
  }

  // Already checked in?
  const { data: existing } = await supabaseAdmin
    .from("event_rsvp")
    .select("id, checked_in_at, points_awarded")
    .eq("user_id", userId)
    .eq("event_id", eventIdNum)
    .maybeSingle()

  if (existing?.checked_in_at) {
    return Response.json({
      success: true,
      alreadyCheckedIn: true,
      eventName: event.name,
      pointsAwarded: Number(existing.points_awarded ?? 0),
      checkedInAt: existing.checked_in_at,
    })
  }

  const nowIso = new Date().toISOString()

  // Use the existing 'accepted' status (the event_rsvp_status_check constraint
  // rejects unknown values). Whether the user has actually shown up is tracked
  // separately by checked_in_at.
  const { error: upsertError } = await supabaseAdmin
    .from("event_rsvp")
    .upsert(
      {
        user_id: userId,
        event_id: eventIdNum,
        status: "accepted",
        checked_in_at: nowIso,
        points_awarded: POINTS_PER_CHECKIN,
      },
      { onConflict: "user_id,event_id" }
    )

  if (upsertError) {
    return Response.json({ error: upsertError.message }, { status: 400 })
  }

  // Award points into profiles.eval_total_score (used by evaluation summary).
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("eval_total_score")
    .eq("user_id", userId)
    .single()

  const newTotal = Number(profile?.eval_total_score ?? 0) + POINTS_PER_CHECKIN
  await supabaseAdmin
    .from("profiles")
    .update({ eval_total_score: newTotal })
    .eq("user_id", userId)

  return Response.json({
    success: true,
    alreadyCheckedIn: false,
    eventName: event.name,
    pointsAwarded: POINTS_PER_CHECKIN,
    checkedInAt: nowIso,
  })
}
