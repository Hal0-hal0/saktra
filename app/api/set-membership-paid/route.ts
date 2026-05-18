import { createRouteClient } from "@/lib/supabase/route-client"
import { supabaseAdmin } from "@/lib/supabase/supabase-admin"

export async function PATCH(request: Request) {
  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .single()

  if (profile?.role !== "admin" && profile?.role !== "bod") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { targetUserId } = await request.json()

  if (!targetUserId) {
    return Response.json({ error: "Target user ID is required" }, { status: 400 })
  }

  // Calculate expiry date: 1 month from now
  const expiryDate = new Date()
  expiryDate.setMonth(expiryDate.getMonth() + 1)
  const expiryTimestamp = expiryDate.toISOString()

  // Update profiles table with membership status
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      membership_status: "paid",
      membership_expires_at: expiryTimestamp,
    })
    .eq("user_id", targetUserId)

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 400 })
  }

  // Also update membership table if the user has a record
  await supabaseAdmin
    .from("membership")
    .update({
      membership_status: "paid",
      membership_expires_at: expiryTimestamp,
    })
    .eq("user_id", targetUserId)

  return Response.json({ 
    success: true,
    membership_expires_at: expiryTimestamp 
  })
}
