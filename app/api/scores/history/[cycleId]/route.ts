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

export async function GET(_req: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  const { cycleId } = await params
  if (!cycleId) return Response.json({ error: "cycleId required" }, { status: 400 })

  const { data: rows, error } = await supabaseAdmin
    .from("scores_history")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("archived_at", { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 400 })

  // Resolve user names + event names for display.
  const userIds = Array.from(
    new Set(
      (rows ?? [])
        .map((r) => r.user_id)
        .filter((u): u is string => Boolean(u) && u !== "00000000-0000-0000-0000-000000000000"),
    ),
  )
  const eventIds = Array.from(new Set((rows ?? []).map((r) => r.event_id).filter(Boolean)))

  const [{ data: profiles }, { data: events }] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from("profiles").select("user_id, user_name, email").in("user_id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    eventIds.length
      ? supabaseAdmin.from("events").select("id, name").in("id", eventIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const userMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]))
  const eventMap = new Map((events ?? []).map((e: any) => [e.id, e.name]))

  return Response.json({
    rows: (rows ?? []).map((r) => ({
      ...r,
      user_name:
        r.user_id === "00000000-0000-0000-0000-000000000000"
          ? null
          : userMap.get(r.user_id)?.user_name ?? null,
      user_email:
        r.user_id === "00000000-0000-0000-0000-000000000000"
          ? null
          : userMap.get(r.user_id)?.email ?? null,
      event_name: r.event_id ? eventMap.get(r.event_id) ?? null : null,
    })),
  })
}
