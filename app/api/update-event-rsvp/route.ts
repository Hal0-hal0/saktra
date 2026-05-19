import { createRouteClient } from "@/lib/supabase/route-client"
import { supabaseAdmin } from "@/lib/supabase/supabase-admin"

export async function POST(request: Request) {
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { eventId, status } = await request.json()

  if (!eventId || !status) {
    return Response.json({ error: "Event ID and status are required" }, { status: 400 })
  }

  // Once a user has accepted, the RSVP is locked — they cannot decline or revert
  // to pending. (The QR check-in flow uses /api/check-in which has its own logic.)
  const { data: existing } = await supabaseAdmin
    .from("event_rsvp")
    .select("status")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle()

  if (existing?.status === "accepted") {
    return Response.json(
      { error: "You have already accepted this event and cannot change your RSVP." },
      { status: 409 },
    )
  }

  const { error: upsertError } = await supabaseAdmin
    .from("event_rsvp")
    .upsert(
      { user_id: userId, event_id: eventId, status },
      { onConflict: "user_id,event_id" }
    )

  if (upsertError) {
    return Response.json({ error: upsertError.message }, { status: 400 })
  }

  return Response.json({ success: true, status })
}
