import { supabaseAdmin } from "@/lib/supabase/supabase-admin"
import { createRouteClient } from "@/lib/supabase/route-client"

export async function DELETE(request: Request) {
  const { id } = await request.json()
  if (!id) {
    return Response.json({ error: "Missing event id" }, { status: 400 })
  }

  const supabase = await createRouteClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const callerId = claimsData?.claims?.sub
  if (!callerId) {
    return Response.json({ error: "Not signed in" }, { status: 401 })
  }

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", callerId)
    .single()

  if (callerProfile?.role !== "admin" && callerProfile?.role !== "bod") {
    return Response.json({ error: "Only Board of Directors can delete events" }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from("events")
    .update({ is_hidden: true })
    .eq("id", Number(id))

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}
