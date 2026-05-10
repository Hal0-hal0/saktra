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

  // Check user's membership status
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("membership_status, membership_expires_at")
    .eq("user_id", userId)
    .single()

  if (profileError || !profile) {
    return Response.json({ error: "User profile not found" }, { status: 404 })
  }

  // Check if user is trying to ACCEPT the event
  if (status === "accepted") {
    // Check if membership is expired
    if (profile.membership_status !== "paid") {
      return Response.json(
        { error: "Only members with active paid membership can join events" },
        { status: 403 }
      )
    }

    if (profile.membership_expires_at) {
      const expiryDate = new Date(profile.membership_expires_at)
      if (expiryDate < new Date()) {
        // Membership has expired, update status to unpaid
        await supabaseAdmin
          .from("profiles")
          .update({ membership_status: "unpaid" })
          .eq("user_id", userId)

        return Response.json(
          { error: "Your membership has expired. Please renew to join events." },
          { status: 403 }
        )
      }
    }
  }

  // Proceed with RSVP update
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
