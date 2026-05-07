import { supabaseAdmin } from "@/lib/supabase/supabase-admin"

export async function PATCH(request: Request) {
  const { id, status } = await request.json()

  const { error } = await supabaseAdmin
    .from("events")
    .update({ status })
    .eq("id", id)

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
