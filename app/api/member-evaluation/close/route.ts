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

  if (profile?.role !== "admin" && profile?.role !== "bod") {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { userId }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) {
    return auth.error
  }

  const { cycleId } = (await request.json()) as { cycleId?: string }
  const cycleIdNumber = cycleId ? Number(cycleId) : NaN

  if (!cycleId || Number.isNaN(cycleIdNumber)) {
    return Response.json({ error: "Member evaluation cycle is required." }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("member_evaluation_cycle")
    .update({ evaluation_open: false })
    .eq("id", cycleIdNumber)

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
